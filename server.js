'use strict';
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const DB = require('./db');

DB.load();
const db = () => DB.get();

// ---- load config.json (fallback to defaults); env vars still override ----
let CONFIG = { site: { name: 'FinHub' }, bank: {}, webhook: { enabled: false } };
try {
  CONFIG = { ...CONFIG, ...JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')) };
} catch (e) { console.warn('config.json not found, using defaults'); }

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', `sid=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`);
}
function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'sid=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
}

function currentUser(req) {
  const token = parseCookies(req).sid;
  if (!token) return null;
  const sess = db().sessions[token];
  if (!sess) return null;
  return db().users.find(u => u.id === sess.userId) || null;
}
function requireAuth(req, res, next) {
  const u = currentUser(req);
  if (!u) return res.status(401).json({ error: 'Chưa đăng nhập / Not signed in' });
  req.user = u; next();
}
function requireAdmin(req, res, next) {
  const u = currentUser(req);
  if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Cần quyền admin / Admin only' });
  req.user = u; next();
}
function hasActiveMembership(u) {
  if (!u || !u.membership) return false;
  return new Date(u.membership.expiresAt).getTime() > Date.now();
}
function publicUser(u) {
  if (!u) return null;
  return { id: u.id, email: u.email, name: u.name, role: u.role, membership: u.membership || null, memberActive: hasActiveMembership(u) };
}

// ============ AUTH ============
app.post('/api/register', (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) return res.status(400).json({ error: 'Thiếu thông tin / Missing fields' });
  if (String(password).length < 6) return res.status(400).json({ error: 'Mật khẩu tối thiểu 6 ký tự / Password ≥ 6 chars' });
  if (db().users.find(u => u.email.toLowerCase() === String(email).toLowerCase()))
    return res.status(409).json({ error: 'Email đã tồn tại / Email already registered' });
  const user = { id: DB.id(), email: String(email).trim(), name: String(name).trim(), passwordHash: DB.hashPassword(password), role: 'member', membership: null, createdAt: DB.nowISO() };
  db().users.push(user);
  const token = crypto.randomBytes(24).toString('hex');
  db().sessions[token] = { userId: user.id, createdAt: DB.nowISO() };
  DB.save(); setSessionCookie(res, token);
  res.json({ user: publicUser(user) });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db().users.find(u => u.email.toLowerCase() === String(email || '').toLowerCase());
  if (!user || !DB.verifyPassword(password || '', user.passwordHash))
    return res.status(401).json({ error: 'Email hoặc mật khẩu sai / Wrong email or password' });
  const token = crypto.randomBytes(24).toString('hex');
  db().sessions[token] = { userId: user.id, createdAt: DB.nowISO() };
  DB.save(); setSessionCookie(res, token);
  res.json({ user: publicUser(user) });
});

