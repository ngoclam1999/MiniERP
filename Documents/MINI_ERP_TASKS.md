# MINI ERP — DANH SÁCH TASK CHO AI AGENT

Tổng **64 task**, ước lượng khoảng **342 giờ làm việc của agent** (S≈2h, M≈4h, L≈8h; chưa tính thời gian chờ duyệt của người).

Cách dùng: lấy task có **Phụ thuộc** đã xong, đưa cho agent kèm prompt mẫu ở cuối tài liệu. Mỗi task nhỏ để xong trong một phiên làm việc và tự kiểm tra được.

Đặc tả chi tiết: `MINI_ERP_AGENT_SPEC.md` (cột **Mục** trỏ tới đúng đoạn cần đọc). Giao diện chuẩn: `mini-erp-ui.html`.

## Tóm tắt theo giai đoạn

| Giai đoạn | Số task | Ước lượng |
|---|---|---|
| Giai đoạn 0 · Nền tảng | 10 | 44 giờ |
| Giai đoạn 1 · Danh mục & Nhân sự gốc | 6 | 30 giờ |
| Giai đoạn 2 · Dự án & BOM | 7 | 36 giờ |
| Giai đoạn 3 · Kho | 7 | 48 giờ |
| Giai đoạn 4 · Mua hàng & ETA | 5 | 28 giờ |
| Giai đoạn 5 · Công việc & Lịch | 4 | 18 giờ |
| Giai đoạn 6 · Đơn từ & Phê duyệt | 6 | 32 giờ |
| Giai đoạn 7 · Tài chính & Công nợ | 6 | 32 giờ |
| Giai đoạn 8 · Trợ lý AI | 6 | 34 giờ |
| Giai đoạn 9 · Hoàn thiện & Triển khai | 7 | 40 giờ |

## Thứ tự gợi ý theo đợt (làm xong cả đợt mới sang đợt sau; trong một đợt có thể làm song song)

- **Đợt 1:** F-01
- **Đợt 2:** F-02
- **Đợt 3:** F-03, Z-03
- **Đợt 4:** F-04, D-04, C-01
- **Đợt 5:** F-05, F-06, A-01
- **Đợt 6:** F-07, Z-02
- **Đợt 7:** F-08, F-09
- **Đợt 8:** F-10, D-01, D-02, D-03, H-01
- **Đợt 9:** H-02, B-01, K-01
- **Đợt 10:** B-02, B-03, B-04, K-03, K-07, T-01, R-01
- **Đợt 11:** B-05, B-06, K-02, K-04, T-02, T-04, H-03, R-02, R-05, C-02, C-04
- **Đợt 12:** B-07, K-05, M-01, R-04, A-04, A-05
- **Đợt 13:** M-02, R-03
- **Đợt 14:** M-03, M-04
- **Đợt 15:** K-06, M-05, T-03, C-03
- **Đợt 16:** C-05
- **Đợt 17:** C-06, A-02
- **Đợt 18:** A-03, A-06, Z-01
- **Đợt 19:** Z-04
- **Đợt 20:** Z-05, Z-06
- **Đợt 21:** Z-07


## Giai đoạn 0 · Nền tảng

