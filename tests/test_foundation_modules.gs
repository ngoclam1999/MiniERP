function test_d04_c01_f05_foundation() {
  var ctx = getAuthContext_();
  requireRole(ctx, ['admin']);
  var warehouses = initializeDefaultWarehouses_();
  if (warehouses.total < 3) throw new Error('D-04: thiếu kho mặc định.');
  var me = authMe_();
  if (!me.email || !me.perms) throw new Error('F-05: auth.me thiếu dữ liệu.');
  console.log('PASS test_d04_c01_f05_foundation. C-01 được kiểm thử đầy đủ trong local harness để không ghi phiếu thử vào dữ liệu thật.');
}

function test_a01_schema_validation() {
  var schema = { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'] };
  validateJsonSchema_({ summary: 'Hợp lệ' }, schema, '$');
  var failed = false;
  try { validateJsonSchema_({ wrong: true }, schema, '$'); } catch (error) { failed = true; }
  if (!failed) throw new Error('A-01: schema sai không bị từ chối.');
  console.log('PASS test_a01_schema_validation');
}
