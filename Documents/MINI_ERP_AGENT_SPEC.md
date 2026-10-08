# MINI ERP CHẾ TẠO MÁY — ĐẶC TẢ CHO AI AGENT

Tài liệu này là nguồn sự thật duy nhất để AI Agent lập trình hệ thống. Mỗi task trong `MINI_ERP_TASKS.md` trỏ tới một mục ở đây (ví dụ `§5.2`). Giao diện mẫu (`mini-erp-ui.html`) là chuẩn về bố cục và luồng thao tác.

---

## 0. QUY TẮC LÀM VIỆC CỦA AGENT

1. Mỗi lần chỉ làm **một task**. Đọc mục đặc tả được trỏ tới, rồi mới viết code.
2. Không đổi tên sheet hoặc cột đã định nghĩa ở §3. Cần thêm cột: thêm vào cuối bảng, ghi vào `CHANGELOG.md`, cập nhật §3.
3. Mọi ghi dữ liệu đi qua `withLock()` (§1.4) và ghi `AuditLog` (§1.6).
4. Mỗi hàm API có test mẫu (một hàm `test_<tên>()` chạy được trong Apps Script editor) và đạt đủ **Tiêu chí nghiệm thu** của task.
5. Không hard-code khóa API, số tài khoản ngân hàng, email. Đặt trong **Script Properties** hoặc sheet `Settings`.
6. Không xóa dữ liệu thật. Dùng cờ `deleted_at` (xóa mềm).
7. Mọi chuỗi giao diện bằng tiếng Việt; mã, tên cột, tên hàm bằng tiếng Anh `snake_case`.
8. Task xong phải kèm: danh sách file đã sửa, cách kiểm tra, các điểm còn tồn đọng.

---

## 1. KIẾN TRÚC VÀ QUY ƯỚC CHUNG

### 1.1 Ngăn xếp

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| CSDL | Google Sheets | Mỗi tab là một bảng; hàng 1 là tên cột |
| Backend | Google Apps Script (V8) | `doGet` phục vụ giao diện, `doPost` là API |
| Frontend | HTML5 + Tailwind (CDN) + JS thuần | SPA, hash routing (`#projects`) |
| AI | Gemini API qua `UrlFetchApp` | Khóa lưu ở Script Properties |
| QR | VietQR (`img.vietqr.io`) | Chỉ ghép URL ảnh, không gọi API trả phí |

### 1.2 Cấu trúc thư mục mã nguồn (clasp)

```
/src
  Code.gs            // doGet, doPost, router
  api_*.gs           // mỗi module một file: api_projects.gs, api_inventory.gs ...
  lib_db.gs          // đọc/ghi sheet, cache, lock
  lib_auth.gs        // đăng nhập, phân quyền
  lib_ai.gs          // gọi Gemini
  triggers.gs        // trigger theo lịch
  Index.html         // khung SPA
  css.html js_*.html // giao diện (include bằng HtmlService)
/tests               // test_*.gs
CHANGELOG.md
```

### 1.3 Hợp đồng API

Một endpoint duy nhất. Frontend gọi `google.script.run.api(request)` (ưu tiên) hoặc `fetch` tới `doPost`.

```json
// Request
{ "action": "project.list", "payload": { "status": "active" }, "client_ts": "2026-10-06T07:51:00+07:00" }
// Response thành công
{ "ok": true, "data": [ ... ], "meta": { "total": 4 } }
// Response lỗi
{ "ok": false, "error": { "code": "STOCK_NOT_RESERVED", "message": "Vật tư chưa giữ chỗ cho dự án DA-2609-01", "field": "sku" } }
```

Quy ước tên action: `<module>.<verb>` — `project.create`, `bom.import`, `stock.issue`, `po.create`, `request.approve`...

Mã lỗi chuẩn: `UNAUTHENTICATED`, `FORBIDDEN`, `VALIDATION`, `NOT_FOUND`, `CONFLICT`, `LOCK_TIMEOUT`, `STOCK_NOT_RESERVED`, `STOCK_INSUFFICIENT`, `INVALID_STATE`, `AI_ERROR`, `INTERNAL`.

### 1.4 Khóa ghi (LockService)

```js
function withLock(fn, timeoutMs = 20000) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(timeoutMs)) throw apiError('LOCK_TIMEOUT', 'Hệ thống đang bận, thử lại sau vài giây');
  try { return fn(); } finally { lock.releaseLock(); }
}
```

Mọi action **ghi** bọc trong `withLock`. Action **đọc** không khóa. Giữ khóa tối đa vài giây: đọc dữ liệu cần thiết trước, tính toán, ghi một lần bằng `setValues` theo lô.

### 1.5 Quy ước dữ liệu

| Loại | Quy ước |
|---|---|
| Khóa chính | Chuỗi có tiền tố, sinh bởi `nextId(prefix)` từ sheet `Counters`. Ví dụ `DA-2609-01`, `PO-2610-007`, `REQ-0231` |
| Mã dự án | `DA-YYMM-NN` (YY MM là tháng bắt đầu, NN tăng theo tháng) |
| Ngày | `YYYY-MM-DD` (chuỗi). Giờ: ISO 8601 có múi `+07:00` |
| Tiền | Số nguyên VND, không thập phân. Cột tiền kết thúc bằng `_vnd` |
| Số lượng | Số, tối đa 3 chữ số thập phân |
| Trạng thái | Chuỗi chữ thường `snake_case`, liệt kê ở từng module |
| Xóa | `deleted_at` (rỗng = còn dùng) |
| Dấu vết | Mọi bảng có `created_at, created_by, updated_at, updated_by` ở **4 cột cuối** |

### 1.6 AuditLog

Mỗi lần ghi: một dòng `AuditLog(ts, user, action, entity, entity_id, before_json, after_json)`. Không ghi dữ liệu nhạy cảm đầy đủ (CCCD, số tài khoản) vào `before/after`, chỉ ghi tên trường đã đổi.

### 1.7 Hiệu năng và giới hạn Apps Script