| ID | Task | Cỡ | Phụ thuộc | Mục | Xong khi |
|---|---|---|---|---|---|
| **F-01** | Dựng dự án Apps Script (clasp), cấu trúc thư mục, Git, CHANGELOG | S | — | §1.2 | Chạy được `clasp push`; có thư mục src/tests; WebApp trả trang "Hello" khi mở URL triển khai |
| **F-02** | Tạo file Google Sheets với toàn bộ tab và hàng tiêu đề theo §3 | M | F-01 | §3 | Script `setup_schema()` tạo/chuẩn hoá mọi tab; chạy lại 2 lần không lỗi, không mất dữ liệu |
| **F-03** | Lớp dữ liệu lib_db: readAll, findById, query, insert, update, softDelete, nextId | L | F-02 | §4.2 | Test chèn 1.000 dòng < 10 giây; đổi thứ tự cột vẫn chạy đúng; nextId không trùng |
| **F-04** | withLock, bộ lỗi chuẩn (apiError), router doPost/api(action) | M | F-03 | §1.3, §1.4 | Gọi action không tồn tại trả NOT_FOUND; hai request ghi đồng thời không ghi chồng nhau |
| **F-05** | Xác thực & phân quyền: Users, auth.me, requireRole, requireProjectAccess | M | F-04 | §2, §4.1 | Email ngoài danh sách bị UNAUTHENTICATED; mỗi vai trò chỉ gọi được action trong ma trận §2 |
| **F-06** | AuditLog tự động cho mọi thao tác ghi; Notifications cơ bản | S | F-04 | §1.6 | Mỗi insert/update sinh một dòng AuditLog; trường nhạy cảm không bị ghi giá trị |
| **F-07** | Khung SPA: layout, thanh điều hướng theo quyền, hash router, trạng thái tải/lỗi | L | F-05 | §1.8, §4.1 | Giao diện khớp mẫu ở 1440px và 400px; sáng/tối; menu ẩn mục không có quyền |
| **F-08** | Thư viện giao diện dùng chung: bảng, chip trạng thái, tab, modal, toast, form, thanh phân bổ | L | F-07 | §1.8 | Có trang "style guide" hiển thị đủ thành phần; không dùng alert/confirm/prompt |
| **F-09** | Client API (google.script.run bọc Promise), xử lý lỗi và toast thống nhất | S | F-07, F-04 | §1.3 | Lỗi LOCK_TIMEOUT hiện thông báo tiếng Việt và nút thử lại |
| **F-10** | Settings & Counters; trang cấu hình cho admin | S | F-05, F-08 | §3.1 | Sửa Settings có hiệu lực không cần triển khai lại; chỉ admin truy cập |

## Giai đoạn 1 · Danh mục & Nhân sự gốc

| ID | Task | Cỡ | Phụ thuộc | Mục | Xong khi |
|---|---|---|---|---|---|
| **D-01** | CRUD Khách hàng (API + màn hình) | M | F-08, F-09 | §3.2 | Tạo/sửa/tìm kiếm; trùng mã số thuế bị cảnh báo |
| **D-02** | CRUD Nhà cung cấp (kèm payment_terms, lead-time TB) | M | F-08, F-09 | §3.2 | Như D-01; lưu được điều khoản thanh toán chuẩn |
| **D-03** | Danh mục vật tư (Items) + nhập hàng loạt từ Excel + mã vạch | L | F-08, F-09 | §3.2 | Nhập 500 mã từ file < 30 giây; báo lỗi theo dòng; sku duy nhất |
| **D-04** | Danh mục kho (Warehouses) và khởi tạo 3 loại kho | S | F-03 | §3.2 | Có 3 kho mặc định; không xoá kho còn tồn |
| **H-01** | Hồ sơ nhân viên: danh sách, chi tiết, thêm/sửa (có che dữ liệu nhạy cảm) | L | F-08, F-09, F-05 | §8.1 | CCCD hiển thị che với vai trò khác hr/admin; employee.reveal ghi AuditLog |
| **H-02** | Kỹ năng & chứng chỉ nhân viên; trường file đính kèm Drive | M | H-01 | §8.2 | Thêm/sửa kỹ năng, chứng chỉ; tải file lên Drive và lưu link |

## Giai đoạn 2 · Dự án & BOM

