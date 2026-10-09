# Mini ERP chế tạo máy

Dự án Google Apps Script dùng Google Sheets làm cơ sở dữ liệu và giao diện WebApp phục vụ quy trình chế tạo máy theo dự án.

## Cấu trúc

- `src/`: mã nguồn ứng dụng được clasp đẩy lên Apps Script.
- `tests/`: các hàm kiểm thử chạy trong Apps Script editor.
- `Documents/`: đặc tả, danh sách task và giao diện tham khảo.

`.claspignore` giới hạn nội dung đẩy lên Apps Script ở manifest, `src/` và `tests/`; tài liệu nội bộ không được tải lên.

## Liên kết với Apps Script

1. Chạy `npm install` để cài phiên bản clasp đã khóa cho dự án.
2. Đăng nhập bằng `npm run clasp -- login` theo tài liệu chính thức của Google.
3. Sao chép `.clasp.example.json` thành `.clasp.json`.
4. Thay `REPLACE_WITH_YOUR_APPS_SCRIPT_ID` bằng Script ID của dự án Apps Script thật.
5. Chạy `npm run clasp -- push` tại thư mục gốc.
6. Trong Apps Script editor, chạy `test_doGet_hello()`.
7. Triển khai loại Web app và mở URL triển khai; trang phải hiển thị “Hello”.

Không commit `.clasp.json` hoặc thông tin đăng nhập clasp vào Git.

## Khởi tạo Google Sheets

Sau khi đẩy mã nguồn lên Apps Script, chạy `setup_schema()` một lần trong Apps Script editor. Nếu Script Property `SPREADSHEET_ID` chưa tồn tại, hàm sẽ tạo file Google Sheets tên `Mini ERP` và tự lưu ID. Những lần chạy tiếp theo dùng lại file đó và chỉ bổ sung sheet hoặc tiêu đề còn thiếu.

Chạy `test_setup_schema()` để kiểm tra đủ 40 sheet và xác nhận lần chạy thứ hai không tạo trùng hoặc làm thay đổi schema/số dòng.

## Kiểm tra lớp dữ liệu

Sau khi schema đã được tạo, chạy `test_lib_db()` trong Apps Script editor. Test tạo một bảng tính tạm, kiểm tra chèn 1.000 dòng, đọc/tìm/lọc/cập nhật/xóa mềm, đổi thứ tự cột và bộ đếm; bảng tính thử được chuyển vào thùng rác sau khi hoàn tất.

Để kiểm tra cạnh tranh bộ đếm, chạy `test_nextId_concurrent_start()`, đợi hai trigger hoàn tất rồi chạy `test_nextId_concurrent_verify()`.

## Kiểm tra API và khóa ghi

Chạy `test_api_contract()` trong Apps Script editor để kiểm tra hợp đồng response, validation và lỗi `NOT_FOUND`.

Để kiểm tra hai request ghi đồng thời, chạy `test_api_concurrent_start()`, đợi hai trigger hoàn tất rồi chạy `test_api_concurrent_verify()`. Kết quả hợp lệ là bộ đếm bằng `2`; action ghi được router bọc bằng Script Lock.

## Kiểm tra AuditLog và Notifications

Chạy `test_audit_and_notifications()` trong Apps Script editor. Test xác nhận mỗi thao tác insert/update sinh AuditLog, giá trị CCCD và số tài khoản không xuất hiện trong log, đồng thời kiểm tra tạo và đọc thông báo chưa xem. File Google Sheets thử được chuyển vào thùng rác sau khi hoàn tất.

## Khởi tạo tài khoản quản trị và giao diện

Sau `setup_schema()`, chạy `setup_first_admin()` đúng một lần bằng tài khoản chủ sở hữu deployment. Hàm chỉ hoạt động khi sheet `Users` còn trống. Tải lại Web App để `auth.me` dựng menu theo quyền.

Khóa Gemini được đặt trong Script Property `GEMINI_API_KEY`; có thể đặt `GEMINI_MODEL` để thay model mặc định. Không lưu khóa trong source hoặc giao diện.

## Kiểm thử nền tảng và giao diện

Chạy `npm test` để kiểm tra toàn bộ nền tảng local, bao gồm F-08/F-09. Trong Apps Script editor, chạy `test_f08_f09()` để kiểm tra các partial đã được tải đúng.

Tài khoản có quyền `settings` mở `#style-guide` để xem bảng, chip, tab, modal, toast, form, thanh phân bổ và hành vi thử lại khi `LOCK_TIMEOUT`.

Trang `#settings` dành riêng cho admin. Thay đổi Settings được ghi trực tiếp vào Google Sheets và có hiệu lực ngay; Counters chỉ hiển thị để theo dõi, không cho sửa từ giao diện.

Chạy `seed_sample_data()` trong Apps Script editor để bổ sung dữ liệu mẫu Khách hàng, Nhà cung cấp, Vật tư, Nhân viên, kỹ năng/chứng chỉ và Dự án với kế hoạch thanh toán. Hàm chỉ thêm các mã `DEMO` còn thiếu nên có thể chạy lại an toàn.

Trang `#items` hỗ trợ tạo/sửa, tìm theo mã vạch và nhập tối đa 1.000 dòng mỗi lần bằng dữ liệu dán trực tiếp từ Excel (TSV) hoặc file CSV. Bước xem trước báo lỗi theo dòng và chỉ cho ghi khi toàn bộ dữ liệu hợp lệ.

Trang `#employees` hiển thị danh sách và chi tiết hồ sơ theo quyền. CCCD và số tài khoản được che với vai trò ngoài `hr/admin`; action `employee.reveal` dành cho `hr/admin` và luôn ghi AuditLog.

"# MiniERP" 