- Đọc cả vùng dữ liệu bằng một `getValues()`, lọc trong bộ nhớ. Không đọc từng ô trong vòng lặp.
- Cache bảng danh mục (Items, Customers, Suppliers, Employees) bằng `CacheService` 5 phút; xóa cache khi ghi.
- Một lần chạy tối đa 6 phút: tác vụ dài (quét AI toàn bộ, nhập BOM lớn) chia lô 200 dòng hoặc chạy bằng trigger.
- Google Sheets tối đa 10 triệu ô: bảng lịch sử lớn (`StockMovements`, `AuditLog`) có tác vụ lưu trữ theo năm (task NF-3).
- `UrlFetchApp`: tối đa 20.000 lượt/ngày (tài khoản miễn phí). AI chỉ gọi khi cần, có cache kết quả theo hash dữ liệu đầu vào.

### 1.8 Giao diện (theo `mini-erp-ui.html`)

- Thanh điều hướng trái (tối), vùng làm việc phải, thanh trên có vai trò, nút **Trợ lý AI**, chuyển sáng/tối.
- Bảng dày thông tin, trạng thái dùng **chip màu** (xanh = tốt, vàng = cần chú ý, đỏ = nguy cấp, xanh dương = đang xử lý).
- Phone: thanh điều hướng thành dải ngang; bảng cuộn ngang trong khung; nút tối thiểu 36px.
- Font `Be Vietnam Pro` (chữ) và `IBM Plex Mono` (mã, số hiệu). Số cột số căn phải, dùng `tabular-nums`.
- Màu qua biến CSS (token), có đủ chế độ sáng và tối. Không dùng màu chữ cố định.
- Mọi form có nhãn `<label>`, `id` ổn định, báo lỗi ngay dưới trường, thông báo thành công bằng toast.
- Không dùng `alert/confirm/prompt`. Xác nhận xóa bằng hộp thoại trong trang.

---

## 2. VAI TRÒ VÀ PHÂN QUYỀN

Vai trò lưu ở `Users.role`. Một người có một vai trò chính, có thể thêm `extra_roles`.

| Vai trò | Mã | Phạm vi |
|---|---|---|
| Quản trị | `admin` | Toàn quyền, cấu hình |
| Giám đốc | `director` | Xem tất cả, duyệt cấp cao, xem tài chính |
| Quản lý dự án / Trưởng phòng | `manager` | Dự án mình phụ trách, duyệt đơn cấp 1 |
| Kỹ thuật | `engineer` | Nhập BOM, lập phiếu xuất, cập nhật task |
| Mua hàng | `purchasing` | PR, PO, ETA, NCC |
| Thủ kho | `warehouse` | Nhập, xuất, kiểm kê |
| Kế toán | `accountant` | Công nợ, sổ quỹ, VietQR, ghi nhận đơn cấp 2 (chi) |
| Nhân sự | `hr` | Hồ sơ nhân sự đầy đủ, ghi nhận đơn cấp 2 |
| Nhân viên | `employee` | Hồ sơ mình, đơn của mình, task được giao |

Ma trận (R = xem, W = ghi, A = duyệt, `own` = chỉ của mình, `proj` = dự án mình phụ trách):

| Module | admin | director | manager | engineer | purchasing | warehouse | accountant | hr | employee |
|---|---|---|---|---|---|---|---|---|---|
| Dự án, BOM | RW | R | RW proj | RW | R | R | R | – | R proj |
| Task | RW | R | RW proj | RW own | R | R | – | R | RW own |
| PR/PO/ETA | RW | R | R | R | RW | R | R | – | – |
| Kho | RW | R | R | R | R | RW | R | – | – |
| Hồ sơ nhân sự (đủ) | RW | R | R tóm tắt | – | – | – | – | RW | R own |
| Đơn từ | RW | A | A cấp 1 | W own | W own | W own | A cấp 2 (chi) | A cấp 2 | W own |
| Công nợ, sổ quỹ | RW | R | – | – | R AP | – | RW | – | – |
| AI Agent | RW | R | R | R | R | R | R | R | – |

Quy tắc kỹ thuật:
- Xác thực bằng `Session.getActiveUser().getEmail()`, khớp `Users.email`. Không có trong `Users` → `UNAUTHENTICATED`.
- Mọi action kiểm tra quyền ở đầu hàm bằng `requireRole(ctx, [...])` và, nếu cần, `requireProjectAccess(ctx, projectId)`.
- Dữ liệu nhạy cảm (CCCD, lương, số tài khoản) trả về dạng che (`079•••••••312`) trừ `hr`, `admin`. Có action riêng `employee.reveal` ghi AuditLog.

---

## 3. LƯỢC ĐỒ DỮ LIỆU (GOOGLE SHEETS)

Quy ước cột: `*` = bắt buộc. Bốn cột dấu vết cuối bảng (`created_at, created_by, updated_at, updated_by`) và `deleted_at` có ở **mọi bảng**, không nhắc lại.

### 3.1 Hệ thống

| Sheet | Cột |
|---|---|
| `Settings` | `key*, value, note` — ví dụ `ot_multiplier_weekday=1.5`, `trip_allowance_per_day=300000`, `vietqr_bank_id`, `vietqr_account_no`, `vietqr_account_name`, `alert_soon_days=4`, `ai_scan_hour=6` |
| `Users` | `email*, emp_id*, role*, extra_roles, status(active/inactive)` |
| `Counters` | `prefix*, period*, last_seq*` |
| `AuditLog` | `ts, user, action, entity, entity_id, before_json, after_json` |
| `Notifications` | `id*, to_user*, title, body, link, read_at` |
| `AIAlerts` | `id*, type*(eta_late/stock_low/cert_expiry/overdue/...), severity*(info/warn/bad), project_id, ref_id, title*, body, status(open/ack/resolved), fingerprint*` |

### 3.2 Danh mục

| Sheet | Cột |
|---|---|
| `Customers` | `cust_id*, name*, tax_code, contact_name, phone, email, address, note` |
| `Suppliers` | `sup_id*, name*, tax_code, contact_name, phone, email, address, payment_terms, avg_lead_days, note` |
| `Items` | `sku*, name*, category(plc/servo/sensor/cylinder/mech/electrical/consumable/other), unit*, spec, min_stock, default_sup_id, lead_time_days, avg_cost_vnd, wh_type*(common/consumable/finished), barcode` |
| `Warehouses` | `wh_id*, name*, wh_type*` |

