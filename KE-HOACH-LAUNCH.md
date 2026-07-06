# Kế hoạch ra mắt (launch) FinHub — từng bước

Tài liệu này chia việc ra 6 giai đoạn, mỗi bước có việc cụ thể để bạn tích ✅ dần. Tổng thời gian gợi ý: **2–4 tuần**.

---

## Giai đoạn 0 — Chuẩn bị (1–2 ngày)

1. **Chốt định vị & tên**: tên thương hiệu, một câu mô tả (ví dụ: "Ấn phẩm độc lập về tài chính & đầu tư"), logo/màu (đang dùng cờ đỏ kiểu The Economist).
2. **Chuẩn bị nội dung mở màn**: tối thiểu
   - 5–8 bài phân tích tài chính (1 bài "nổi bật" cho trang chủ).
   - 2–3 bài nghiên cứu (NCKH) — kèm file PDF nếu có.
   - Trang Vĩ mô: cập nhật số thật tháng gần nhất trong `public/js/macro-data.js`.
3. **Tài khoản ngân hàng nhận tiền**: số TK, tên chủ TK (viết hoa không dấu), mã ngân hàng.
4. **Đổi thông tin demo** (bắt buộc trước khi công khai):
   - Đổi mật khẩu admin (mặc định `admin123`).
   - Sửa `config.json` → phần `bank` sang tài khoản thật.

> Kết quả cần có: nội dung sẵn sàng + thông tin ngân hàng thật + mật khẩu admin mới.

---

## Giai đoạn 1 — Chạy thử & hoàn thiện nội bộ (2–3 ngày)

1. Chạy local: `npm install` → `npm start` → mở `http://localhost:3000`.
2. Đi hết các trang: Trang chủ, Thị trường, Vĩ mô, Nghiên cứu, Cộng đồng, Thành viên.
3. Kiểm thử luồng người dùng:
   - Đăng ký → đăng nhập → bình luận → tạo chủ đề cộng đồng.
   - Mua một gói (VietQR hiện ra) → vào Quản trị xác nhận → kiểm tra thành viên được kích hoạt, bài trả phí mở khóa.
   - Đăng 1 bài viết & 1 bài NCKH từ Quản trị.
4. Kiểm tra song ngữ (nút VI/EN), kiểm tra trên điện thoại.
5. Tắt trình chặn quảng cáo để xem các ô thị trường TradingView.

> Kết quả: mọi luồng chạy trơn, không còn dữ liệu demo.

---

## Giai đoạn 2 — Tên miền & đưa lên mạng (2–3 ngày)

1. **Mua tên miền** (ví dụ tại Namecheap, Mắt Bão, PA Vietnam): chọn tên ngắn, dễ nhớ (`.com` hoặc `.vn`).
2. **Đưa code lên GitHub**: tạo repository, upload thư mục `finhub`.
3. **Deploy lên Render** (miễn phí, đã có sẵn `render.yaml` + `Procfile`):
   - render.com → New → Web Service → chọn repo.
   - Build: `npm install` · Start: `node server.js`.
4. **Đặt biến môi trường** trên Render (thay cho việc sửa file): `BANK_ID`, `BANK_ACCOUNT`, `BANK_NAME`, và `PORT` (Render tự cấp).
5. **Trỏ tên miền** về Render (thêm Custom Domain, cập nhật DNS theo hướng dẫn của Render). Bật HTTPS (Render tự cấp SSL).
6. **Lưu ý dữ liệu**: gói Render free có thể xóa `data/db.json` khi ngủ. Trước khi có nhiều người dùng, nên nâng cấp:
   - Gắn ổ đĩa (Persistent Disk) để giữ `data/`, hoặc
   - Chuyển sang cơ sở dữ liệu thật (SQLite/Postgres) — có thể nhờ hỗ trợ.

> Kết quả: web chạy tại tên miền thật, có khóa HTTPS.

---

## Giai đoạn 3 — Thanh toán & đối soát (1–2 ngày)

1. Kiểm tra QR VietQR trỏ đúng tài khoản (quét thử bằng app ngân hàng, **chuyển số tiền nhỏ** để test).
2. Xác nhận đơn thủ công trong Quản trị → kiểm tra kích hoạt thành viên.
3. (Tùy chọn) **Tự động đối soát** bằng Casso/Sepay:
   - Đăng ký dịch vụ, liên kết tài khoản ngân hàng.
   - Bật `webhook.enabled = true` + đặt `secret` trong `config.json`.
   - Khai báo URL webhook: `https://<tên-miền>/api/webhook/payment` kèm header `x-webhook-secret`.
   - Test: chuyển khoản đúng nội dung → thành viên tự kích hoạt.
4. Rà giá các gói: Tháng / Năm / Sáng lập / **Trọn bộ Nghiên cứu**.

> Kết quả: nhận tiền thật, thành viên kích hoạt (thủ công hoặc tự động).

---

## Giai đoạn 4 — Ra mắt beta (3–5 ngày)

1. Mời 20–50 người quen/nhóm mục tiêu dùng thử, thu phản hồi.
2. Theo dõi lỗi, tốc độ, trải nghiệm mua gói.
3. Sửa nhanh các lỗi phát hiện; bổ sung 3–5 bài nội dung nữa.
4. Chuẩn bị sẵn: trang giới thiệu, ảnh bìa mạng xã hội, bài đăng thông báo.

> Kết quả: sản phẩm ổn định, có nội dung đủ dày để công khai.

---

## Giai đoạn 5 — Ra mắt chính thức & tăng trưởng (liên tục)

1. **Công bố** trên các kênh: Facebook, LinkedIn, group đầu tư/tài chính, bạn bè.
2. **Ưu đãi mở màn**: giảm giá gói Năm hoặc mở "Thành viên Sáng lập" số lượng giới hạn.
3. **Nhịp nội dung đều**: đặt lịch (ví dụ 2–3 bài/tuần + 1 báo cáo vĩ mô/tháng). Đăng NCKH định kỳ.
4. **Nuôi cộng đồng**: trả lời thảo luận, tạo chủ đề mới, khuyến khích thành viên đóng góp.
5. **Email/bản tin**: gom email người đăng ký, gửi bản tin hàng tuần (có thể tích hợp sau).
6. **Đo lường**: gắn Google Analytics để biết lượng truy cập, nguồn, tỷ lệ mua gói.

> Kết quả: dòng người dùng & doanh thu đều đặn.

---

## Việc cần làm trước khi công khai (checklist nhanh)

- [ ] Đổi mật khẩu admin (không để `admin123`).
- [ ] `config.json` → tài khoản ngân hàng thật.
- [ ] Ít nhất 5 bài viết + 2 bài NCKH + số vĩ mô mới nhất.
- [ ] Đã test mua gói + xác nhận + mở khóa bài trả phí.
- [ ] Deploy có HTTPS + tên miền.
- [ ] Có phương án giữ dữ liệu (ổ đĩa/DB thật) nếu lượng người dùng tăng.
- [ ] Trang điều khoản & bảo mật cơ bản (khuyến nghị).

## Lưu ý pháp lý (nên có)
- Ghi rõ mọi nội dung tài chính chỉ để **tham khảo, không phải lời khuyên đầu tư** (đã có sẵn trong web).
- Nếu bán gói thu tiền, cân nhắc điều khoản dịch vụ, chính sách hoàn tiền, và nghĩa vụ thuế/hóa đơn theo quy định.

---

Cần tôi hỗ trợ bước nào (dựng repo GitHub, chuyển sang database thật, gắn Google Analytics, làm trang điều khoản…) thì nói nhé.
