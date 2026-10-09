var MINI_ERP_SETTINGS_KEYS = [
  'ot_multiplier_weekday',
  'trip_allowance_per_day',
  'vietqr_bank_id',
  'vietqr_account_no',
  'vietqr_account_name',
  'alert_soon_days',
  'ai_scan_hour',
  'allow_consumable_without_reserve'
];

function registerSettingsActions_() {
  registerActionOnce_('settings.list', function () {
    requireRole(getAuthContext_(), ['admin']);
    return listSettings_();
  }, false);
  registerActionOnce_('settings.save', function (payload) {
    requireRole(getAuthContext_(), ['admin']);
    return saveSettings_(payload);
  }, true);
  registerActionOnce_('counter.list', function () {
    requireRole(getAuthContext_(), ['admin']);
    return readAll('Counters');
  }, false);
}

function listSettings_() {
  var rows = readAll('Settings');
  var seen = {};
  rows.forEach(function (row) {
    var key = String(row.key || '').trim();
    if (seen[key]) throw apiError('CONFLICT', 'Settings bị trùng khóa: ' + key, 'key');
    seen[key] = true;
  });
  return rows;
}

function saveSettings_(payload) {
  if (!payload || !Array.isArray(payload.entries) || payload.entries.length === 0) {
    throw apiError('VALIDATION', 'Danh sách cấu hình không được để trống.', 'entries');
  }
  var seen = {};
  var saved = payload.entries.map(function (entry) {
    if (!entry || Object.prototype.toString.call(entry) !== '[object Object]') {
      throw apiError('VALIDATION', 'Mỗi cấu hình phải là một object.', 'entries');
    }
    var key = String(entry.key || '').trim();
    if (MINI_ERP_SETTINGS_KEYS.indexOf(key) === -1) {
      throw apiError('VALIDATION', 'Khóa cấu hình không thuộc F-10: ' + key, 'key');
    }
    if (seen[key]) throw apiError('VALIDATION', 'Khóa cấu hình bị lặp: ' + key, 'key');
    seen[key] = true;
    var value = String(entry.value === undefined || entry.value === null ? '' : entry.value).trim();
    validateSettingValue_(key, value);
    var patch = { value: value, note: String(entry.note || '') };
    return findById('Settings', key) ? update('Settings', key, patch) : insert('Settings', { key: key, value: patch.value, note: patch.note });
  });
  return { settings: saved };
}

function validateSettingValue_(key, value) {
  if (value === '') return;
  if (key === 'ot_multiplier_weekday') {
    if (!Number.isFinite(Number(value)) || Number(value) <= 0) throw apiError('VALIDATION', 'Hệ số OT phải lớn hơn 0.', key);
  }
  if (key === 'trip_allowance_per_day' || key === 'alert_soon_days') {
    if (!/^\d+$/.test(value)) throw apiError('VALIDATION', 'Giá trị phải là số nguyên không âm.', key);
  }
  if (key === 'ai_scan_hour') {
    if (!/^\d+$/.test(value) || Number(value) > 23) throw apiError('VALIDATION', 'Giờ quét AI phải từ 0 đến 23.', key);
  }
  if (key === 'allow_consumable_without_reserve' && ['true','false'].indexOf(value) === -1) throw apiError('VALIDATION', 'Cấu hình phải là true hoặc false.', key);
}
