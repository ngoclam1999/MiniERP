var MINI_ERP_ITEM_CATEGORIES = ['plc','servo','sensor','cylinder','mech','electrical','consumable','other'];
var MINI_ERP_ITEM_WAREHOUSE_TYPES = ['common','consumable','finished'];

function registerItemActions_() {
  registerActionOnce_('item.list', function (p) { requireRole(getAuthContext_(), ['director','manager','engineer','purchasing','warehouse','accountant','employee']); return listItems_(p && p.search); }, false);
  registerActionOnce_('item.create', function (p) { requireRole(getAuthContext_(), ['purchasing']); return createItem_(p); }, true);
  registerActionOnce_('item.update', function (p) { requireRole(getAuthContext_(), ['purchasing']); return updateItem_(p && p.sku, p && p.patch); }, true);
  registerActionOnce_('item.import_preview', function (p) { requireRole(getAuthContext_(), ['purchasing']); return previewItemImport_(p && p.rows); }, false);
  registerActionOnce_('item.import_commit', function (p) { requireRole(getAuthContext_(), ['purchasing']); return commitItemImport_(p && p.rows); }, true);
}

function listItems_(search) {
  var term = String(search || '').trim().toLowerCase();
  return readAll('Items').filter(function (row) {
    return !term || ['sku','name','category','spec','barcode'].some(function (field) { return String(row[field] || '').toLowerCase().indexOf(term) !== -1; });
  });
}

function createItem_(payload) {
  var value = normalizeItem_(payload, false);
  if (findById('Items', value.sku)) throw apiError('CONFLICT', 'SKU đã tồn tại.', 'sku');
  return insert('Items', value);
}

function updateItem_(sku, patch) {
  if (!findById('Items', sku)) throw apiError('NOT_FOUND', 'Không tìm thấy vật tư: ' + sku);
  return update('Items', sku, normalizeItem_(patch, true));
}

function normalizeItem_(value, isPatch) {
  if (!value || Object.prototype.toString.call(value) !== '[object Object]') throw apiError('VALIDATION', 'Dữ liệu vật tư phải là object.');
  var result = {};
  MINI_ERP_SCHEMA.Items.forEach(function (field) { if (Object.prototype.hasOwnProperty.call(value, field)) result[field] = String(value[field] === null || value[field] === undefined ? '' : value[field]).trim(); });
  if (!isPatch && (!result.sku || !result.name || !result.unit || !result.wh_type)) throw apiError('VALIDATION', 'SKU, tên, đơn vị và loại kho không được để trống.');
  if (result.category && MINI_ERP_ITEM_CATEGORIES.indexOf(result.category) === -1) throw apiError('VALIDATION', 'Nhóm vật tư không hợp lệ.', 'category');
  if (result.wh_type && MINI_ERP_ITEM_WAREHOUSE_TYPES.indexOf(result.wh_type) === -1) throw apiError('VALIDATION', 'Loại kho không hợp lệ.', 'wh_type');
  ['min_stock','lead_time_days','avg_cost_vnd'].forEach(function (field) {
    if (result[field] !== undefined && result[field] !== '' && (!/^\d+(\.\d+)?$/.test(result[field]) || Number(result[field]) < 0)) throw apiError('VALIDATION', field + ' phải là số không âm.', field);
  });
  return result;
}

function previewItemImport_(rows) {
  if (!Array.isArray(rows) || rows.length === 0) throw apiError('VALIDATION', 'Chưa có dòng dữ liệu để nhập.', 'rows');
  if (rows.length > 1000) throw apiError('VALIDATION', 'Mỗi lần chỉ nhập tối đa 1.000 dòng.', 'rows');
  var existing = {};
  readAll('Items').forEach(function (row) { existing[String(row.sku).toLowerCase()] = true; });
  var seen = {}, valid = [], errors = [];
  rows.forEach(function (row, index) {
    try {
      var value = normalizeItem_(row, false), key = value.sku.toLowerCase();
      if (existing[key] || seen[key]) throw apiError('CONFLICT', 'SKU đã tồn tại hoặc bị lặp trong file.', 'sku');
      seen[key] = true; valid.push(value);
    } catch (error) { errors.push({ row: index + 2, field: error.field || '', message: error.message }); }
  });
  return { valid_rows: valid, errors: errors, total: rows.length };
}

function commitItemImport_(rows) {
  var preview = previewItemImport_(rows);
  if (preview.errors.length) throw apiError('VALIDATION', 'Dữ liệu còn lỗi; hãy sửa trước khi nhập.', 'rows');
  return { created: insertMany('Items', preview.valid_rows).length, total: preview.total };
}