### 3.3 Dự án và BOM

| Sheet | Cột |
|---|---|
| `Projects` | `project_id*, name*, cust_id*, contract_value_vnd*, start_date*, due_date*, pm_emp_id*, budget_vnd, status*(draft/active/on_hold/done/cancelled), note` |
| `ProjectPayments` | `pay_id*, project_id*, seq*, name*, percent*, amount_vnd*, due_date*, status*(pending/paid), paid_date, receipt_no` |
| `BOM` | `bom_id*, project_id*, sku*, qty_required*, need_date*, qty_reserved, qty_ordered, qty_issued, note` (4 chỉ số trạng thái nằm ở `qty_*`; `qty_short` là **cột tính**, không lưu) |

Công thức bất biến (kiểm tra sau mỗi lần ghi BOM):
`qty_short = qty_required − qty_issued − qty_reserved − qty_ordered ≥ 0`.

### 3.4 Kho

| Sheet | Cột |
|---|---|
| `StockBalance` | `sku*, wh_id*, qty_on_hand*, qty_reserved*` — `qty_available = on_hand − reserved` (tính) |
| `StockReservations` | `res_id*, project_id*, sku*, wh_id*, qty*, status(active/released/consumed)` |
| `StockMovements` | `mv_id*, ts*, type*(receipt/issue/adjust/transfer/reserve/release), sku*, wh_id*, qty*, unit_cost_vnd, project_id, ref_doc, note` |
| `GoodsReceipts` | `gr_id*, po_id, sup_id, ts*, status(draft/posted)` + `GoodsReceiptLines(line_id, gr_id, po_line_id, sku, qty, project_id)` |
| `IssueNotes` | `px_id*, project_id*, ts*, status(draft/posted/cancelled)` + `IssueLines(line_id, px_id, sku, qty, unit_cost_vnd)` |
| `Stocktakes` | `kk_id*, wh_id*, date*, status(counting/approved)` + `StocktakeLines(line_id, kk_id, sku, qty_book, qty_counted, reason)` |

### 3.5 Mua hàng

| Sheet | Cột |
|---|---|
| `PR` | `pr_id*, project_id*, sku*, qty*, need_date*, status*(open/po_created/cancelled), source(bom_auto/manual)` |
| `PO` | `po_id*, sup_id*, order_date*, payment_terms, currency(VND), status*(draft/sent/confirmed/in_transit/partial/received/cancelled), total_vnd` |
| `POLines` | `line_id*, po_id*, sku*, project_id*, pr_id, qty*, unit_price_vnd*, lead_time_days*, eta_date*, need_date*, qty_received` |

`eta_date = order_date + lead_time_days`, người dùng có thể sửa tay (ghi `eta_source = manual`).

### 3.6 Nhân sự

| Sheet | Cột |
|---|---|
| `Employees` | `emp_id*, full_name*, dob, gender, phone, address, dept, position, contract_type, contract_start, contract_end, insurance_no, bank_name, bank_account, emergency_name, emergency_phone, status` |
| `EmployeeSensitive` | `emp_id*, id_card_no, tax_code` (tách riêng, chỉ `hr/admin` đọc) |
| `EmployeeSkills` | `id*, emp_id*, skill*, level(1-5)` |
| `EmployeeCerts` | `id*, emp_id*, name*, issued_date, expiry_date, file_url` |

### 3.7 Công việc

| Sheet | Cột |
|---|---|
| `Tasks` | `task_id*, project_id*, title*, type*(machining/electrical_cabinet/plc/assembly/commissioning/design/other), assignee_emp_id*, start_date, due_date*, status*(wait/doing/qc/done), progress_pct, depends_on, priority(low/normal/high), qc_by` |

### 3.8 Đơn từ

| Sheet | Cột |
|---|---|
| `Requests` | `req_id*, type*(leave/late_early/ot/trip), emp_id*, project_id, from_date*, to_date, hours, reason, handover_emp_id, status*(pending_l1/pending_l2/approved/rejected/cancelled), current_step*` |
| `RequestApprovals` | `id*, req_id*, step*(1,2), approver, decision(approved/rejected), comment, ts` |
| `TripExpenses` | `id*, req_id*, category(transport/hotel/meal/other), amount_vnd*, receipt_url` |
| `Attendance` | `id*, emp_id*, date*, type(leave/late/early/ot/trip), hours, project_id, req_id` |
| `PayrollInputs` | `id*, month*(YYYY-MM), emp_id*, ot_hours, ot_amount_vnd, allowance_vnd, leave_days, req_ids` |

### 3.9 Tài chính

| Sheet | Cột |
|---|---|
| `CashAccounts` | `acct_id*, name*, type(cash/bank), opening_balance_vnd*` |
| `CashLedger` | `no*(PT-/PC-), date*, kind*(in/out), acct_id*, amount_vnd*, project_id, party_type(customer/supplier/employee/other), party_id, pay_id, po_id, req_id, description*` |
| `Payables` | `ap_id*, sup_id*, ref*, po_id, amount_vnd*, due_date*, paid_vnd` |
| `Receivables` | `ar_id*, cust_id*, ref*, project_id, pay_id, amount_vnd*, due_date*, received_vnd` |

`ProjectPayments` sinh `Receivables` tự động khi đến hạn 7 ngày (hoặc khi tạo, tùy cấu hình `ar_mode`).

### 3.10 Giá thành

`ProjectCosts` (chỉ ghi bằng hệ thống): `id*, project_id*, kind*(material/ot/trip/other), amount_vnd*, ref_type, ref_id, ts`. Tổng theo `project_id` là giá thành thực tế.

---

## 4. MODULE 0 — NỀN TẢNG

### 4.1 Đăng nhập và khung giao diện
- `auth.me` trả `{email, emp_id, name, role, perms}`. Frontend gọi khi tải trang để dựng menu theo quyền.
- Khung SPA: thanh trái, thanh trên, `#view`; router theo hash; trạng thái tải (skeleton) và trạng thái lỗi có nút thử lại.
- **Nghiệm thu:** người không thuộc `Users` thấy trang "Chưa được cấp quyền" kèm email để liên hệ quản trị. Đổi vai trò trong `Users` thì menu đổi sau khi tải lại.

