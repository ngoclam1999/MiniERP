function registerPartnerActions_() {
  registerActionOnce_('customer.list', function (p) { requireRole(getAuthContext_(), ['director','manager','engineer','purchasing','warehouse','accountant','employee']); return listPartners_('Customers', p && p.search); }, false);
  registerActionOnce_('customer.create', function (p) { requireRole(getAuthContext_(), ['manager']); return createPartner_('Customers', p); }, true);
  registerActionOnce_('customer.update', function (p) { requireRole(getAuthContext_(), ['manager']); return updatePartner_('Customers', p && p.cust_id, p && p.patch); }, true);
  registerActionOnce_('customer.delete', function (p) { requireRole(getAuthContext_(), ['manager']); return deletePartner_('Customers', p && p.cust_id); }, true);
  registerActionOnce_('supplier.list', function (p) { requireRole(getAuthContext_(), ['director','manager','engineer','purchasing','warehouse','accountant']); return listPartners_('Suppliers', p && p.search); }, false);
  registerActionOnce_('supplier.create', function (p) { requireRole(getAuthContext_(), ['purchasing']); return createPartner_('Suppliers', p); }, true);
  registerActionOnce_('supplier.update', function (p) { requireRole(getAuthContext_(), ['purchasing']); return updatePartner_('Suppliers', p && p.sup_id, p && p.patch); }, true);
  registerActionOnce_('supplier.delete', function (p) { requireRole(getAuthContext_(), ['purchasing']); return deletePartner_('Suppliers', p && p.sup_id); }, true);
}

function listPartners_(sheetName, search) {
  var term = String(search || '').trim().toLowerCase();
  var rows = readAll(sheetName);
  if (!term) return rows;
  var fields = sheetName === 'Customers' ? ['cust_id','name','tax_code','contact_name','phone','email'] : ['sup_id','name','tax_code','contact_name','phone','email','payment_terms'];
  return rows.filter(function (row) {
    return fields.some(function (field) { return String(row[field] || '').toLowerCase().indexOf(term) !== -1; });
  });
}

function createPartner_(sheetName, payload) {
  var value = normalizePartner_(sheetName, payload, false);
  assertUniqueTaxCode_(sheetName, value.tax_code, '');
  return insert(sheetName, value);
}

function updatePartner_(sheetName, id, patch) {
  var existing = findById(sheetName, id);
  if (!existing) throw apiError('NOT_FOUND', 'Không tìm thấy bản ghi: ' + id);
  var value = normalizePartner_(sheetName, patch, true);
  if (Object.prototype.hasOwnProperty.call(value, 'tax_code')) assertUniqueTaxCode_(sheetName, value.tax_code, id);
  return update(sheetName, id, value);
}

function normalizePartner_(sheetName, value, isPatch) {
  if (!value || Object.prototype.toString.call(value) !== '[object Object]') throw apiError('VALIDATION', 'Dữ liệu phải là object.');
  var idField = sheetName === 'Customers' ? 'cust_id' : 'sup_id';
  var allowed = MINI_ERP_SCHEMA[sheetName];
  var result = {};
  allowed.forEach(function (field) {
    if (Object.prototype.hasOwnProperty.call(value, field)) result[field] = String(value[field] === null || value[field] === undefined ? '' : value[field]).trim();
  });
  if (!isPatch && (!result[idField] || !result.name)) throw apiError('VALIDATION', 'Mã và tên không được để trống.', !result[idField] ? idField : 'name');
  if (isPatch && Object.prototype.hasOwnProperty.call(result, 'name') && !result.name) throw apiError('VALIDATION', 'Tên không được để trống.', 'name');
  if (sheetName === 'Suppliers' && Object.prototype.hasOwnProperty.call(result, 'avg_lead_days')) {
    if (result.avg_lead_days !== '' && (!/^\d+$/.test(result.avg_lead_days))) throw apiError('VALIDATION', 'Lead-time trung bình phải là số nguyên không âm.', 'avg_lead_days');
  }
  return result;
}

function assertUniqueTaxCode_(sheetName, taxCode, excludeId) {
  var normalized = String(taxCode || '').trim().toLowerCase();
  if (!normalized) return;
  var idField = sheetName === 'Customers' ? 'cust_id' : 'sup_id';
  var duplicate = readAll(sheetName).some(function (row) {
    return String(row[idField]) !== String(excludeId || '') && String(row.tax_code || '').trim().toLowerCase() === normalized;
  });
  if (duplicate) throw apiError('CONFLICT', 'Mã số thuế đã tồn tại.', 'tax_code');
}

