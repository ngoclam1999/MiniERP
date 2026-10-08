function registerEmployeeActions_() {
  registerActionOnce_('employee.list', function () { return listEmployees_(getAuthContext_()); }, false);
  registerActionOnce_('employee.get', function (p) { return getEmployee_(getAuthContext_(), p && p.emp_id); }, false);
  registerActionOnce_('employee.create', function (p) { requireRole(getAuthContext_(), ['hr']); return createEmployee_(p); }, true);
  registerActionOnce_('employee.update', function (p) { requireRole(getAuthContext_(), ['hr']); return updateEmployee_(p && p.emp_id, p && p.patch, p && p.sensitive); }, true);
  registerActionOnce_('employee.reveal', function (p) { requireRole(getAuthContext_(), ['hr']); return revealEmployeeField_(p && p.emp_id, p && p.field); }, true);
}

function listEmployees_(ctx) {
  requireRole(ctx, ['director','manager','hr','employee']);
  var ownOnly = hasOnlyEmployeeRole_(ctx), rows = readAll('Employees');
  if (ownOnly) rows = rows.filter(function (row) { return String(row.emp_id) === String(ctx.emp_id); });
  return rows.map(function (row) { return shapeEmployee_(ctx, row, false); });
}

function getEmployee_(ctx, empId) {
  requireRole(ctx, ['director','manager','hr','employee']);
  if (hasOnlyEmployeeRole_(ctx) && String(empId) !== String(ctx.emp_id)) throw apiError('FORBIDDEN', 'Bạn chỉ được xem hồ sơ của mình.');
  var row = findById('Employees', empId);
  if (!row) throw apiError('NOT_FOUND', 'Không tìm thấy nhân viên: ' + empId);
  return shapeEmployee_(ctx, row, true);
}

function createEmployee_(payload) {
  var normalized = normalizeEmployeePayload_(payload, false);
  if (findById('Employees', normalized.employee.emp_id)) throw apiError('CONFLICT', 'Mã nhân viên đã tồn tại.', 'emp_id');
  insert('Employees', normalized.employee);
  if (normalized.sensitive.id_card_no || normalized.sensitive.tax_code) insert('EmployeeSensitive', normalized.sensitive);
  return shapeEmployee_(getAuthContext_(), findById('Employees', normalized.employee.emp_id), true);
}

function updateEmployee_(empId, patch, sensitive) {
  if (!findById('Employees', empId)) throw apiError('NOT_FOUND', 'Không tìm thấy nhân viên: ' + empId);
  var normalized = normalizeEmployeePayload_({ employee: patch || {}, sensitive: sensitive || {}, emp_id: empId }, true);
  if (Object.keys(normalized.employee).length) update('Employees', empId, normalized.employee);
  if (Object.keys(normalized.sensitive).length > 1) {
    if (findById('EmployeeSensitive', empId)) update('EmployeeSensitive', empId, normalized.sensitive); else insert('EmployeeSensitive', normalized.sensitive);
  }
  return shapeEmployee_(getAuthContext_(), findById('Employees', empId), true);
}

function normalizeEmployeePayload_(payload, isPatch) {
  payload = payload || {};
  var source = payload.employee || payload, employee = {}, sensitive = { emp_id: String(payload.emp_id || source.emp_id || '').trim() };
  MINI_ERP_SCHEMA.Employees.forEach(function (field) { if (Object.prototype.hasOwnProperty.call(source, field) && !(isPatch && field === 'emp_id')) employee[field] = String(source[field] == null ? '' : source[field]).trim(); });
  var sensitiveSource = payload.sensitive || payload;
  ['id_card_no','tax_code'].forEach(function (field) { if (Object.prototype.hasOwnProperty.call(sensitiveSource, field)) sensitive[field] = String(sensitiveSource[field] == null ? '' : sensitiveSource[field]).trim(); });
  if (!isPatch && (!employee.emp_id || !employee.full_name)) throw apiError('VALIDATION', 'Mã và họ tên nhân viên không được để trống.');
  if (isPatch && Object.prototype.hasOwnProperty.call(employee, 'full_name') && !employee.full_name) throw apiError('VALIDATION', 'Họ tên không được để trống.', 'full_name');
  return { employee: employee, sensitive: sensitive };
}

function shapeEmployee_(ctx, row, detailed) {
  var result = copyDbObject_(row), privileged = hasRole_(ctx, 'hr') || hasRole_(ctx, 'admin');
  var sensitive = findById('EmployeeSensitive', row.emp_id) || {};
  result.id_card_no = privileged ? String(sensitive.id_card_no || '') : maskSensitive_(sensitive.id_card_no);
  result.bank_account = privileged ? String(row.bank_account || '') : maskSensitive_(row.bank_account);
  if (detailed && privileged) result.tax_code = String(sensitive.tax_code || '');
  if (hasRole_(ctx, 'manager') && !privileged) ['dob','address','insurance_no','bank_name','emergency_name','emergency_phone'].forEach(function (field) { delete result[field]; });
  return result;
}

function revealEmployeeField_(empId, field) {
  if (['id_card_no','bank_account'].indexOf(String(field)) === -1) throw apiError('VALIDATION', 'Chỉ cho phép mở CCCD hoặc số tài khoản.', 'field');
  var employee = findById('Employees', empId);
  if (!employee) throw apiError('NOT_FOUND', 'Không tìm thấy nhân viên: ' + empId);
  var value = field === 'id_card_no' ? ((findById('EmployeeSensitive', empId) || {}).id_card_no || '') : (employee.bank_account || '');
  writeAuditEntries_([buildAuditEntry_('employee.reveal', 'Employees', empId, null, { revealed_fields: [field] })]);
  return { emp_id: empId, field: field, value: String(value) };
}

function maskSensitive_(value) {
  var text = String(value || '');
  if (!text) return '';
  if (text.length <= 4) return '••••';
  return text.slice(0, 3) + '•••••••' + text.slice(-3);
}
function hasRole_(ctx, role) { return [ctx.role].concat(ctx.extra_roles || []).indexOf(role) !== -1; }
function hasOnlyEmployeeRole_(ctx) { return hasRole_(ctx, 'employee') && !['admin','director','manager','hr'].some(function (role) { return hasRole_(ctx, role); }); }