### 4.2 Lớp truy cập dữ liệu `lib_db.gs`
Hàm tối thiểu: `readAll(sheet)`, `findById(sheet, id)`, `query(sheet, predicate)`, `insert(sheet, obj)`, `insertMany`, `update(sheet, id, patch)`, `softDelete`, `nextId(prefix)`.
- Ánh xạ cột theo **tên** ở hàng 1, không theo thứ tự.
- Tự điền 4 cột dấu vết, bỏ qua dòng `deleted_at`.
- **Nghiệm thu:** chèn 1.000 dòng trong dưới 10 giây; thay đổi thứ tự cột không làm hỏng; `nextId('PO')` không trùng khi gọi đồng thời hai lần (test bằng hai trigger).

---

## 5. MODULE 1 — DỰ ÁN VÀ BOM

### 5.1 Hồ sơ dự án
Màn hình: danh sách (thẻ chọn dự án + tiến độ) và chi tiết có các tab `BOM & Vật tư`, `Công việc`, `Thanh toán`, `Giá thành`, `Hồ sơ` (xem mẫu giao diện).
Action: `project.list`, `project.get`, `project.create`, `project.update`, `project.set_status`.

Quy tắc:
- `due_date ≥ start_date`; `contract_value_vnd > 0`.
- Khi tạo: sinh `project_id`, tạo 3 đợt thanh toán mặc định 30% / 50% / 20% (sửa được, tổng phải bằng 100%).
- `progress` = trung bình có trọng số của task: `wait=0, doing=0.5, qc=0.9, done=1` (xem `progOf` trong mẫu). Không lưu, tính khi đọc.
- Dự án có phát sinh xuất kho hoặc thu tiền thì không cho xóa, chỉ `cancelled`.

**Nghiệm thu:** tạo dự án mới → xuất hiện ở danh sách, có 3 đợt thanh toán, tổng 100%; sửa thành 40/40/30 bị từ chối với lỗi `VALIDATION` ở trường `percent`.

### 5.2 Nhập BOM
Action: `bom.import_preview(rows)`, `bom.import_commit(project_id, rows)`, `bom.add_line`, `bom.update_line`, `bom.delete_line`.
Nguồn nhập: dán từ Excel, tải file `.xlsx/.csv` theo mẫu (cột: `sku, qty_required, need_date, note`), hoặc **bóc tách bằng AI** (§12.3).

Quy tắc:
- Bước **xem trước** bắt buộc: hiển thị dòng hợp lệ, dòng lỗi (sku không có trong `Items`, số lượng ≤ 0, ngày sai), dòng trùng (cộng dồn hoặc bỏ qua theo lựa chọn).
- `sku` lạ: cho phép "tạo nhanh mã vật tư" ngay trong màn hình xem trước.
- Commit trong **một lần khóa**; sau commit chạy **đối soát kho** (§5.3).
- Giới hạn 500 dòng mỗi lần.

**Nghiệm thu:** file mẫu 8 dòng (1 sku lạ, 1 số lượng âm) → xem trước báo đúng 2 lỗi, commit 6 dòng hợp lệ, `AuditLog` có một bản ghi.

### 5.3 Đối soát BOM với kho và sinh PR (trái tim hệ thống)
Action: `bom.reconcile(project_id)`; tự chạy sau `bom.import_commit`, `bom.update_line`, và khi hàng về kho.

Thuật toán cho mỗi dòng BOM theo thứ tự `need_date` tăng dần:
1. `need_left = qty_required − qty_issued − qty_reserved − qty_ordered`. Nếu ≤ 0 thì bỏ qua.
2. `avail = on_hand − reserved` của `sku` (cộng các kho loại `common` và `consumable`).
3. `take = min(need_left, avail)`. Nếu `take > 0`: tạo `StockReservations(active)`, cộng `StockBalance.qty_reserved`, `BOM.qty_reserved += take`, ghi `StockMovements(type=reserve)`.
4. `short = need_left − take`. Nếu `short > 0`: tìm `PR` đang `open` của cùng `project_id + sku`; có thì **cập nhật số lượng**, chưa có thì tạo mới `PR(source=bom_auto, need_date = BOM.need_date − Items.lead_time_days nếu trễ thì ghi chú)`.
5. Gửi `Notifications` cho vai trò `purchasing` khi có PR mới.

Tính **idempotent**: chạy lại không tạo trùng giữ chỗ hay PR.
Dự án ưu tiên theo `need_date` sớm hơn; không "cướp" vật tư đã giữ chỗ của dự án khác.

**Nghiệm thu:** kho có 5 PLC, dự án A cần 2, dự án B cần 4 → A giữ 2, B giữ 3, PR cho B thiếu 1; chạy lại hai lần liên tiếp không đổi kết quả.

### 5.4 Trạng thái từng dòng BOM
Trạng thái hiển thị (ưu tiên từ trên xuống), khớp `bomState` trong mẫu:
`Đã xuất đủ` (issued ≥ required) → `Trễ ETA n ngày` (ETA PO > need_date) → `Thiếu · PR-xxxx` (short>0 và chưa có PO) → `Đang đặt mua` (qty_ordered>0) → `Đã giữ chỗ`.
Thanh phân bổ chia 4 đoạn: đã xuất / giữ chỗ / đặt mua / thiếu, theo tỉ lệ `qty_required`.

### 5.5 Thanh toán theo tiến độ hợp đồng
Action: `payment.list(project_id)`, `payment.update_plan`, `payment.qr(pay_id)`.
Xem §10.

### 5.6 Giá thành dự án
Action: `project.cost(project_id)` trả `{material, ot, trip, other, committed, budget, gross_margin}`.
- `material` = tổng `ProjectCosts(kind=material)` (ghi khi **phiếu xuất posted**, giá = `Items.avg_cost_vnd` bình quân gia quyền tại thời điểm xuất).
- `ot` = từ đơn OT đã duyệt cấp 2: `hours × hourly_rate × ot_multiplier` (hourly_rate lấy `Settings.default_hourly_rate`, hoặc theo nhân viên nếu có).
- `trip` = tổng chi phí kê khai đã duyệt + trợ cấp theo ngày.
- `committed` = (giữ chỗ + đang đặt mua) × giá; hiển thị riêng, không cộng vào thực tế.
- Giá thành thực tế = material + ot + trip + other.
**Nghiệm thu:** xuất 2 tủ điện giá 8,6tr cho DA-X → `material` tăng đúng 17,2tr; duyệt OT 3 giờ gắn DA-X → `ot` tăng đúng; huỷ phiếu xuất → trả lại.

