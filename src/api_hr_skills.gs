function registerHrSkillActions_() {
  registerActionOnce_('skill.upsert', function (p) { requireRole(getAuthContext_(), ['hr']); return upsertSkill_(p); }, true);
  registerActionOnce_('cert.add', function (p) { requireRole(getAuthContext_(), ['hr']); return addCertificate_(p); }, true);
  registerActionOnce_('cert.list_expiring', function (p) { requireRole(getAuthContext_(), ['director','manager','hr']); return listExpiringCertificates_(p && p.days); }, false);
}
function upsertSkill_(p) {
  if (!p || !p.emp_id || !p.skill) throw apiError('VALIDATION', 'Nhân viên và kỹ năng không được để trống.');
  if (!findById('Employees', p.emp_id)) throw apiError('NOT_FOUND', 'Không tìm thấy nhân viên: ' + p.emp_id);
  var existing = query('EmployeeSkills', function (r) { return String(r.emp_id) === String(p.emp_id) && String(r.skill).toLowerCase() === String(p.skill).trim().toLowerCase(); })[0];
  var value = { emp_id: String(p.emp_id), skill: String(p.skill).trim(), level: String(p.level || '').trim() };
  if (existing) return update('EmployeeSkills', existing.id, value);
  value.id = nextId('SKILL'); return insert('EmployeeSkills', value);
}
function addCertificate_(p) {
  if (!p || !p.emp_id || !p.name || !p.expiry_date) throw apiError('VALIDATION', 'Nhân viên, tên chứng chỉ và ngày hết hạn không được để trống.');
  if (!findById('Employees', p.emp_id)) throw apiError('NOT_FOUND', 'Không tìm thấy nhân viên: ' + p.emp_id);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(p.expiry_date))) throw apiError('VALIDATION', 'Ngày hết hạn phải theo YYYY-MM-DD.', 'expiry_date');
  return insert('EmployeeCerts', { id: nextId('CERT'), emp_id: String(p.emp_id), name: String(p.name).trim(), issued_date: String(p.issued_date || ''), expiry_date: String(p.expiry_date), file_url: String(p.file_url || '').trim() });
}
function listExpiringCertificates_(days) {
  var limit = days === undefined ? 60 : Number(days); if (!Number.isFinite(limit) || limit < 0) throw apiError('VALIDATION', 'Số ngày phải là số không âm.', 'days');
  var now = new Date(), end = new Date(now.getTime() + limit * 86400000);
  return readAll('EmployeeCerts').filter(function (r) { var d = new Date(String(r.expiry_date) + 'T00:00:00'); return !isNaN(d.getTime()) && d <= end; }).map(function (r) { var x = copyDbObject_(r); x.days_left = Math.ceil((new Date(String(r.expiry_date) + 'T00:00:00').getTime() - now.getTime()) / 86400000); x.severity = x.days_left <= 14 ? 'bad' : 'warn'; return x; });
}
function scanCertificateExpiryAlerts() {
  return withLock(function () { var certs = listExpiringCertificates_(60), created = 0; certs.forEach(function (c) { var fp = 'cert_expiry|' + c.id + '|' + c.expiry_date; if (!query('AIAlerts', function (a) { return String(a.fingerprint) === fp && String(a.status) !== 'resolved'; }).length) { insert('AIAlerts', { id: nextId('ALERT'), type: 'cert_expiry', severity: c.severity, ref_id: c.id, title: 'Chứng chỉ sắp hết hạn', body: c.name + ' của ' + c.emp_id + ' hết hạn ' + c.expiry_date, status: 'open', fingerprint: fp }); created += 1; } }); return { scanned: certs.length, created: created }; });
}