| ID | Task | Cỡ | Phụ thuộc | Mục | Xong khi |
|---|---|---|---|---|---|
| **B-01** | Dự án: API CRUD, sinh mã DA-YYMM-NN, trạng thái | M | D-01, F-05 | §5.1 | Tạo dự án sinh đúng mã; không xoá được dự án đã phát sinh giao dịch |
| **B-02** | Màn hình Dự án: thẻ chọn dự án + chi tiết các tab + hồ sơ | L | B-01, F-08 | §5.1 | Khớp mẫu; tiến độ tính từ task |
| **B-03** | Các đợt thanh toán của dự án (mặc định 30/50/20, kiểm tổng 100%) | M | B-01 | §5.1, §5.5 | Sửa tỷ lệ tổng ≠ 100% bị VALIDATION; số tiền đợt tính đúng theo giá trị hợp đồng |
| **B-04** | BOM: thêm/sửa/xoá dòng, tính qty_short, kiểm tra bất biến | M | B-01, D-03 | §3.3, §5.2 | Không thể lưu BOM làm qty_short < 0 |
| **B-05** | Nhập BOM: xem trước → xác nhận (dán Excel/CSV/xlsx), tạo nhanh mã vật tư | L | B-04 | §5.2 | File mẫu 8 dòng báo đúng lỗi và lưu 6 dòng hợp lệ; một bản ghi AuditLog |
| **B-06** | Bảng BOM: thanh phân bổ 4 đoạn, chip trạng thái, bộ lọc | M | B-04, F-08 | §5.4 | Hiển thị đúng 5 trạng thái ưu tiên; khớp mẫu |
| **B-07** | Giá thành dự án: ghi ProjectCosts + API project.cost + tab Giá thành | M | B-01, K-04 | §5.6 | Xuất kho/duyệt OT/duyệt công tác đều làm giá thành đổi đúng; huỷ thì trả lại |

## Giai đoạn 3 · Kho

| ID | Task | Cỡ | Phụ thuộc | Mục | Xong khi |
|---|---|---|---|---|---|
| **K-01** | StockBalance, StockMovements, StockReservations: hàm lõi (reserve, release, issue, receive, adjust) | L | F-03, D-03, D-04 | §3.4, §7 | Test đơn vị cho từng hàm; on_hand và reserved không bao giờ âm |
| **K-02** | Đối soát BOM với kho: giữ chỗ tự động + sinh PR (idempotent) | L | K-01, B-04 | §5.3 | Kịch bản 5 PLC / dự án A,B đúng; chạy lại 2 lần không đổi kết quả |
| **K-03** | Màn hình Tồn kho: 3 chỉ số, thẻ giữ chỗ theo dự án, cảnh báo hết/dưới mức, thẻ kho | M | K-01, F-08 | §7.1 | Khả dụng = thực tế − giữ chỗ; lọc kho/tìm kiếm hoạt động |
| **K-04** | Phiếu xuất kho: chỉ xuất vật tư đã giữ chỗ đúng dự án; trừ tồn; ghi giá thành; huỷ bằng bút toán đảo | L | K-01, B-04 | §7.2 | Đạt cả ca thành công và ca bị từ chối STOCK_NOT_RESERVED / STOCK_INSUFFICIENT |
| **K-05** | Màn hình Phiếu xuất (form + thông báo kết quả như mẫu) | M | K-04, F-08 | §7.2 | Khớp mẫu; thông báo lỗi nêu rõ dự án và số lượng đang giữ |
| **K-06** | Nhập kho bằng quét mã: tìm theo barcode/sku, gợi ý dòng PO, nhập một phần | L | K-01, M-03 | §6.4 | Nhận 4/6 servo → PO partial, BOM giữ chỗ +4; dùng được trên điện thoại |
| **K-07** | Kiểm kê: tạo phiếu, nhập thực đếm, lý do, duyệt điều chỉnh (chặn làm on_hand < reserved) | L | K-01, F-08 | §7.3 | Chênh lệch âm bắt buộc lý do; ca on_hand < reserved sinh danh sách dự án ảnh hưởng và PR bù |

## Giai đoạn 4 · Mua hàng & ETA