---

## 6. MODULE 2 — MUA HÀNG VÀ THEO DÕI ETA

### 6.1 Yêu cầu mua (PR)
Màn hình tab `Yêu cầu mua (PR)`: bảng có nút **Tạo PO** (xem mẫu). Action: `pr.list`, `pr.create_manual`, `pr.cancel`, `pr.to_po(pr_ids[], sup_id)`.
Quy tắc: gộp nhiều PR cùng NCC vào một PO, mỗi dòng PO giữ `project_id` và `pr_id`.

### 6.2 Đơn mua (PO)
Action: `po.create`, `po.update`, `po.send`, `po.confirm`, `po.cancel`, `po.get`, `po.list`.
Trạng thái: `draft → sent → confirmed → in_transit → partial → received`; `cancelled` từ `draft/sent/confirmed`.
Quy tắc:
- Mỗi dòng bắt buộc `unit_price_vnd`, `lead_time_days` (mặc định lấy `Items.lead_time_days`).
- Khi `confirmed` mới tính `qty_ordered` vào BOM; từ `draft/sent` chỉ tính "PO nháp".
- `total_vnd` tính từ dòng. Tạo `Payables` theo `payment_terms` (ví dụ `Cọc 30%, còn lại net 15`).
- Xuất PDF PO (gợi ý: tạo Google Doc từ template rồi xuất PDF).
**Nghiệm thu:** PR thiếu 2 HMI → tạo PO → BOM chuyển `Thiếu` thành `Đang đặt mua`, `Payables` có bản ghi.

### 6.3 Theo dõi ETA
Màn hình `Tiến độ ETA`: biểu đồ Gantt đơn giản (xem mẫu) gồm thanh từ `order_date` tới `eta_date`, vạch đứt = `need_date`, vạch cam = hôm nay.
Action: `eta.list(filter)`, `eta.update(line_id, eta_date, note)`.
Màu: **đỏ** nếu `eta > need`, **vàng** nếu `need − eta ≤ alert_soon_days`, **xanh** còn lại, **xanh lá** khi đã về.
Mọi lần sửa ETA ghi lịch sử (`before/after`) và chạy lại kiểm tra cảnh báo của dòng đó ngay.

### 6.4 Nhận hàng và nhập kho dự án
Action: `gr.scan(barcode)`, `gr.post(lines[])`.
Quy tắc:
- Quét mã (bàn phím kiểu wedge hoặc nhập tay) → tìm `Items.barcode` hoặc `sku` → gợi ý dòng PO đang mở khớp.
- Nhập một phần được phép: `qty_received` cộng dồn, PO sang `partial` hoặc `received`.
- Dòng PO có `project_id` → nhập kho xong **tự giữ chỗ** cho dự án đó (`StockReservations`), BOM `qty_ordered −= qty`, `qty_reserved += qty`.
- Không có PO khớp → nhập vào kho chung, cảnh báo "không có PO".
**Nghiệm thu:** nhận 4/6 servo → PO `partial`, BOM giữ chỗ +4, ordered −4; nhận nốt → PO `received`.

---

## 7. MODULE 3 — KHO

### 7.1 Tồn kho thời gian thực
Màn hình: bảng tồn (xem mẫu) với lọc kho, tìm kiếm tên/mã. Ba chỉ số **luôn tách bạch**:
`Tồn thực tế = on_hand` · `Đã gán dự án = reserved` (hiển thị thẻ theo từng dự án) · `Khả dụng = on_hand − reserved`.
Cảnh báo: `Hết` (khả dụng ≤ 0 và min > 0) và `Dưới mức` (khả dụng < `min_stock`).
Action: `stock.list(filter)`, `stock.card(sku)` (thẻ kho: các dòng `StockMovements`).

### 7.2 Phiếu xuất kho cho dự án
Action: `issue.create`, `issue.post`, `issue.cancel`.
Quy tắc cứng:
1. Chỉ xuất `sku` **đã giữ chỗ cho đúng `project_id`**; số lượng ≤ số đang giữ. Vi phạm → `STOCK_NOT_RESERVED` hoặc `STOCK_INSUFFICIENT` (thông điệp như trong mẫu).
2. `post`: `on_hand −= qty`, `reserved −= qty`, `StockReservations` chuyển `consumed` một phần, `BOM.qty_issued += qty`, `BOM.qty_reserved −= qty`, ghi `StockMovements(issue)`, ghi `ProjectCosts(material)`.
3. `cancel` một phiếu `posted` tạo bút toán đảo (không sửa dòng cũ).
4. Hàng tiêu hao dùng chung (bu lông, cáp) cho phép xuất theo dự án không cần giữ chỗ nếu `Items.category = consumable` và có cấu hình `allow_consumable_without_reserve=true`.
**Nghiệm thu:** chạy được kịch bản trong màn hình mẫu: xuất 2 PLC cho dự án đã giữ → thành công, tồn còn đúng; xuất cho dự án chưa giữ → bị từ chối.

### 7.3 Kiểm kê và điều chỉnh
Action: `stocktake.create(wh_id)`, `stocktake.save_counts`, `stocktake.approve`.
Quy tắc:
- Tạo phiếu: chụp `qty_book` tại thời điểm tạo; kho vẫn hoạt động, chênh lệch tính theo phát sinh sau đó khi duyệt (hoặc khóa kho trong lúc đếm — chọn bằng `Settings.stocktake_freeze`).
- Chênh lệch âm bắt buộc có `reason` (hư hỏng khi chế tạo, mất mát, nhập sai).
- `approve` (chỉ `manager/director`): ghi `StockMovements(adjust)`; **không được làm `on_hand` < `reserved`** — nếu xảy ra, hệ thống đưa ra danh sách dự án bị ảnh hưởng và tự sinh PR bù.
- Chênh lệch có giá trị hao hụt ghi `ProjectCosts(kind=other)` nếu lý do là `hư hỏng khi chế tạo` và có `project_id`.

