var MINI_ERP_DEFAULT_WAREHOUSES = [
  { wh_id: 'WH-COMMON', name: 'Kho vật tư dùng chung', wh_type: 'common' },
  { wh_id: 'WH-CONSUMABLE', name: 'Kho linh kiện tiêu hao', wh_type: 'consumable' },
  { wh_id: 'WH-FINISHED', name: 'Kho thành phẩm', wh_type: 'finished' }
];

function registerWarehouseActions_() {
  registerActionOnce_('warehouse.list', function () { requireRole(getAuthContext_(), ['director','manager','engineer','purchasing','warehouse','accountant']); return readAll('Warehouses'); }, false);
  registerActionOnce_('warehouse.initialize', function () { requireRole(getAuthContext_(), ['admin']); return initializeDefaultWarehouses_(); }, true);
  registerActionOnce_('warehouse.create', function (p) { requireRole(getAuthContext_(), ['admin']); validateWarehouse_(p); return insert('Warehouses', p); }, true);
  registerActionOnce_('warehouse.update', function (p) { requireRole(getAuthContext_(), ['admin']); validateWarehouse_(p.patch); return update('Warehouses', p.wh_id, p.patch); }, true);
  registerActionOnce_('warehouse.delete', function (p) { requireRole(getAuthContext_(), ['admin']); return deleteWarehouse_(p.wh_id); }, true);
}

function registerActionOnce_(name, handler, isWrite) {
  if (!Object.prototype.hasOwnProperty.call(MINI_ERP_API_ACTIONS, name)) registerApiAction_(name, handler, isWrite);
}

function initializeDefaultWarehouses_() {
  var existing = readAll('Warehouses');
  var ids = existing.map(function (row) { return String(row.wh_id); });
  var missing = MINI_ERP_DEFAULT_WAREHOUSES.filter(function (row) { return ids.indexOf(row.wh_id) === -1; });
  return { created: insertMany('Warehouses', missing), total: existing.length + missing.length };
}

function validateWarehouse_(value) {
  if (!value || !value.name || ['common','consumable','finished'].indexOf(String(value.wh_type)) === -1) {
    throw apiError('VALIDATION', 'Kho cần có tên và wh_type hợp lệ.');
  }
}

function deleteWarehouse_(whId) {
  var referenced = ['StockBalance','StockReservations','StockMovements','GoodsReceiptLines','Stocktakes'].some(function (sheet) {
    return query(sheet, function (row) { return String(row.wh_id || '') === String(whId); }).length > 0;
  });
  if (referenced) throw apiError('CONFLICT', 'Không thể xoá kho đã phát sinh tồn hoặc giao dịch.');
  return softDelete('Warehouses', whId);
}