| ID | Task | Cỡ | Phụ thuộc | Mục | Xong khi |
|---|---|---|---|---|---|
| **M-01** | PR: danh sách, tạo thủ công, huỷ; tab PR trên màn hình mua hàng | M | K-02, F-08 | §6.1 | PR tự sinh từ BOM hiển thị đủ; nút Tạo PO hoạt động |
| **M-02** | PO: tạo từ PR (gộp theo NCC), sửa, gửi, xác nhận, huỷ; máy trạng thái | L | M-01, D-02 | §6.2 | Chuyển trạng thái sai bị INVALID_STATE; xác nhận PO mới cộng qty_ordered vào BOM |
| **M-03** | Dòng PO: unit_price, lead_time, tính ETA, sửa tay ETA có lịch sử | M | M-02 | §6.2, §6.3 | eta = order + lead; sửa tay ghi before/after |
| **M-04** | Tạo Payables từ điều khoản thanh toán PO; xuất PDF PO | M | M-02, C-01 | §6.2 | PO "Cọc 30%, còn lại net 15" sinh đúng 2 khoản phải trả |
| **M-05** | Màn hình Theo dõi ETA (Gantt, vạch cần lắp, màu đỏ/vàng/xanh) và tab PO | L | M-03, F-08 | §6.3 | Khớp mẫu; màu theo quy tắc đỏ/vàng/xanh/xanh lá |

## Giai đoạn 5 · Công việc & Lịch

| ID | Task | Cỡ | Phụ thuộc | Mục | Xong khi |
|---|---|---|---|---|---|
| **T-01** | Task: API CRUD, move, ràng buộc phụ thuộc và hạn dự án | M | B-01, H-01 | §11.1 | Task phụ thuộc chưa xong không chuyển được sang doing (trừ manager) |
| **T-02** | Kanban: 4 cột, kéo thả, nút ‹ › cho điện thoại, thông báo QC | L | T-01, F-08 | §11.2 | Kéo thả cập nhật DB; chuyển qc gửi Notification; cập nhật tiến độ dự án |
| **T-03** | Lịch tháng: 5 loại sự kiện, lọc theo dự án | M | T-01, M-03, B-03 | §11.3 | Hiển thị đúng sự kiện từ Tasks/POLines/Payments/Trips/Projects |
| **T-04** | Tiến độ dự án % từ task, hiển thị ở mọi nơi dùng chung một hàm | S | T-01 | §5.1 | Một nguồn tính duy nhất; test với 4 trạng thái |

## Giai đoạn 6 · Đơn từ & Phê duyệt

| ID | Task | Cỡ | Phụ thuộc | Mục | Xong khi |
|---|---|---|---|---|---|
| **H-03** | Tải việc nhân viên + gợi ý phân công top 3 | M | T-01, H-02 | §8.3 | Loại người nghỉ/công tác, chứng chỉ hết hạn; trả điểm và lý do |
| **R-01** | Đơn từ: mô hình dữ liệu + API tạo đơn 4 loại + kiểm tra hợp lệ | M | H-01, B-01 | §9.1 | Mỗi loại đơn kiểm tra trường bắt buộc; nghỉ phép kiểm tra số ngày phép |
| **R-02** | Luồng duyệt 2 cấp, người duyệt theo dự án/quản lý, ủy quyền, không tự duyệt | L | R-01, F-06 | §9.2 | Từ chối bắt buộc lý do; không tự duyệt đơn của mình; nhắc đơn quá 24 giờ |
| **R-03** | Hiệu ứng khi duyệt: Attendance, PayrollInputs, ProjectCosts, chi dự kiến; đảo ngược được | L | R-02, B-07 | §9.3 | Duyệt OT 3 giờ làm lương và giá thành tăng đúng; gọi duyệt hai lần không cộng đôi |
| **R-04** | Màn hình Đơn từ: hộp thư chờ duyệt, tất cả đơn, thanh bước duyệt | M | R-02, F-08 | §9.2 | Khớp mẫu; đổi vai trò đổi hộp thư |
| **R-05** | Form tạo đơn theo loại + tự tính chi phí/trợ cấp công tác | M | R-01, F-08 | §9.1 | Trợ cấp = ngày × đơn giá cấu hình; tổng cập nhật tức thời |