---

## 8. MODULE 4 — NHÂN SỰ VÀ KỸ THUẬT

### 8.1 Hồ sơ nhân viên
Màn hình: danh sách (họ tên, kỹ năng, tải việc) + chi tiết bên phải (xem mẫu).
Action: `employee.list`, `employee.get`, `employee.create`, `employee.update`, `employee.reveal(emp_id, field)`.
Tải việc `%` = `min(100, số task chưa xong × 22)` (cấu hình `workload_per_task`).
Dữ liệu hành chính: sơ yếu lý lịch, CCCD, hợp đồng, bảo hiểm, ngân hàng, liên hệ khẩn cấp. Tệp đính kèm lưu Google Drive, bảng lưu `file_url`.

### 8.2 Kỹ năng và chứng chỉ
Action: `skill.upsert`, `cert.add`, `cert.list_expiring(days)`.
Cảnh báo hết hạn: trigger hằng ngày tạo `AIAlerts(type=cert_expiry)` khi còn ≤ 60 ngày; cảnh báo cấp **bad** khi còn ≤ 14 ngày hoặc đã hết hạn.
Quy tắc phân công: không cho gán task có `type` cần chứng chỉ (cấu hình `TaskTypeRequirements`) cho người có chứng chỉ hết hạn; thay vào đó cảnh báo.

### 8.3 Lịch sử và gợi ý phân công
Action: `employee.assignments(emp_id)`, `employee.suggest(task_type, project_id, due_date)`.
Điểm gợi ý = `100 × (kỹ năng khớp / kỹ năng yêu cầu) − tải việc/10`, loại người nghỉ phép/công tác trong khoảng task, loại chứng chỉ hết hạn; trả top 3 kèm lý do. Có thể bổ sung lời giải thích bằng AI (§12.4).

---

## 9. MODULE 5 — ĐƠN TỪ VÀ PHÊ DUYỆT

### 9.1 Loại đơn và trường dữ liệu

| Loại | Trường | Ghi chú |
|---|---|---|
| `leave` Nghỉ phép | từ ngày, đến ngày, lý do, người bàn giao | Kiểm tra số ngày phép còn lại |
| `late_early` Đi trễ / Về sớm | ngày, loại, số giờ, lý do | |
| `ot` Làm thêm giờ | ngày, số giờ, **mã dự án**, nội dung | Hệ số theo ngày thường/cuối tuần/lễ |
| `trip` Công tác | từ, đến, mã dự án, địa điểm, chi phí (vé, khách sạn, ăn uống) | Trợ cấp = số ngày × `trip_allowance_per_day` |

Mẫu giao diện đã có form đổi theo loại đơn và tính tổng chi phí công tác tự động.

### 9.2 Luồng duyệt
`pending_l1` (Trưởng phòng / QLDA) → `pending_l2` (HR hoặc Kế toán) → `approved`; từ chối ở bước nào cũng về `rejected` kèm bắt buộc lý do.
- Người duyệt cấp 1 = quản lý trực tiếp của nhân viên; đơn OT/công tác gắn dự án thì **QLDA của dự án** duyệt cấp 1.
- Cấp 2: `leave, late_early, ot` → HR; `trip` → Kế toán (vì có chi tiền).
- Không tự duyệt đơn của chính mình; nếu người duyệt vắng, chuyển cho người được ủy quyền (`Settings.delegate_<emp_id>`).
- Mỗi chuyển bước gửi `Notifications`; đơn chờ quá 24 giờ nhắc lại một lần.
Action: `request.create`, `request.cancel` (khi chưa duyệt cấp 1), `request.approve(req_id, comment)`, `request.reject(req_id, reason)`, `request.inbox`, `request.list`.

### 9.3 Hiệu ứng khi đơn `approved` (chạy trong một khóa)
| Loại | Hiệu ứng |
|---|---|
| `leave`, `late_early` | Ghi `Attendance`; cập nhật `PayrollInputs.leave_days` của tháng |
| `ot` | Ghi `Attendance(type=ot)`; cộng `PayrollInputs.ot_hours/ot_amount`; ghi `ProjectCosts(kind=ot)` cho `project_id` |
| `trip` | Ghi `Attendance(trip)`; cộng `PayrollInputs.allowance_vnd`; tạo `CashLedger` **dự kiến chi** (trạng thái `planned`, chi thật khi kế toán lập phiếu chi); ghi `ProjectCosts(kind=trip)` |
Hiệu ứng phải **đảo ngược được**: huỷ đơn đã duyệt (chỉ `admin/hr`) tạo bút toán đảo.
**Nghiệm thu:** duyệt cấp 2 một đơn OT 3 giờ gắn DA-2609-01 → `PayrollInputs` và `ProjectCosts(ot)` tăng đúng, chạy lại `request.approve` không cộng đôi.

### 9.4 Gợi ý nhận xét bằng AI
Nút "AI gợi ý nhận xét" gọi §12.5; kết quả chỉ điền vào ô nhận xét, người duyệt phải tự bấm Duyệt.

---

## 10. MODULE 6 — BÁN HÀNG, CÔNG NỢ, TÀI CHÍNH

### 10.1 Báo giá và hợp đồng
Phạm vi giai đoạn 1: **lưu hợp đồng đã ký** và các đợt thanh toán (không làm trình soạn báo giá). Có thể đính kèm file hợp đồng (Drive). Báo giá chuyển thành dự án bằng nút "Tạo dự án từ báo giá" ở giai đoạn sau.

### 10.2 VietQR
Action: `payment.qr(pay_id)` trả `{image_url, amount_vnd, content, bank_info}`.
URL ảnh: `https://img.vietqr.io/image/{BANK_ID}-{ACCOUNT_NO}-compact2.png?amount={amount}&addInfo={content}&accountName={name}`.
- Nội dung chuyển khoản: `<project_id không dấu gạch> <pay_id>` để đối soát tự động.
- Thông tin ngân hàng đọc từ `Settings`. Thiếu cấu hình → lỗi `VALIDATION` rõ ràng.
- Giao diện mẫu dùng hình QR **minh hoạ**; bản thật chèn `<img src=image_url>` (lưu ý: trang chạy trong Apps Script/WebApp không bị CSP chặn; nếu nhúng nơi khác cần cho phép `img.vietqr.io`).
- Có nút sao chép nội dung chuyển khoản và tải ảnh.

