# CHANGELOG

## 2026-10-17

### M-03 Dòng PO và ETA

- Tự tính `eta_date = order_date + lead_time_days` khi tạo hoặc sửa PO; mặc định lead-time tiếp tục lấy từ danh mục vật tư.
- Thêm `eta.list` để trả dữ liệu ETA theo dự án/trạng thái/tìm kiếm và phân loại đúng hạn, sắp trễ, trễ hoặc đã nhận.
- Thêm `eta.update` cho mua hàng sửa ETA thủ công; bắt buộc lý do, lưu `eta_source`/`eta_note` và ghi lịch sử before/after qua AuditLog.
- Hiển thị ETA và nguồn ETA trong chi tiết PO, kèm form sửa ETA không dùng hộp thoại native.

### Z-02 Thông báo trong ứng dụng và email

- Thêm API đọc thông báo chưa xem của chính tài khoản đăng nhập và đánh dấu đã đọc có kiểm tra chủ sở hữu.
- Thêm chuông thông báo, huy hiệu số lượng, danh sách điều hướng theo liên kết và tự làm mới mỗi 30 giây.
- `createNotification` gửi thêm email khi `to_user` là địa chỉ email hợp lệ; lỗi gửi email không làm mất thông báo trong ứng dụng.

### M-04 Công nợ PO và PDF

- Khi xác nhận PO, tạo Payables idempotent cho hai mẫu điều khoản đã xác nhận: `Net N` và `Cọc X%, còn lại net N`.
- Khi huỷ PO đã xác nhận, đảo các khoản phải trả chưa thanh toán; chặn huỷ nếu đã phát sinh thanh toán.
- Thêm `po.export_pdf` và nút Xuất PDF, tạo chứng từ gồm nhà cung cấp, dòng vật tư, ETA và tổng tiền trên Google Drive.

### M-05 Gantt ETA

- Thêm tab Tiến độ ETA, biểu diễn khoảng đặt hàng đến ETA, mốc hôm nay và ngày cần trên cùng một trục thời gian.
- Tô màu theo trạng thái trễ, sắp trễ, đúng tiến độ hoặc đã nhận; hỗ trợ tìm theo PO, SKU và dự án.

### K-06 Nhập kho theo PO

- Thêm `gr.scan` tìm vật tư bằng barcode/SKU và gợi ý các dòng PO còn số lượng chưa nhận.
- Thêm `gr.post` hỗ trợ nhận từng phần, cập nhật trạng thái PO và tự chuyển BOM từ đã đặt sang giữ chỗ theo dự án.
- Cho phép nhập kho chung khi không có PO và trả cảnh báo rõ ràng; toàn bộ dòng được kiểm tra trước khi bắt đầu ghi.

### T-01 Công việc dự án

- Thêm `task.list/create/update/move`, bắt buộc dự án, người phụ trách và hạn; cảnh báo nhưng không chặn khi hạn vượt hạn dự án.
- Chặn chuyển sang Đang làm khi công việc phụ thuộc chưa hoàn thành; quản lý có thể ghi đè có chủ đích.
- Áp dụng quyền `rw_own` cho kỹ sư và chặn công việc phụ thuộc chính nó.

### C-03 Phiếu chi

- Thêm `ledger.payment_create`; phiếu chi PO phân bổ vào công nợ chưa trả theo hạn gần nhất trước.
- Chặn quỹ tiền mặt âm; tài khoản ngân hàng được phép âm nhưng trả cảnh báo.

### T-02 Kanban công việc

- Thêm màn hình Công việc với bốn cột Chờ gia công, Đang làm, Chờ kiểm tra và Hoàn thành.
- Hỗ trợ kéo thả trên máy tính và nút chuyển trái/phải trên điện thoại.
- Chuyển sang QC gửi thông báo cho người kiểm tra; chỉ người kiểm tra hoặc quản lý được hoàn tất, trả về Đang làm bắt buộc lý do.
- Trả tiến độ dự án mới ngay sau mỗi lần chuyển trạng thái.

### T-03 Lịch tháng

- Thêm lịch tháng và bộ lọc dự án, tổng hợp năm nguồn: hạn công việc, ETA hàng về, đợt thanh toán, công tác đã duyệt và ngày bàn giao dự án.
- Thêm màu phân biệt từng loại sự kiện và điều hướng tháng trước/sau.

### T-04 Tiến độ dự án từ công việc

- Chuẩn hóa `calculateProjectProgress_` làm nguồn tính duy nhất theo bốn trạng thái task: 0%, 50%, 90% và 100%.
- Dùng cùng kết quả trong danh sách dự án, chi tiết dự án và phản hồi sau khi chuyển Kanban.
- Hiển thị bảng công việc thật trong tab Công việc của dự án, có liên kết mở Kanban; bổ sung sửa công việc trực tiếp trên thẻ Kanban.

## 2026-10-08

### D-03 Danh mục vật tư

- Thêm API tạo, sửa, tìm kiếm theo SKU/tên/mã vạch và nhập theo lô có bước xem trước.
- Kiểm tra lỗi theo số dòng, chặn SKU trùng và ghi 500 dòng bằng một lần chèn theo lô.
- Thêm màn hình vật tư, tìm kiếm/quét mã và nhập dữ liệu dán từ Excel hoặc file CSV.

