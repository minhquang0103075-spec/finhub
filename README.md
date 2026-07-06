# FinHub — Ấn phẩm tài chính kiểu The Economist

Website song ngữ (Việt/Anh) để đăng bài phân tích tài chính, xây dựng cộng đồng thảo luận, và bán gói thành viên qua **chuyển khoản / VietQR**.

## Chạy thử (chỉ cần Node.js 18+)

```bash
cd finhub
npm install      # chỉ cài express
npm start        # mở http://localhost:3000
```

Tài khoản quản trị demo: **admin@finhub.vn** / **admin123**

## Tính năng

- **Giao diện kiểu The Economist**: masthead cờ đỏ, chữ serif, trang nhất dạng lưới, drop-cap, paywall.
- **Song ngữ VI/EN**: nút chuyển ngôn ngữ ở góc trên (lưu trong trình duyệt).
- **Bài viết tài chính**: trang chủ (bài nổi bật + lưới), trang chi tiết. Bài đánh dấu *Thành viên* bị khóa với người chưa mua (chỉ hiện đoạn đầu).
- **Cộng đồng**: bình luận dưới mỗi bài + diễn đàn tạo chủ đề/trả lời.
- **Hệ thống thành viên (VietQR)**: 3 gói (Tháng / Năm / Sáng lập). Người dùng chọn gói → hệ thống tạo đơn kèm **mã QR VietQR** và **nội dung chuyển khoản riêng**. Sau khi khách chuyển tiền, admin vào bảng quản trị bấm **Xác nhận** để kích hoạt thành viên.
- **Đăng nhập/đăng ký** thật (mật khẩu băm bằng scrypt, phiên qua cookie).

## Cấu hình tài khoản ngân hàng (VietQR)

Mặc định dùng số tài khoản demo. Đặt biến môi trường trước khi chạy:

```bash
BANK_ID=VCB BANK_ACCOUNT=0011000123456 BANK_NAME="NGUYEN VAN A" npm start
```

- `BANK_ID`: mã ngân hàng NAPAS (VCB, MB, TCB, ACB, BIDV, VTB…)
- `BANK_ACCOUNT`: số tài khoản nhận tiền
- `BANK_NAME`: tên chủ tài khoản (không dấu)

Mã QR được tạo qua dịch vụ ảnh miễn phí `img.vietqr.io` — máy chạy cần có internet để hiển thị QR.

## Cấu trúc

```
finhub/
  server.js        # Express API (auth, articles, community, membership)
  db.js            # Lưu dữ liệu bằng file JSON (data/db.json), băm mật khẩu scrypt
  data/db.json     # Dữ liệu (tự sinh khi chạy lần đầu)
  public/
    index.html     # Trang chủ
    article.html   # Bài viết + bình luận
    community.html # Diễn đàn cộng đồng
    membership.html# Gói thành viên + thanh toán VietQR
    account.html   # Tài khoản & đơn hàng của tôi
    admin.html     # Quản trị: duyệt thanh toán, đăng bài
    login.html     # Đăng nhập / đăng ký
    css/style.css  # Giao diện
    js/app.js      # i18n, auth, layout dùng chung
```

## Luồng mua thành viên

1. Khách đăng nhập → vào **Thành viên** → chọn gói.
2. Hệ thống hiện **QR VietQR** + số tài khoản + **nội dung CK** (ví dụ `FHO4W9U`).
3. Khách chuyển khoản đúng nội dung → bấm *"Tôi đã chuyển khoản"*.
4. Admin vào **Quản trị → Đơn hàng**, đối chiếu sao kê, bấm **Xác nhận** → thành viên được kích hoạt tự động theo thời hạn gói.

## Nâng cấp gợi ý

- Nối cổng thanh toán tự động (Casso / Sepay webhook đối soát biến động số dư) để xác nhận đơn không cần thủ công.
- Thay JSON store bằng SQLite/Postgres khi lượng dữ liệu lớn.
- Thêm ảnh bìa bài viết, chuyên mục, tìm kiếm.

> Đây là dự án nền tảng chạy được ngay. Mật khẩu demo và tài khoản ngân hàng demo cần được thay trước khi đưa vào sử dụng thật.

---

## Cập nhật v2 — Giao diện đẹp hơn + Thị trường & Vĩ mô

- **Giao diện tinh chỉnh**: thêm web-font (Playfair Display cho tiêu đề, Source Serif cho nội dung, Inter cho giao diện), hiệu ứng hover, ảnh bìa, thanh **ticker giá chạy** live ở đầu trang.
- **Trang Thị trường** (`/market.html`): bảng giá **trực tiếp** bằng TradingView — VN-Index, HNX, vàng, USD/VND, S&P 500, Nasdaq, Bitcoin, cùng biểu đồ nến và bảng giá crypto. Cần internet.
- **Trang Vĩ mô** (`/macro.html`): dashboard chỉ số kinh tế VN hàng tháng (Chart.js) theo 4 trụ cột — Kinh tế thực / Ngoại thương / Tiền tệ / Tổng hợp. Ý tưởng lấy từ skill `vn-macro-monthly`.

### Cập nhật số liệu Vĩ mô hàng tháng
Số liệu vĩ mô là **dữ liệu mẫu minh họa**. Mỗi tháng, mở file **`public/js/macro-data.js`**, thay các con số bằng số thật (từ NSO, Hải quan, S&P PMI, VBMA, VNBA — hoặc chạy skill `vn-macro-monthly`), lưu lại rồi tải lại trang. Không cần khởi động lại server.

> Lưu ý: mọi thông tin thị trường/vĩ mô chỉ để tham khảo, không phải lời khuyên đầu tư.
