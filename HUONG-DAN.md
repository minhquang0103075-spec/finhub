# Hướng dẫn FinHub — từ A đến Z

Tài liệu này gồm 4 phần theo đúng thứ tự bạn nên làm:
1. Chạy thử trên máy
2. Cấu hình tài khoản ngân hàng
3. Đưa website lên mạng (hosting)
4. Đối soát thanh toán tự động

---

## 1. Chạy thử trên máy

**Cần cài trước:** Node.js bản LTS — tải ở https://nodejs.org rồi cài như phần mềm thường.

**Các bước:**

1. Giải nén `finhub-website.zip`, bạn được thư mục `finhub`.
2. Mở cửa sổ dòng lệnh **trong** thư mục đó:
   - Windows: mở thư mục `finhub`, bấm vào thanh địa chỉ, gõ `cmd` rồi Enter.
   - macOS: mở Terminal, gõ `cd ` (kèm dấu cách) rồi kéo thư mục `finhub` thả vào, Enter.
3. Gõ lần lượt (lần đầu chạy cả hai; các lần sau chỉ cần lệnh thứ hai):

   ```
   npm install
   npm start
   ```

4. Mở trình duyệt vào **http://localhost:3000**

**Tài khoản quản trị demo:** `admin@finhub.vn` / `admin123`
(Đăng nhập admin → nút **Quản trị** để đăng bài và duyệt thanh toán.)

> Muốn dừng server: bấm `Ctrl + C` trong cửa sổ dòng lệnh.

**Nếu gặp lỗi thường gặp:**
- `'npm' is not recognized` → chưa cài Node.js, hoặc cần đóng/mở lại cửa sổ lệnh sau khi cài.
- `port 3000 already in use` → đổi cổng: chạy `set PORT=3001 && npm start` (Windows) hoặc `PORT=3001 npm start` (macOS).

---

## 2. Cấu hình tài khoản ngân hàng (nhận tiền thật)

Mở file **`config.json`** trong thư mục `finhub` bằng Notepad / TextEdit, sửa phần `bank`:

```json
"bank": {
  "bankId": "VCB",
  "accountNo": "0011000123456",
  "accountName": "NGUYEN VAN A"
}
```

- `bankId`: mã ngân hàng (VCB, MB, TCB, ACB, BIDV, VTB, TPB, VPB...).
- `accountNo`: số tài khoản nhận tiền.
- `accountName`: tên chủ tài khoản, **viết hoa không dấu**.

Lưu file, khởi động lại server (`npm start`). Khi khách chọn gói, mã QR VietQR sẽ trỏ đúng vào tài khoản của bạn. Máy chạy cần có internet để hiện ảnh QR.

> Mỗi đơn có một **nội dung chuyển khoản** riêng (ví dụ `FH2295M`). Khách phải ghi đúng nội dung này khi chuyển — đó là cách hệ thống biết ai đã trả tiền.

---

## 3. Đưa website lên mạng (hosting miễn phí với Render)

Để người khác truy cập qua một địa chỉ web thật, bạn cần deploy. Cách dễ nhất là **Render** (có gói miễn phí). Dự án đã kèm sẵn `Procfile` và `render.yaml`.

**Các bước:**

1. Đưa code lên GitHub:
   - Tạo tài khoản GitHub (nếu chưa có), tạo một repository mới.
   - Tải toàn bộ thư mục `finhub` lên repo đó (dùng nút *Upload files* trên GitHub cũng được).
2. Vào https://render.com, đăng nhập bằng GitHub.
3. Bấm **New → Web Service**, chọn repo `finhub`.
4. Render tự nhận cấu hình:
   - Build Command: `npm install`
   - Start Command: `node server.js`
5. Bấm **Create Web Service**. Chờ vài phút, bạn sẽ có địa chỉ dạng `https://finhub-xxxx.onrender.com`.

**Lưu ý quan trọng về dữ liệu:**
- Dự án lưu dữ liệu trong file `data/db.json`. Trên gói Render miễn phí, dữ liệu có thể bị xóa khi service ngủ/khởi động lại. Khi lượng người dùng tăng, nên chuyển sang cơ sở dữ liệu thật (SQLite có ổ đĩa gắn thêm, hoặc Postgres) — tôi có thể giúp bạn phần này.
- Đặt lại **mật khẩu admin** trước khi lên mạng (mặc định `admin123` chỉ để demo).

---

## 4. Đối soát thanh toán tự động (không cần duyệt tay)

Mặc định, admin phải vào **Quản trị → Đơn hàng** bấm **Xác nhận** sau khi kiểm tra sao kê. Muốn tự động, bạn dùng dịch vụ đối soát biến động số dư như **Casso** (casso.vn) hoặc **Sepay** (sepay.vn) — chúng theo dõi tài khoản ngân hàng và gọi *webhook* mỗi khi có tiền vào.

Dự án đã có sẵn endpoint: **`POST /api/webhook/payment`**

**Bật lên:** mở `config.json`, sửa phần `webhook`:

```json
"webhook": {
  "enabled": true,
  "secret": "mot-chuoi-bi-mat-dai-va-kho-doan"
}
```

**Khai báo với Casso/Sepay:**
- URL webhook: `https://<địa-chỉ-web-của-bạn>/api/webhook/payment`
- Thêm header `x-webhook-secret` với đúng giá trị `secret` ở trên (hoặc thêm `?secret=...` vào URL).

**Cách hoạt động:** khi khách chuyển khoản với nội dung `FH2295M`, ngân hàng báo cho Casso/Sepay, dịch vụ gọi webhook, hệ thống tìm đơn có nội dung khớp và số tiền đủ → **tự kích hoạt thành viên** ngay. Không cần bấm tay.

> Endpoint chấp nhận nhiều định dạng dữ liệu (Casso, Sepay, hoặc bank push) — nó dò `description/content` để tìm nội dung chuyển khoản và so `amount` với giá gói.

---

## Cần hỗ trợ thêm?

Tôi có thể giúp bạn: đổi mật khẩu admin, chuyển sang cơ sở dữ liệu thật, thêm ảnh bìa cho bài viết, thêm chuyên mục & tìm kiếm, hoặc dựng sẵn repo GitHub để deploy. Cứ nói phần nào bạn muốn làm tiếp.