### H-01 Hồ sơ nhân viên

- Thêm API danh sách, chi tiết, tạo, sửa và `employee.reveal` theo vai trò.
- Che CCCD và số tài khoản đối với vai trò ngoài `hr/admin`; mọi lần mở dữ liệu nhạy cảm được ghi AuditLog mà không ghi giá trị.
- Thêm màn hình danh sách/chi tiết nhân viên và dữ liệu mẫu an toàn để kiểm thử.

### H-02, B-01, B-02, B-03

- Thêm kỹ năng, chứng chỉ, liên kết tệp Drive, danh sách sắp hết hạn và bộ quét cảnh báo chống trùng.
- Thêm CRUD dự án, mã dự án tự sinh, tính tiến độ từ trạng thái task và kiểm tra quyền truy cập dự án.
- Thêm màn hình danh sách/chi tiết dự án với các tab Hồ sơ, BOM, Công việc, Thanh toán và Giá thành.
- Tạo mặc định kế hoạch thanh toán 30/50/20; khi sửa bắt buộc tổng tỷ lệ bằng 100%.

### B-04, B-05, B-06, B-07

- Thêm CRUD BOM và bất biến không cho tổng giữ chỗ, đặt mua, đã xuất vượt số lượng yêu cầu.
- Thêm nhập BOM xem trước từ Excel/CSV, báo lỗi theo dòng, cộng dồn/bỏ qua dòng trùng và giới hạn 500 dòng.
- Thêm bảng trạng thái BOM, chip ưu tiên, thanh phân bổ và bộ dữ liệu mẫu.
- Thêm API giá thành dự án tổng hợp vật tư, OT, công tác, khác, cam kết, ngân sách và biên gộp.

### K-01, K-02, K-03, K-04

- Thêm lõi tồn kho: nhập, giữ chỗ, giải phóng, điều chỉnh và thẻ kho; chặn `on_hand`/`reserved` âm hoặc bất hợp lệ.
- Thêm đối soát BOM theo ngày cần, giữ chỗ từ tồn khả dụng và tạo/cập nhật PR thiếu theo cách idempotent.
- Thêm màn hình tồn kho với ba chỉ số, cảnh báo, lọc kho/tìm kiếm và thẻ giao dịch.
- Thêm phiếu xuất theo dự án, kiểm tra giữ chỗ, ghi giá thành và huỷ bằng bút toán đảo.
- Các trường liên kết dùng danh sách gợi ý và liên kết chuyển nhanh sang màn hình tạo Khách hàng, Nhân viên, Nhà cung cấp hoặc Vật tư.

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

### D-01 CRUD Khách hàng

- Thêm API danh sách/tìm kiếm/tạo/sửa/xoá mềm khách hàng và chặn trùng mã số thuế.
- Thêm màn hình Khách hàng responsive, modal biểu mẫu, tìm kiếm và xác nhận xoá trong trang.
- Chặn xoá khách hàng đã được tham chiếu bởi dự án.

### D-02 CRUD Nhà cung cấp

- Thêm API và màn hình CRUD/tìm kiếm nhà cung cấp, lưu `payment_terms` và `avg_lead_days`.
- Chặn trùng mã số thuế, lead-time âm và xoá nhà cung cấp đã phát sinh PO/công nợ.
- Thêm `seed_sample_data()` idempotent với hai khách hàng và hai nhà cung cấp mang mã `DEMO`.

# 2026-10-09

- Sửa luồng BOM dự án mới: thêm dòng hoặc nhập hàng loạt tự động đối soát kho, tạo giữ chỗ và sinh/cập nhật PR; giao diện thông báo số giữ chỗ và PR vừa tạo.
- Mở rộng `seed_sample_data()` với PR mở, PR đã tạo PO, PO nháp, PO đã xác nhận và dòng PO liên kết dự án/BOM để kiểm thử các luồng Kho và Mua hàng.
- M-01: thêm API danh sách/tạo thủ công/huỷ PR, chuyển nhiều PR sang một PO và tab Yêu cầu mua có liên kết dữ liệu dự án, vật tư, nhà cung cấp.
- M-02: thêm API tạo/sửa/gửi/xác nhận/huỷ/xem PO, máy trạng thái hợp lệ, chỉ cộng `BOM.qty_ordered` khi PO được xác nhận và đảo lại khi huỷ.
- Thêm tab Đơn mua với chi tiết, sửa PO nháp và các thao tác trạng thái theo quyền mua hàng.
- K-05: thêm tab Phiếu xuất trong màn hình Kho, gợi ý dự án và chỉ hiển thị vật tư đang được dự án giữ chỗ; hiển thị kết quả hoặc lỗi nghiệp vụ ngay trong form.
- K-07: thêm API và giao diện kiểm kê gồm ảnh chụp tồn sổ, lưu số thực đếm, bắt buộc lý do khi thiếu, duyệt điều chỉnh, ghi chi phí hư hỏng theo dự án và tạo PR bù khi tồn sau kiểm kê thấp hơn lượng giữ chỗ.
- Bổ sung `project_id` cho `StocktakeLines` để đáp ứng quy tắc ghi hao hụt vào giá thành dự án tại đặc tả §7.3.