## Giai đoạn 7 · Tài chính & Công nợ

| ID | Task | Cỡ | Phụ thuộc | Mục | Xong khi |
|---|---|---|---|---|---|
| **C-01** | Sổ quỹ: CashAccounts, CashLedger, số dư tính từ sổ, số phiếu liên tục | M | F-03 | §10.5 | Số dư = đầu kỳ + thu − chi; không sửa/xoá phiếu, chỉ đảo |
| **C-02** | Phiếu thu theo đợt dự án + gạch nợ ProjectPayments/Receivables trong một khóa | L | C-01, B-03 | §10.3 | Lập phiếu thu → đợt Đã thu, công nợ giảm, quỹ tăng; thu thiếu giữ phần còn lại |
| **C-03** | Phiếu chi (mua vật tư, trợ cấp, lương); chặn tiền mặt âm; cập nhật Payables | M | C-01, M-04 | §10.5 | Chi vượt tiền mặt bị chặn; gắn PO cập nhật paid_vnd |
| **C-04** | VietQR: cấu hình ngân hàng, tạo URL ảnh, nội dung CK, modal + nút sao chép | M | B-03, F-10 | §10.2 | Thiếu cấu hình báo lỗi rõ; ảnh QR hiển thị đúng số tiền và nội dung |
| **C-05** | Công nợ phải thu/phải trả và bảng tuổi nợ 5 nhóm; xem theo dự án | M | C-02, C-03 | §10.4 | Phân nhóm tuổi nợ đúng ở các ngày biên 0/30/60/90 |
| **C-06** | Màn hình Tài chính: 3 tab (Đợt thanh toán, Công nợ, Sổ quỹ) + form lập phiếu | L | C-02, C-04, C-05, F-08 | §10 | Khớp mẫu; thao tác lập phiếu thu chạy trọn vòng |

## Giai đoạn 8 · Trợ lý AI

| ID | Task | Cỡ | Phụ thuộc | Mục | Xong khi |
|---|---|---|---|---|---|
| **A-01** | Lớp lib_ai: gọi Gemini, ép JSON, kiểm schema, retry 1 lần, cache theo hash, ghi token | M | F-04 | §12.1 | Đầu ra sai schema được thử lại rồi trả AI_ERROR; cache hoạt động |
| **A-02** | AIAlerts + engine cảnh báo bằng quy tắc (ETA trễ/sát hạn, tồn thấp, quá hạn, chứng chỉ) | L | M-03, K-03, C-05, H-02 | §12.2, §8.2 | Fingerprint chống trùng; cảnh báo tự resolved khi hết điều kiện |
| **A-03** | Trigger quét hằng ngày + Gemini viết đề xuất + thông báo/email mức đỏ | M | A-01, A-02 | §12.2 | Cảnh báo đỏ ETA servo xuất hiện sau lần quét; email gửi cho QLDA và mua hàng |
| **A-04** | Bóc tách BOM từ file thiết kế bằng AI + khớp mã + đưa vào màn xem trước | L | A-01, B-05 | §12.3 | ≥ 90% dòng khớp đúng ở bộ mẫu 30 dòng; dòng không chắc tô vàng |
| **A-05** | Gợi ý nhận xét duyệt đơn (rủi ro + nhận xét đề xuất) | S | A-01, R-02 | §12.5 | Chỉ điền vào ô nhận xét, không tự duyệt |
| **A-06** | Khung chat Trợ lý AI + 3 câu hỏi mẫu + báo cáo tuần tự động thứ Hai | L | A-01, A-02, T-04 | §12.6 | Trả lời dựa trên ngữ cảnh tổng hợp bằng code; email báo cáo tuần gửi đúng giờ |

