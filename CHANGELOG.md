# CHANGELOG

## 2026-10-06

### F-01 Dựng dự án Apps Script

- Khởi tạo cấu trúc `src` và `tests` cho dự án clasp.
- Thêm manifest Apps Script chạy V8 với múi giờ `Asia/Bangkok`.
- Thêm `doGet()` phục vụ trang WebApp “Hello”.
- Thêm smoke test `test_doGet_hello()` chạy trong Apps Script editor.
- Thêm cấu hình clasp mẫu; chưa gắn `scriptId` thật.
- Khóa công cụ phát triển `@google/clasp` ở phiên bản `3.4.1` trong dự án.

### F-02 Tạo schema Google Sheets

- Thêm schema 40 sheet theo §3 của đặc tả.
- Thêm `setup_schema()` cho mô hình Apps Script độc lập dùng Script Property `SPREADSHEET_ID`.
- Khi chưa có cấu hình, tự tạo Google Sheet `Mini ERP`; khi đã có, chỉ bổ sung sheet/cột còn thiếu và giữ nguyên dữ liệu.
- Thêm `test_setup_schema()` kiểm tra tính lặp lại an toàn của hai lần chạy.

### F-03 Lớp truy cập dữ liệu

- Thêm `readAll`, `findById`, `query`, `insert`, `insertMany`, `update`, `softDelete` và `nextId`.
- Ánh xạ dữ liệu theo tên cột hàng 1, không phụ thuộc thứ tự cột.
- Thêm dấu vết tạo/cập nhật và loại bản ghi có `deleted_at` khỏi kết quả đọc.
- Ghi dữ liệu theo lô, cache danh mục 5 phút và xóa cache sau khi ghi.
- Bảo vệ các thao tác ghi và bộ đếm bằng Script Lock.
- Thêm test 1.000 dòng, đổi thứ tự cột, xóa mềm và hai trigger kiểm tra `nextId` đồng thời.

### F-04 Hợp đồng API, router và khóa ghi

- Thêm `apiError` với toàn bộ mã lỗi chuẩn trong đặc tả và response `{ok,data,meta}` / `{ok,error}` thống nhất.
- Thêm router action dùng chung cho `google.script.run.api(request)` và endpoint JSON `doPost`.
- Action không tồn tại trả `NOT_FOUND`; request sai cấu trúc trả `VALIDATION`; lỗi ngoài dự kiến được che thành `INTERNAL`.
- Chuẩn hóa khóa ghi qua `withLock`; hỗ trợ lời gọi lồng nhau để action ghi có thể gọi lớp dữ liệu mà không tự khóa chồng.
- Thêm kiểm thử local và kiểm thử hai trigger ghi đồng thời trong Apps Script.

### F-06 AuditLog và Notifications cơ bản

- Tự động ghi AuditLog theo lô cho `insert`, `insertMany`, `update`, `softDelete` và cập nhật bộ đếm.
- Audit dùng tên action API hiện hành khi thao tác chạy qua router; lời gọi trực tiếp dùng tên thao tác DB tương ứng.
- Loại bỏ giá trị `id_card_no` và `bank_account` khỏi JSON audit, chỉ giữ tên trường nhạy cảm.
- Thêm helper tạo thông báo và đọc danh sách thông báo chưa xem theo người nhận.
- Thêm test local và test Apps Script trên bảng tính tạm cho audit, dữ liệu nhạy cảm và notification.

### D-04 Danh mục kho

- Khởi tạo lặp lại an toàn ba kho mặc định: dùng chung, tiêu hao và thành phẩm.
- Thêm API danh sách/tạo/sửa/xoá kho; chặn xoá kho đã có tồn hoặc giao dịch.

### C-01 Sổ quỹ nền tảng

- Thêm tài khoản quỹ, phiếu thu/chi liên tục `PT-0001` và `PC-0001`, tính số dư từ sổ.
- Không sửa hoặc xoá phiếu; sai sót được xử lý bằng phiếu đảo.
- Chặn tiền mặt âm; tài khoản ngân hàng vẫn có thể âm theo đặc tả.

### F-05 Xác thực và phân quyền

- Thêm `auth.me`, ma trận quyền chín vai trò, `requireRole` và `requireProjectAccess`.
- Chuẩn hoá `extra_roles` thành JSON array và `perms` thành object theo module.
- Thêm `setup_first_admin()` để cấp quản trị một lần cho tài khoản triển khai khi bảng Users còn trống.

### A-01 Lớp Gemini JSON

- Gọi Gemini REST `v1beta`, model mặc định `gemini-3.5-flash-lite` có thể đổi bằng `GEMINI_MODEL`.
- Ép structured JSON, kiểm schema, thử lại một lần, cache theo SHA-256 trong 6 giờ và log token usage.
- API key chỉ đọc từ Script Property `GEMINI_API_KEY`.

### F-07 Khung SPA

- Thêm dashboard responsive, sidebar theo quyền, hash router, loading/error/access-denied và dark mode.
- Dùng token màu, font Be Vietnam Pro/IBM Plex Mono, touch target 44px và hỗ trợ reduced motion.

### F-08 Thư viện giao diện dùng chung

- Thêm component bảng, chip trạng thái, tab bàn phím, modal giữ focus, toast, trường form và thanh phân bổ.
- Thêm route `#style-guide` dành cho admin để xem và thao tác với toàn bộ component.
- Không gọi hộp thoại native `alert`, `confirm` hoặc `prompt`; modal và toast dùng giao diện trong trang.
- Bổ sung responsive phone, dark mode, focus-visible và reduced motion cho component.

### F-09 Client API

- Bọc `google.script.run.api(request)` bằng Promise qua `MiniERP.api.call`.
- Chuẩn hóa toàn bộ mã lỗi API thành thông báo tiếng Việt và toast dùng chung.
- Lỗi `LOCK_TIMEOUT` hiển thị nút **Thử lại** và thực hiện lại đúng action/payload ban đầu.
- Thêm kiểm thử local và Apps Script cho F-08/F-09.

### F-10 Settings & Counters

- Thêm API admin-only để đọc/lưu bảy khóa Settings đã xác nhận trong §3.1 và đọc Counters.
- Giá trị Settings được đọc trực tiếp từ Google Sheets nên có hiệu lực không cần triển khai lại.
- Thêm trang Cấu hình responsive, trạng thái tải/lưu, validation và bảng Counters chỉ đọc.
- Che giá trị `vietqr_account_no` trong AuditLog; thêm test quyền admin, validation và giao diện.