function deletePartner_(sheetName, id) {
  if (!findById(sheetName, id)) throw apiError('NOT_FOUND', 'Không tìm thấy bản ghi: ' + id);
  var references = sheetName === 'Customers' ? [{ sheet: 'Projects', field: 'cust_id' }] : [{ sheet: 'PO', field: 'sup_id' }, { sheet: 'Payables', field: 'sup_id' }];
  var used = references.some(function (ref) { return query(ref.sheet, function (row) { return String(row[ref.field] || '') === String(id); }).length > 0; });
  if (used) throw apiError('CONFLICT', 'Không thể xoá danh mục đã phát sinh dữ liệu liên quan.');
  return softDelete(sheetName, id);
}

function seed_sample_data() {
  return withLock(function () {
    var customers = [
      { cust_id: 'CUST-DEMO-001', name: 'Công ty Demo Cơ khí An Phát', tax_code: 'DEMO-CUST-001', contact_name: 'Nguyễn Minh An', phone: '0900000001', email: 'an.phat@example.com', address: 'Khu công nghiệp mẫu, Bình Dương', note: 'Dữ liệu mẫu kiểm thử' },
      { cust_id: 'CUST-DEMO-002', name: 'Công ty Demo Tự động hóa Đông Nam', tax_code: 'DEMO-CUST-002', contact_name: 'Trần Thu Hà', phone: '0900000002', email: 'dong.nam@example.com', address: 'Khu công nghiệp mẫu, Đồng Nai', note: 'Dữ liệu mẫu kiểm thử' }
    ];
    var suppliers = [
      { sup_id: 'SUP-DEMO-001', name: 'Nhà cung cấp Demo Thiết bị Minh Long', tax_code: 'DEMO-SUP-001', contact_name: 'Lê Quốc Minh', phone: '0900000011', email: 'minh.long@example.com', address: 'TP. Hồ Chí Minh', payment_terms: 'Cọc 30%, còn lại net 15', avg_lead_days: 14, note: 'Dữ liệu mẫu kiểm thử' },
      { sup_id: 'SUP-DEMO-002', name: 'Nhà cung cấp Demo Khí nén Việt', tax_code: 'DEMO-SUP-002', contact_name: 'Phạm Ngọc Việt', phone: '0900000012', email: 'khi.nen.viet@example.com', address: 'Bình Dương', payment_terms: 'Net 30', avg_lead_days: 7, note: 'Dữ liệu mẫu kiểm thử' }
    ];
    var items = [
      { sku: 'PLC-DEMO-001', name: 'PLC Demo 16 I/O', category: 'plc', unit: 'cái', spec: '24VDC, Ethernet', min_stock: 2, default_sup_id: 'SUP-DEMO-001', lead_time_days: 14, avg_cost_vnd: 8500000, wh_type: 'common', barcode: 'DEMO-ITEM-0001' },
      { sku: 'SERVO-DEMO-001', name: 'Servo Demo 750W', category: 'servo', unit: 'bộ', spec: '750W, 220VAC', min_stock: 1, default_sup_id: 'SUP-DEMO-001', lead_time_days: 21, avg_cost_vnd: 12500000, wh_type: 'common', barcode: 'DEMO-ITEM-0002' },
      { sku: 'SENSOR-DEMO-001', name: 'Cảm biến quang Demo', category: 'sensor', unit: 'cái', spec: 'PNP, 24VDC', min_stock: 5, default_sup_id: 'SUP-DEMO-002', lead_time_days: 7, avg_cost_vnd: 650000, wh_type: 'consumable', barcode: 'DEMO-ITEM-0003' }
    ];
    var employees = [
      { emp_id: 'EMP-DEMO-001', full_name: 'Nguyễn Văn Demo', phone: '0900000101', dept: 'Kỹ thuật', position: 'Kỹ sư tự động hóa', bank_name: 'Ngân hàng Demo', bank_account: '012345678901', status: 'active' },
      { emp_id: 'EMP-DEMO-002', full_name: 'Trần Thị Mẫu', phone: '0900000102', dept: 'Mua hàng', position: 'Chuyên viên mua hàng', bank_name: 'Ngân hàng Demo', bank_account: '987654321098', status: 'active' }
    ];
    var sensitive = [
      { emp_id: 'EMP-DEMO-001', id_card_no: '079123456312', tax_code: 'DEMO-TAX-EMP-001' },
      { emp_id: 'EMP-DEMO-002', id_card_no: '079987654321', tax_code: 'DEMO-TAX-EMP-002' }
    ];
    var projects = [{ project_id: 'DA-DEMO-001', name: 'Máy đóng gói Demo', cust_id: 'CUST-DEMO-001', contract_value_vnd: 480000000, start_date: '2026-10-01', due_date: '2027-01-31', pm_emp_id: 'EMP-DEMO-001', budget_vnd: 350000000, status: 'active', note: 'Dữ liệu mẫu kiểm thử' }];
    var payments = [
      { pay_id: 'DA-DEMO-001-PAY-1', project_id: 'DA-DEMO-001', seq: 1, name: 'Tạm ứng', percent: 30, amount_vnd: 144000000, due_date: '2026-10-15', status: 'pending' },
      { pay_id: 'DA-DEMO-001-PAY-2', project_id: 'DA-DEMO-001', seq: 2, name: 'Giao hàng', percent: 50, amount_vnd: 240000000, due_date: '2026-12-20', status: 'pending' },
      { pay_id: 'DA-DEMO-001-PAY-3', project_id: 'DA-DEMO-001', seq: 3, name: 'Nghiệm thu', percent: 20, amount_vnd: 96000000, due_date: '2027-01-31', status: 'pending' }
    ];
    var skills = [{ id: 'SKILL-DEMO-001', emp_id: 'EMP-DEMO-001', skill: 'PLC', level: 'advanced' }];
    var certs = [{ id: 'CERT-DEMO-001', emp_id: 'EMP-DEMO-001', name: 'An toàn điện', issued_date: '2026-01-01', expiry_date: '2027-01-01', file_url: '' }];
    var bom = [
      { bom_id: 'BOM-DEMO-001', project_id: 'DA-DEMO-001', sku: 'PLC-DEMO-001', qty_required: 2, need_date: '2026-11-15', qty_reserved: 1, qty_ordered: 0, qty_issued: 0, note: 'Tủ điều khiển chính' },
      { bom_id: 'BOM-DEMO-002', project_id: 'DA-DEMO-001', sku: 'SERVO-DEMO-001', qty_required: 4, need_date: '2026-12-01', qty_reserved: 0, qty_ordered: 2, qty_issued: 0, note: 'Cụm kéo màng' },
      { bom_id: 'BOM-DEMO-003', project_id: 'DA-DEMO-001', sku: 'SENSOR-DEMO-001', qty_required: 8, need_date: '2026-11-20', qty_reserved: 2, qty_ordered: 0, qty_issued: 4, note: 'Cảm biến kiểm tra' }
    ];
    var costs = [{ id: 'COST-DEMO-001', project_id: 'DA-DEMO-001', kind: 'other', amount_vnd: 2500000, ref_type: 'demo', ref_id: 'DEMO', ts: '2026-10-08T00:00:00+07:00' }];
    var stock = [
      { sku: 'PLC-DEMO-001', wh_id: 'WH-COMMON', qty_on_hand: 5, qty_reserved: 1 },
      { sku: 'SERVO-DEMO-001', wh_id: 'WH-COMMON', qty_on_hand: 2, qty_reserved: 0 },
      { sku: 'SENSOR-DEMO-001', wh_id: 'WH-CONSUMABLE', qty_on_hand: 12, qty_reserved: 2 }
    ];
    var reservations = [
      { res_id: 'RES-DEMO-001', project_id: 'DA-DEMO-001', sku: 'PLC-DEMO-001', wh_id: 'WH-COMMON', qty: 1, status: 'active' },
      { res_id: 'RES-DEMO-002', project_id: 'DA-DEMO-001', sku: 'SENSOR-DEMO-001', wh_id: 'WH-CONSUMABLE', qty: 2, status: 'active' }
    ];
    return { customers: seedRowsIfMissing_('Customers', customers), suppliers: seedRowsIfMissing_('Suppliers', suppliers), items: seedRowsIfMissing_('Items', items), employees: seedRowsIfMissing_('Employees', employees), employee_sensitive: seedRowsIfMissing_('EmployeeSensitive', sensitive), projects: seedRowsIfMissing_('Projects', projects), payments: seedRowsIfMissing_('ProjectPayments', payments), skills: seedRowsIfMissing_('EmployeeSkills', skills), certificates: seedRowsIfMissing_('EmployeeCerts', certs), bom: seedRowsIfMissing_('BOM', bom), project_costs: seedRowsIfMissing_('ProjectCosts', costs), stock: seedRowsIfMissing_('StockBalance', stock), reservations: seedRowsIfMissing_('StockReservations', reservations) };
  });
}

function seedRowsIfMissing_(sheetName, rows) {
  var idField = MINI_ERP_SCHEMA[sheetName][0];
  var existing = readAll(sheetName).map(function (row) { return String(row[idField]); });
  var missing = rows.filter(function (row) { return existing.indexOf(String(row[idField])) === -1; });
  return { created: insertMany(sheetName, missing), total: existing.length + missing.length };
}