## Giai đoạn 9 · Hoàn thiện & Triển khai

| ID | Task | Cỡ | Phụ thuộc | Mục | Xong khi |
|---|---|---|---|---|---|
| **Z-01** | Bảng điều khiển: dashboard.summary (cache 60s) + màn hình tổng quan | L | A-02, C-05, T-04, R-04 | §13 | Khớp mẫu; tải < 3 giây |
| **Z-02** | Thông báo: chuông trong ứng dụng + email, đánh dấu đã đọc | M | F-06 | §9.2 | Thông báo mới hiện không cần tải lại trang (thăm dò 30 giây) |
| **Z-03** | Sao lưu hằng đêm sang Drive, giữ 30 bản; lưu trữ theo năm các bảng lịch sử | M | F-02 | §14 NF-3, NF-4 | Khôi phục thử từ một bản sao lưu thành công |
| **Z-04** | Kiểm thử E2E theo 7 kịch bản §15 trên dữ liệu thử | L | Z-01, C-06, R-03, K-06, A-03 | §15 | Cả 7 kịch bản qua; ghi biên bản vào docs/ |
| **Z-05** | Rà soát hiệu năng (50.000 dòng), truy cập (WCAG AA), thử trên điện thoại + máy quét mã | M | Z-04 | §14 | Đạt NF-1, NF-5, NF-6; danh sách lỗi tồn đọng được phân loại |
| **Z-06** | Nhập dữ liệu thật ban đầu (danh mục, nhân sự, tồn kho đầu kỳ, công nợ đầu kỳ) + đào tạo | L | Z-04 | §3 | Số tồn và số dư quỹ đầu kỳ khớp sổ sách của công ty; biên bản bàn giao |
| **Z-07** | Triển khai bản chính thức, phân quyền người dùng, tài liệu hướng dẫn ngắn | M | Z-05, Z-06 | §2 | Mỗi vai trò có người dùng thử đăng nhập đúng quyền |

---

## Prompt mẫu giao việc cho AI Agent

```
Bạn là lập trình viên Google Apps Script + HTML/JS. Dự án: Mini ERP chế tạo máy.
Tài liệu: MINI_ERP_AGENT_SPEC.md (đặc tả), mini-erp-ui.html (giao diện chuẩn), MINI_ERP_TASKS.md (task).

NHIỆM VỤ: thực hiện task <ID> — <Tên task>.
- Đọc kỹ mục <Mục> trong đặc tả và §0 (quy tắc), §1 (quy ước chung).
- Chỉ làm đúng phạm vi task. Nếu thấy thiếu thông tin, ghi giả định vào cuối báo cáo, không tự mở rộng phạm vi.
- Tiêu chí hoàn thành: <Xong khi>.
- Viết hàm test_<tên>() chạy được trong Apps Script editor, gồm cả ca sai.
- Cập nhật CHANGELOG.md.

BÁO CÁO khi xong: (1) file đã sửa, (2) cách chạy test và kết quả, (3) giả định/điểm tồn đọng.
```

## Mẹo quản lý

- Giao **một task một phiên** để dễ kiểm tra; yêu cầu agent báo cáo theo mẫu trên.
- Sau mỗi đợt, chạy lại kịch bản E2E tương ứng ở §15 của đặc tả trước khi sang đợt sau.
- Đổi lược đồ dữ liệu phải qua task có ghi rõ và cập nhật §3, tránh để nhiều agent sửa lệch nhau.
- Mốc kiểm tra đề xuất: sau **F-10** (nền tảng chạy), sau **K-04** (luồng vật tư cốt lõi), sau **R-03** (luồng đơn → lương/giá thành), sau **C-06** (tiền), sau **A-03** (AI), cuối cùng **Z-04** (E2E).