app.post('/api/logout', (req, res) => {
  const token = parseCookies(req).sid;
  if (token) delete db().sessions[token];
  DB.save(); clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => { res.json({ user: publicUser(currentUser(req)) }); });

// ============ ARTICLES ============
function articleCard(a) {
  return { id: a.id, author: a.author, premium: !!a.premium, lead: !!a.lead, createdAt: a.createdAt,
    section_vi: a.section_vi, section_en: a.section_en, title_vi: a.title_vi, title_en: a.title_en, dek_vi: a.dek_vi, dek_en: a.dek_en };
}
app.get('/api/articles', (req, res) => {
  const list = [...db().articles].sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt));
  res.json({ articles: list.map(articleCard) });
});
app.get('/api/articles/:id', (req, res) => {
  const a = db().articles.find(x => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Không tìm thấy bài viết / Article not found' });
  const u = currentUser(req);
  const locked = a.premium && !hasActiveMembership(u) && (!u || u.role !== 'admin');
  const out = { ...articleCard(a) };
  if (locked) { out.locked = true; out.body_vi = firstParagraph(a.body_vi); out.body_en = firstParagraph(a.body_en); }
  else { out.locked = false; out.body_vi = a.body_vi; out.body_en = a.body_en; }
  res.json({ article: out });
});
function firstParagraph(html) { const m = String(html || '').match(/<p>.*?<\/p>/i); return m ? m[0] : ''; }
app.post('/api/articles', requireAdmin, (req, res) => {
  const b = req.body || {};
  for (const f of ['title_vi', 'title_en', 'section_vi', 'section_en']) if (!b[f]) return res.status(400).json({ error: `Thiếu ${f}` });
  const a = { id: DB.id(), author: req.user.name, premium: !!b.premium, lead: !!b.lead, createdAt: DB.nowISO(),
    section_vi: b.section_vi, section_en: b.section_en, title_vi: b.title_vi, title_en: b.title_en,
    dek_vi: b.dek_vi || '', dek_en: b.dek_en || '', body_vi: toParas(b.body_vi), body_en: toParas(b.body_en) };
  db().articles.push(a); DB.save();
  res.json({ article: a });
});
app.delete('/api/articles/:id', requireAdmin, (req, res) => {
  const idx = db().articles.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db().articles.splice(idx, 1); DB.save();
  res.json({ ok: true });
});
function toParas(text) { if (!text) return ''; return String(text).split(/\n{2,}/).map(p => `<p>${escapeHtml(p.trim())}</p>`).join(''); }

// ============ COMMENTS ============
app.get('/api/articles/:id/comments', (req, res) => {
  const list = db().comments.filter(c => c.articleId === req.params.id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map(c => ({ id: c.id, author: c.author, body: c.body, createdAt: c.createdAt }));
  res.json({ comments: list });
});
app.post('/api/articles/:id/comments', requireAuth, (req, res) => {
  const a = db().articles.find(x => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Article not found' });
  const body = String((req.body || {}).body || '').trim();
  if (!body) return res.status(400).json({ error: 'Nội dung trống / Empty comment' });
  const c = { id: DB.id(), articleId: a.id, userId: req.user.id, author: req.user.name, body: escapeHtml(body), createdAt: DB.nowISO() };
  db().comments.push(c); DB.save();
  res.json({ comment: { id: c.id, author: c.author, body: c.body, createdAt: c.createdAt } });
});

// ============ COMMUNITY FORUM ============
app.get('/api/threads', (req, res) => {
  const list = [...db().threads].sort((a, b) => new Date(b.lastActivity || b.createdAt) - new Date(a.lastActivity || a.createdAt))
    .map(t => ({ id: t.id, title: t.title, author: t.author, createdAt: t.createdAt, replies: db().posts.filter(p => p.threadId === t.id).length, lastActivity: t.lastActivity || t.createdAt }));
  res.json({ threads: list });
});
app.get('/api/threads/:id', (req, res) => {
  const t = db().threads.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  const posts = db().posts.filter(p => p.threadId === t.id).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map(p => ({ id: p.id, author: p.author, body: p.body, createdAt: p.createdAt }));
  res.json({ thread: { id: t.id, title: t.title, author: t.author, body: t.body, createdAt: t.createdAt }, posts });
});
app.post('/api/threads', requireAuth, (req, res) => {
  const title = String((req.body || {}).title || '').trim();
  const body = String((req.body || {}).body || '').trim();
  if (!title) return res.status(400).json({ error: 'Thiếu tiêu đề / Missing title' });
  const t = { id: DB.id(), title: escapeHtml(title), body: escapeHtml(body), userId: req.user.id, author: req.user.name, createdAt: DB.nowISO(), lastActivity: DB.nowISO() };
  db().threads.push(t); DB.save();
  res.json({ thread: { id: t.id, title: t.title, author: t.author, body: t.body, createdAt: t.createdAt } });
});
app.post('/api/threads/:id/posts', requireAuth, (req, res) => {
  const t = db().threads.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  const body = String((req.body || {}).body || '').trim();
  if (!body) return res.status(400).json({ error: 'Nội dung trống / Empty reply' });
  const p = { id: DB.id(), threadId: t.id, userId: req.user.id, author: req.user.name, body: escapeHtml(body), createdAt: DB.nowISO() };
  db().posts.push(p); t.lastActivity = DB.nowISO(); DB.save();
  res.json({ post: { id: p.id, author: p.author, body: p.body, createdAt: p.createdAt } });
});

// ============ MEMBERSHIP / VIETQR ============
const BANK = {
  bankId: process.env.BANK_ID || (CONFIG.bank && CONFIG.bank.bankId) || 'MB',
  accountNo: process.env.BANK_ACCOUNT || (CONFIG.bank && CONFIG.bank.accountNo) || '0123456789',
  accountName: process.env.BANK_NAME || (CONFIG.bank && CONFIG.bank.accountName) || 'CONG TY FINHUB'
};
app.get('/api/plans', (req, res) => { res.json({ plans: db().plans }); });
app.post('/api/orders', requireAuth, (req, res) => {
  const planId = String((req.body || {}).planId || '');
  const plan = db().plans.find(p => p.id === planId);
  if (!plan) return res.status(400).json({ error: 'Gói không hợp lệ / Invalid plan' });
  const code = 'FH' + Math.random().toString(36).slice(2, 7).toUpperCase();
  const order = { id: DB.id(), userId: req.user.id, userEmail: req.user.email, planId: plan.id, amountVND: plan.priceVND, status: 'pending', memo: code, createdAt: DB.nowISO() };
  db().orders.push(order); DB.save();
  const addInfo = encodeURIComponent(order.memo);
  const accName = encodeURIComponent(BANK.accountName);
  const qrUrl = `https://img.vietqr.io/image/${BANK.bankId}-${BANK.accountNo}-compact2.png?amount=${plan.priceVND}&addInfo=${addInfo}&accountName=${accName}`;
  res.json({ order: { id: order.id, memo: order.memo, amountVND: order.amountVND, status: order.status }, bank: BANK, qrUrl });
});
app.get('/api/orders/mine', requireAuth, (req, res) => {
  const list = db().orders.filter(o => o.userId === req.user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(o => ({ id: o.id, planId: o.planId, amountVND: o.amountVND, status: o.status, memo: o.memo, createdAt: o.createdAt }));
  res.json({ orders: list });
});
app.post('/api/orders/:id/mark-paid', requireAuth, (req, res) => {
  const o = db().orders.find(x => x.id === req.params.id && x.userId === req.user.id);
  if (!o) return res.status(404).json({ error: 'Not found' });
  if (o.status === 'pending') o.status = 'reviewing';
  DB.save();
  res.json({ ok: true, status: o.status });
});
app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const list = [...db().orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(o => ({ ...o }));
  res.json({ orders: list });
});
function grantMembership(o) {
  const plan = db().plans.find(p => p.id === o.planId);
  const user = db().users.find(u => u.id === o.userId);
  if (!plan || !user) return false;
  o.status = 'paid'; o.confirmedAt = DB.nowISO();
  const base = hasActiveMembership(user) ? new Date(user.membership.expiresAt).getTime() : Date.now();
  user.membership = { planId: plan.id, expiresAt: new Date(base + plan.durationDays * 24 * 3600 * 1000).toISOString() };
  return true;
}
app.post('/api/admin/orders/:id/confirm', requireAdmin, (req, res) => {
  const o = db().orders.find(x => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: 'Not found' });
  if (!grantMembership(o)) return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
  DB.save();
  const user = db().users.find(u => u.id === o.userId);
  res.json({ ok: true, membership: user.membership });
});
app.post('/api/admin/orders/:id/reject', requireAdmin, (req, res) => {
  const o = db().orders.find(x => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: 'Not found' });
  o.status = 'rejected'; DB.save();
  res.json({ ok: true });
});

// ============ RESEARCH (NCKH — papers shared by admins) ============
function researchCard(r) {
  return { id: r.id, author: r.author, authors: r.authors, premium: !!r.premium, createdAt: r.createdAt,
    tags: r.tags || '', title_vi: r.title_vi, title_en: r.title_en,
    abstract_vi: r.abstract_vi, abstract_en: r.abstract_en };
}
app.get('/api/research', (req, res) => {
  const list = [...db().research].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ research: list.map(researchCard) });
});
app.get('/api/research/:id', (req, res) => {
  const r = db().research.find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Không tìm thấy nghiên cứu / Not found' });
  const u = currentUser(req);
  const member = hasActiveMembership(u) || (u && u.role === 'admin');
  const locked = r.premium && !member;
  const out = researchCard(r);
  out.locked = locked;
  out.fileUrl = locked ? '' : (r.fileUrl || '');
  res.json({ research: out });
});
app.post('/api/research', requireAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.title_vi && !b.title_en) return res.status(400).json({ error: 'Thiếu tiêu đề / Missing title' });
  const r = {
    id: DB.id(), author: req.user.name, createdAt: DB.nowISO(),
    title_vi: b.title_vi || b.title_en, title_en: b.title_en || b.title_vi,
    authors: b.authors || req.user.name,
    abstract_vi: b.abstract_vi || '', abstract_en: b.abstract_en || '',
    fileUrl: b.fileUrl || '', premium: !!b.premium, tags: b.tags || ''
  };
  db().research.push(r); DB.save();
  res.json({ research: r });
});
app.delete('/api/research/:id', requireAdmin, (req, res) => {
  const i = db().research.findIndex(x => x.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  db().research.splice(i, 1); DB.save();
  res.json({ ok: true });
});

// ============ VN MARKET DATA (real, from free Vietnamese sources) ============
const _mktCache = {};
async function fetchJSON(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
async function getVNHistory(symbol) {
  symbol = String(symbol || 'VNINDEX').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cached = _mktCache[symbol];
  if (cached && (Date.now() - cached.at) < 5 * 60 * 1000) return cached.data;
  const isIndex = ['VNINDEX', 'HNXINDEX', 'UPCOMINDEX', 'VN30'].includes(symbol);
  const now = Math.floor(Date.now() / 1000);
  const from = now - 400 * 24 * 3600;
  let candles = [];
  // Source 1: TCBS
  try {
    const type = isIndex ? 'index' : 'stock';
    const j = await fetchJSON(`https://apipubaws.tcbs.com.vn/stock-insight/v1/stock/bars-long-term?ticker=${symbol}&type=${type}&resolution=D&to=${now}&countBack=300`);
    if (j && Array.isArray(j.data)) candles = j.data.map(d => ({ t: Math.floor(new Date(d.tradingDate).getTime() / 1000), o: +d.open, h: +d.high, l: +d.low, c: +d.close, v: +d.volume || 0 }));
  } catch (e) { /* try next */ }
  // Source 2: VNDIRECT dchart (UDF)
  if (!candles.length) {
    try {
      const j = await fetchJSON(`https://dchart-api.vndirect.com.vn/dchart/history?resolution=D&symbol=${symbol}&from=${from}&to=${now}`);
      if (j && j.s === 'ok' && Array.isArray(j.t)) candles = j.t.map((t, i) => ({ t, o: +j.o[i], h: +j.h[i], l: +j.l[i], c: +j.c[i], v: +(j.v ? j.v[i] : 0) }));
    } catch (e) { /* give up */ }
  }
  if (!candles.length) throw new Error('no data');
  candles.sort((a, b) => a.t - b.t);
  const data = { symbol, candles, source: 'TCBS/VNDIRECT', fetchedAt: DB.nowISO() };
  _mktCache[symbol] = { at: Date.now(), data };
  return data;
}
app.get('/api/market/history', async (req, res) => {
  try { res.json(await getVNHistory(req.query.symbol)); }
  catch (e) { res.status(502).json({ error: 'Không lấy được dữ liệu thị trường VN: ' + e.message }); }
});

// ============ WEBHOOK: auto-reconciliation (Casso / Sepay / bank push) ============
app.post('/api/webhook/payment', (req, res) => {
  const cfg = CONFIG.webhook || {};
  if (!cfg.enabled) return res.status(503).json({ error: 'Webhook disabled' });
  const provided = req.headers['x-webhook-secret'] || req.query.secret || (req.body && req.body.secret);
  if (!cfg.secret || provided !== cfg.secret) return res.status(401).json({ error: 'Bad secret' });
  const body = req.body || {};
  let txns = [];
  if (Array.isArray(body.data)) txns = body.data;
  else if (Array.isArray(body.transactions)) txns = body.transactions;
  else txns = [body];
  const matched = [];
  for (const tx of txns) {
    const desc = String(tx.description || tx.content || tx.addInfo || tx.memo || tx.remark || '');
    const amount = Number(tx.amount || tx.transferAmount || tx.amountIn || tx.credit || 0);
    if (!desc) continue;
    for (const o of db().orders) {
      if (o.status === 'paid' || o.status === 'rejected') continue;
      if (desc.toUpperCase().includes(o.memo.toUpperCase()) && (!amount || amount >= o.amountVND)) {
        if (grantMembership(o)) matched.push({ orderId: o.id, memo: o.memo });
      }
    }
  }
  DB.save();
  res.json({ ok: true, matched });
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  ${(CONFIG.site && CONFIG.site.name) || 'FinHub'} đang chạy tại  http://localhost:${PORT}`);
  console.log(`  Admin demo: admin@finhub.vn / admin123\n`);
});
