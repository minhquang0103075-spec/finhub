'use strict';
/*
 * Lightweight JSON-file datastore. No native dependencies — works anywhere
 * Node 18+ runs. Data persists to data/db.json.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function nowISO() { return new Date().toISOString(); }
function id() { return crypto.randomBytes(9).toString('hex'); }

const DEFAULT = {
  users: [],
  articles: [],
  comments: [],   // community discussion tied to articles
  research: [],   // NCKH — research papers shared by admins
  threads: [],    // standalone community forum threads
  posts: [],      // replies within threads
  plans: [],
  orders: [],     // membership purchase orders (VietQR, manual confirmation)
  sessions: {}    // token -> { userId, createdAt }
};

let db = null;

function load() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      for (const k of Object.keys(DEFAULT)) if (!(k in db)) db[k] = DEFAULT[k];
    } catch (e) {
      console.error('DB corrupted, starting fresh:', e.message);
      db = JSON.parse(JSON.stringify(DEFAULT));
    }
  } else {
    db = JSON.parse(JSON.stringify(DEFAULT));
  }
  seed();
  save();
  return db;
}

let saveTimer = null;
function save() {
  // debounce writes
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  }, 50);
}
function saveNow() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ---- password hashing using scrypt (built-in) ----
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(test, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function seed() {
  if (db.plans.length === 0) {
    db.plans = [
      {
        id: 'monthly',
        priceVND: 99000,
        durationDays: 30,
        name_vi: 'Gói Tháng', name_en: 'Monthly',
        tagline_vi: 'Truy cập toàn bộ bài viết trong 30 ngày',
        tagline_en: 'Full access for 30 days',
        features_vi: ['Toàn bộ bài phân tích tài chính', 'Bản tin hàng tuần', 'Tham gia thảo luận cộng đồng'],
        features_en: ['All finance analysis', 'Weekly newsletter', 'Join community discussions']
      },
      {
        id: 'yearly',
        priceVND: 899000,
        durationDays: 365,
        name_vi: 'Gói Năm', name_en: 'Annual',
        tagline_vi: 'Tiết kiệm 25% so với trả theo tháng',
        tagline_en: 'Save 25% versus monthly',
        popular: true,
        features_vi: ['Mọi quyền lợi gói Tháng', 'Báo cáo chuyên sâu hàng quý', 'Huy hiệu Thành viên', 'Ưu tiên hỏi đáp'],
        features_en: ['Everything in Monthly', 'Quarterly deep-dive reports', 'Member badge', 'Priority Q&A']
      },
      {
        id: 'founder',
        priceVND: 2490000,
        durationDays: 3650,
        name_vi: 'Thành viên Sáng lập', name_en: 'Founding Member',
        tagline_vi: 'Truy cập trọn đời & tri ân đặc biệt',
        tagline_en: 'Lifetime access & special recognition',
        features_vi: ['Truy cập trọn đời', 'Tên trong trang Sáng lập', 'Mời tham gia sự kiện riêng', 'Trao đổi trực tiếp với ban biên tập'],
        features_en: ['Lifetime access', 'Name on Founders page', 'Invites to private events', 'Direct line to the editors']
      }
    ];
  }

  // ensure the "all papers" bundle plan exists (idempotent)
  if (!db.plans.find(p => p.id === 'research_bundle')) {
    db.plans.push({
      id: 'research_bundle', priceVND: 499000, durationDays: 3650,
      name_vi: 'Trọn bộ Nghiên cứu', name_en: 'All-Access Research',
      tagline_vi: 'Mua một lần — đọc toàn bộ bài báo & nghiên cứu',
      tagline_en: 'Buy once — read every paper & article',
      bundle: true,
      features_vi: ['Toàn bộ bài nghiên cứu khoa học (NCKH)', 'Toàn bộ bài phân tích tài chính', 'Tải PDF bản đầy đủ', 'Truy cập trọn đời'],
      features_en: ['All research papers', 'All finance analysis', 'Download full PDFs', 'Lifetime access']
    });
  }

  if (db.research.length === 0) {
    const rs = [
      {
        title_vi: 'Ảnh hưởng của chính sách lãi suất tới thanh khoản thị trường chứng khoán Việt Nam',
        title_en: 'Effects of interest-rate policy on liquidity in the Vietnamese stock market',
        authors: 'Nhóm Nghiên cứu FinHub · Trần A., Nguyễn B.',
        abstract_vi: 'Nghiên cứu phân tích mối quan hệ giữa lãi suất điều hành và thanh khoản thị trường cổ phiếu giai đoạn 2018–2025, sử dụng mô hình VAR và dữ liệu theo tháng.',
        abstract_en: 'This paper analyses the relationship between policy rates and equity-market liquidity over 2018–2025 using a VAR model and monthly data.',
        fileUrl: '', premium: true, tags: 'Tài chính, Thị trường'
      },
      {
        title_vi: 'Hành vi nhà đầu tư cá nhân và hiệu ứng đám đông trên thị trường VN',
        title_en: 'Retail investor behaviour and herding effects in Vietnam',
        authors: 'Nhóm Nghiên cứu FinHub · Lê C.',
        abstract_vi: 'Khảo sát 1.200 nhà đầu tư cá nhân nhằm đo lường mức độ hiệu ứng đám đông và các yếu tố tâm lý ảnh hưởng tới quyết định giao dịch.',
        abstract_en: 'A survey of 1,200 retail investors measuring herding intensity and the psychological factors driving trading decisions.',
        fileUrl: '', premium: false, tags: 'Hành vi, Đầu tư'
      }
    ];
    let i = 0;
    for (const r of rs) {
      db.research.push({ id: id(), author: 'Ban Biên Tập', createdAt: new Date(Date.now() - i*48*3600*1000).toISOString(), ...r });
      i++;
    }
  }

  if (db.users.length === 0) {
    const admin = {
      id: id(),
      email: 'admin@finhub.vn',
      name: 'Ban Biên Tập',
      passwordHash: hashPassword('admin123'),
      role: 'admin',
      membership: { planId: 'founder', expiresAt: '2099-01-01T00:00:00.000Z' },
      createdAt: nowISO()
    };
    db.users.push(admin);
  }

  if (db.articles.length === 0) {
    const author = 'Ban Biên Tập';
    const sample = [
      {
        section_vi: 'Tài chính', section_en: 'Finance',
        title_vi: 'Lãi suất, lạm phát và bài toán của nhà đầu tư cá nhân',
        title_en: 'Interest rates, inflation, and the retail investor’s dilemma',
        dek_vi: 'Khi chi phí vốn thay đổi, danh mục đầu tư cũng phải thay đổi theo. Nhưng thay đổi thế nào?',
        dek_en: 'When the cost of capital shifts, portfolios must shift too. But how?',
        lead: true,
        body_vi: '<p>Trong hơn một thập kỷ, tiền rẻ đã định hình thói quen đầu tư của cả một thế hệ. Nay chu kỳ đã đảo chiều, và những giả định cũ cần được xem lại từ gốc.</p><p>Bài viết này phân tích cách một nhà đầu tư cá nhân nên tư duy về phân bổ tài sản khi lãi suất thực dương trở lại: vai trò của trái phiếu, giới hạn của cổ phiếu tăng trưởng, và lý do tiền mặt không còn là lựa chọn tồi.</p><p>Điều quan trọng không phải là dự đoán đỉnh lãi suất, mà là xây một danh mục chịu được nhiều kịch bản. Sự khiêm tốn trước bất định, nghịch lý thay, lại là chiến lược tấn công tốt nhất.</p>',
        body_en: '<p>For over a decade, cheap money shaped the investing habits of an entire generation. The cycle has now turned, and old assumptions deserve a rethink from first principles.</p><p>This piece examines how a retail investor should think about asset allocation as positive real rates return: the role of bonds, the limits of growth stocks, and why cash is no longer a poor choice.</p><p>What matters is not predicting the peak in rates, but building a portfolio that survives many scenarios. Humility before uncertainty is, paradoxically, the best offence.</p>'
      },
      {
        section_vi: 'Thị trường', section_en: 'Markets',
        title_vi: 'Chứng khoán Việt Nam: câu chuyện nâng hạng còn dang dở',
        title_en: 'Vietnam equities: the unfinished upgrade story',
        dek_vi: 'Con đường lên thị trường mới nổi đầy hứa hẹn nhưng cũng lắm rào cản kỹ thuật.',
        dek_en: 'The path to emerging-market status is promising but full of technical hurdles.',
        body_vi: '<p>Việc nâng hạng có thể mở ra dòng vốn ngoại đáng kể. Nhưng thanh khoản, giới hạn sở hữu nước ngoài và cơ chế thanh toán vẫn là những nút thắt cần tháo gỡ.</p><p>Chúng tôi nhìn vào các con số và những gì chúng thực sự nói lên về triển vọng trung hạn.</p>',
        body_en: '<p>An upgrade could unlock significant foreign inflows. But liquidity, foreign-ownership limits and settlement mechanics remain knots to untie.</p><p>We look at the numbers and what they really say about the medium-term outlook.</p>'
      },
      {
        section_vi: 'Kinh tế', section_en: 'Economics',
        title_vi: 'Tại sao lạm phát dịch vụ khó hạ hơn lạm phát hàng hóa',
        title_en: 'Why services inflation is stickier than goods inflation',
        dek_vi: 'Giá cắt tóc không giảm như giá tivi. Đằng sau đó là cấu trúc của nền kinh tế hiện đại.',
        dek_en: 'Haircuts don’t fall in price like televisions. Behind that lies the structure of a modern economy.',
        body_vi: '<p>Hàng hóa có thể được sản xuất ở nơi rẻ nhất và vận chuyển đi khắp nơi. Dịch vụ thì gắn với con người và địa điểm, nên chịu áp lực tiền lương lớn hơn.</p><p>Hiểu sự khác biệt này giúp lý giải vì sao ngân hàng trung ương phải kiên nhẫn hơn họ muốn.</p>',
        body_en: '<p>Goods can be made where it is cheapest and shipped anywhere. Services are tied to people and places, and so feel wage pressure more acutely.</p><p>Understanding this difference helps explain why central banks must be more patient than they would like.</p>'
      },
      {
        section_vi: 'Góc nhìn', section_en: 'Opinion',
        title_vi: 'Đầu tư chỉ số không phải là lười — đó là khiêm tốn',
        title_en: 'Index investing isn’t lazy — it’s humble',
        dek_vi: 'Chấp nhận mức trung bình của thị trường là một quyết định trưởng thành, không phải sự đầu hàng.',
        dek_en: 'Accepting the market average is a mature decision, not a surrender.',
        body_vi: '<p>Phần lớn quỹ chủ động thua chỉ số sau khi trừ phí. Điều đó không có nghĩa đầu tư chủ động vô nghĩa, mà là bạn cần lý do rất tốt để tin mình thuộc nhóm thiểu số thắng cuộc.</p>',
        body_en: '<p>Most active funds trail the index after fees. That does not make active investing pointless, but you need a very good reason to believe you are in the winning minority.</p>'
      },
      {
        section_vi: 'Tài chính cá nhân', section_en: 'Personal Finance',
        title_vi: 'Quỹ dự phòng: bao nhiêu là đủ trong thời kỳ bất định',
        title_en: 'Emergency funds: how much is enough in uncertain times',
        dek_vi: 'Quy tắc "sáu tháng chi tiêu" có còn hợp lý không?',
        dek_en: 'Does the “six months of expenses” rule still hold?',
        body_vi: '<p>Con số phù hợp phụ thuộc vào sự ổn định thu nhập, số người phụ thuộc và khả năng tiếp cận tín dụng. Một freelancer cần đệm dày hơn một công chức.</p>',
        body_en: '<p>The right number depends on income stability, dependants and access to credit. A freelancer needs a thicker cushion than a civil servant.</p>'
      },
      {
        section_vi: 'Công nghệ tài chính', section_en: 'Fintech',
        title_vi: 'Thanh toán QR đã thay đổi hành vi người Việt như thế nào',
        title_en: 'How QR payments reshaped Vietnamese behaviour',
        dek_vi: 'Từ quán phở đến cửa hàng tiện lợi, mã QR đang âm thầm số hóa nền kinh tế tiền mặt.',
        dek_en: 'From noodle stalls to convenience stores, QR codes are quietly digitising a cash economy.',
        body_vi: '<p>Chi phí thấp và độ phủ rộng khiến QR trở thành hạ tầng thanh toán mặc định. Câu hỏi tiếp theo là dữ liệu giao dịch sẽ được dùng ra sao.</p>',
        body_en: '<p>Low cost and wide reach made QR the default payment rail. The next question is how transaction data will be used.</p>'
      }
    ];
    let i = 0;
    for (const s of sample) {
      const created = new Date(Date.now() - (i * 36 * 3600 * 1000)).toISOString();
      db.articles.push({
        id: id(),
        author,
        premium: i % 2 === 1, // alternate: some articles members-only
        createdAt: created,
        ...s
      });
      i++;
    }
  }
}

// expose helpers
module.exports = {
  load, save, saveNow, id, nowISO,
  hashPassword, verifyPassword,
  get: () => db
};