### 10.3 Phiếu thu và gạch nợ
Action: `ledger.receipt_create({pay_id, acct_id, date, amount})`.
Trong một khóa: tạo `CashLedger(in)`, đánh dấu `ProjectPayments.status=paid`, cập nhật `Receivables.received_vnd`, tăng số dư tài khoản (tính từ sổ).
- Thu thiếu/thu dư: cho phép thu một phần, đợt vẫn `pending` kèm số còn lại; thu dư bị chặn trừ khi chọn "ghi nhận trả trước".
- Số phiếu `PT-xxxx` tăng liên tục, không sửa; sai thì lập phiếu đảo.
**Nghiệm thu:** như màn hình mẫu — lập phiếu thu đợt "Giao hàng 50%" → đợt chuyển Đã thu, công nợ giảm, số dư quỹ tăng đúng số tiền.

### 10.4 Công nợ và tuổi nợ
Action: `debt.ar_aging`, `debt.ap_aging`, `debt.detail(party_id)`.
Nhóm tuổi nợ tính theo ngày quá hạn: `Chưa đến hạn`, `1–30`, `31–60`, `61–90`, `>90`. Công nợ có thể xem theo khách/nhà cung cấp và theo **dự án**.
Cảnh báo: khoản quá hạn >0 ngày tạo `AIAlerts(type=overdue)` mức `warn`, >30 ngày mức `bad`.

### 10.5 Sổ quỹ
Action: `ledger.list`, `ledger.payment_create` (phiếu chi), `account.balance`.
- Số dư = `opening_balance + Σ thu − Σ chi` của từng tài khoản; không lưu số dư, tính từ sổ (nhanh nhờ cache 1 phút, vô hiệu khi ghi).
- Phiếu chi gắn `po_id` thì cập nhật `Payables.paid_vnd`; gắn `req_id` (công tác) thì đóng khoản chi dự kiến.
- Chặn chi vượt số dư tiền mặt (tiền mặt không âm); tài khoản ngân hàng cho phép âm kèm cảnh báo.

---

## 11. MODULE 7 — CÔNG VIỆC, KANBAN, LỊCH

### 11.1 Giao việc
Action: `task.create`, `task.update`, `task.move(task_id, status)`, `task.list(filter)`.
Quy tắc: bắt buộc `project_id`, người phụ trách, hạn; hạn không vượt `due_date` của dự án (cảnh báo, không chặn). `depends_on` chặn chuyển `doing` khi task phụ thuộc chưa `done` (có tuỳ chọn bỏ qua cho `manager`).

### 11.2 Kanban
Bốn cột `Chờ gia công → Đang làm → Chờ kiểm tra (QC) → Hoàn thành`. Kéo thả (desktop) và nút `‹ ›` (điện thoại) — đã có trong mẫu.
- Chuyển sang `qc`: gửi thông báo cho `qc_by` (mặc định QLDA).
- `done` chỉ do người QC hoặc `manager` đặt; từ `qc` có thể trả về `doing` kèm lý do.
- Cập nhật `progress` của dự án ngay sau mỗi lần chuyển (§5.1).

### 11.3 Lịch
Lịch tháng (tuần ở giai đoạn sau) hiển thị năm loại sự kiện: hạn task, hàng về (ETA), đợt thanh toán, công tác, bàn giao. Lọc theo dự án. Nguồn dữ liệu: `Tasks`, `POLines`, `ProjectPayments`, `Requests(trip, approved)`, `Projects`.
Giai đoạn sau: xuất `.ics` hoặc đồng bộ Google Calendar.

---

## 12. TRỢ LÝ AI (GEMINI)

### 12.1 Nguyên tắc
- AI **đề xuất, không tự ghi** dữ liệu nghiệp vụ. Cảnh báo (`AIAlerts`) là ngoại lệ vì chỉ là thông tin.
- Cảnh báo cơ bản (ETA trễ, tồn thấp, quá hạn, chứng chỉ) tính **bằng quy tắc, không cần AI**, để chắc chắn và miễn phí. Gemini dùng để *diễn giải, tóm tắt, bóc tách*.
- Mọi lời gọi Gemini: nhiệt độ thấp (≤0.3), yêu cầu đầu ra **JSON theo schema**, kiểm tra lại bằng code; sai schema thì thử lại một lần rồi trả `AI_ERROR`.
- Khóa API ở `PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY')`. Không đưa vào client.
- Chỉ gửi dữ liệu cần thiết, **không gửi** CCCD, số tài khoản, lương.
- Cache theo hash đầu vào 6 giờ. Ghi `AIAlerts`/log số token để theo dõi hạn mức.

### 12.2 Cảnh báo trễ tiến độ (quét hằng ngày)
Trigger `ai_scan` chạy `Settings.ai_scan_hour` (mặc định 6h):
1. Với mỗi `POLines` chưa nhận đủ: `late_days = eta_date − need_date`. `>0` → cảnh báo **bad**; `0..alert_soon_days` → **warn**.
2. Lấy `fingerprint = type|ref_id|eta_date` để tránh tạo trùng; cảnh báo cũ không còn đúng tự chuyển `resolved`.
3. Gom theo dự án, gọi Gemini một lần để viết 2–3 câu đề xuất (đổi NCC, giao một phần, đổi thứ tự lắp) dựa trên danh sách dòng trễ và task lắp ráp liên quan.
4. Gửi `Notifications` cho QLDA và `purchasing`; mức **bad** gửi thêm email.
Đầu ra Gemini (JSON): `{"summary": "...", "actions": [{"label": "...", "type": "contact_supplier|reschedule_task|split_delivery", "ref": "..."}]}`.
**Nghiệm thu:** đặt ETA servo = 28/10, need = 20/10 → trong lần quét kế tiếp có cảnh báo đỏ "trễ 8 ngày" ở bảng điều khiển; sửa ETA thành 18/10 → cảnh báo tự chuyển `resolved`.

### 12.3 Bóc tách BOM từ file thiết kế
Đầu vào: file Excel/PDF/CSV BOM do kỹ thuật xuất từ phần mềm thiết kế (tải lên Drive, lấy văn bản/bảng bằng API).
Prompt yêu cầu trả:
```json
{"lines":[{"raw_text":"...","name":"...","qty":24,"unit":"cái","spec":"...","need_date":null}],"warnings":["..."]}
```
Sau đó code **khớp mã** `Items`: khớp chính xác `sku`/`barcode` → khớp mờ theo tên (độ tương đồng ≥ 0.85) → còn lại đánh dấu "chưa có mã". Kết quả vào bước **xem trước** §5.2, người dùng xác nhận mới ghi.
**Nghiệm thu:** file mẫu 30 dòng, ≥ 90% dòng khớp đúng sku trên bộ dữ liệu thử; mọi dòng không chắc chắn được tô vàng để người xem lại.

### 12.4 Gợi ý nhân sự
Tính điểm bằng code (§8.3), Gemini chỉ viết lời giải thích ngắn cho top 3. Không dùng AI để quyết định.

### 12.5 Hỗ trợ phê duyệt
Đầu vào: nội dung đơn, tải việc của người xin, mốc dự án trong khoảng nghỉ, số phép còn lại. Đầu ra JSON: `{"risk":"low|medium|high","note":"...","suggested_comment":"..."}`. Hiển thị trong thẻ đơn, không tự duyệt.

### 12.6 Hỏi đáp và báo cáo tuần
- Khung chat: gửi câu hỏi + **ngữ cảnh đã tổng hợp bằng code** (không gửi cả sheet).
- Hỗ trợ tối thiểu: "vật tư nào sắp trễ", "tóm tắt tuần của dự án X", "dự án nào có rủi ro".
- Báo cáo tuần tự động (trigger thứ Hai 7h) gửi email QLDA: tiến độ, vật tư trễ, công nợ đến hạn, đơn chờ duyệt.

---

## 13. BẢNG ĐIỀU KHIỂN VÀ BÁO CÁO

Bảng điều khiển (xem mẫu): bốn chỉ số (dự án đang chạy, vật tư nguy cơ trễ, phải thu quá hạn, số dư quỹ), danh sách cảnh báo AI, bảng dự án (tiến độ, ngày còn lại), đợt thanh toán sắp đến hạn, đơn chờ xử lý.
Action: `dashboard.summary` (một lần gọi trả đủ, cache 60 giây).
Báo cáo xuất file (giai đoạn 2): giá thành dự án, tồn kho, công nợ theo tuổi nợ, bảng OT và trợ cấp theo tháng cho lương.

---

## 14. YÊU CẦU PHI CHỨC NĂNG

| Mã | Yêu cầu |
|---|---|
| NF-1 | Màn hình tải đầu < 3 giây với 50.000 dòng dữ liệu tổng; thao tác ghi < 5 giây |
| NF-2 | Đồng thời 20 người dùng không mất/ghi chồng dữ liệu (nhờ `withLock`) |
| NF-3 | Lưu trữ theo năm các bảng lịch sử (`StockMovements`, `AuditLog`, `CashLedger` năm cũ) sang file riêng, giữ số dư đầu kỳ |
| NF-4 | Sao lưu: trigger hằng đêm chép file Sheets sang thư mục Drive `Backup/`, giữ 30 bản |
| NF-5 | Điện thoại: dùng được đủ chức năng nhận hàng (quét mã), duyệt đơn, cập nhật task |
| NF-6 | Truy cập: nhãn cho mọi ô nhập, độ tương phản đạt WCAG AA, thao tác bàn phím |
| NF-7 | Mọi lỗi người dùng thấy được viết bằng tiếng Việt, nói rõ cách sửa |
| NF-8 | Không có khóa/khoá bí mật trong mã nguồn hoặc trong Sheet |

---

## 15. KIỂM THỬ VÀ ĐỊNH NGHĨA "XONG"

Một task **xong** khi:
1. Đạt mọi dòng **Nghiệm thu** của task và mục đặc tả liên quan.
2. Có `test_*` chạy được và qua; kèm dữ liệu mẫu để chạy lại.
3. Quy tắc nghiệp vụ trọng yếu có test âm (đầu vào sai phải bị từ chối đúng mã lỗi).
4. Giao diện khớp mẫu `mini-erp-ui.html` về bố cục và luồng; dùng được ở 400px và 1440px, sáng và tối.
5. `CHANGELOG.md` và (nếu đổi lược đồ) §3 đã cập nhật.
6. Đã ghi `AuditLog` cho mọi thao tác ghi.

### Kịch bản kiểm thử xuyên module (E2E)

1. Tạo dự án `DA-TEST-01` → nhập BOM 8 dòng → hệ thống giữ chỗ phần có sẵn và sinh PR cho phần thiếu.
2. Mua hàng gộp PR thành PO, đặt ETA muộn hơn ngày cần → cảnh báo đỏ xuất hiện trên bảng điều khiển.
3. Kho quét nhận hàng → vật tư tự gán cho dự án → cảnh báo biến mất.
4. Kỹ thuật lập phiếu xuất → tồn thực tế giảm, giá thành vật tư tăng.
5. Nhân viên gửi đơn OT gắn dự án → quản lý duyệt → HR ghi nhận → giá thành OT và bảng lương cùng cập nhật.
6. Tạo VietQR cho đợt giao hàng → lập phiếu thu → đợt chuyển Đã thu, công nợ giảm, số dư quỹ tăng.
7. Kéo toàn bộ task sang `done` → tiến độ dự án 100%.

---

## 16. TỪ ĐIỂN THUẬT NGỮ

| Thuật ngữ | Ý nghĩa |
|---|---|
| BOM | Định mức vật tư cho một dự án |
| PR | Yêu cầu mua hàng, sinh từ phần BOM thiếu |
| PO | Đơn mua gửi nhà cung cấp |
| ETA | Ngày dự kiến hàng về = ngày đặt + lead-time |
| Lead-time | Số ngày từ đặt hàng đến hàng về |
| Giữ chỗ (reserved) | Vật tư có trong kho nhưng dành riêng cho một dự án |
| Khả dụng | Tồn thực tế trừ phần đã giữ chỗ |
| QLDA | Quản lý dự án |
| FAT | Nghiệm thu thử tại xưởng trước khi giao |
