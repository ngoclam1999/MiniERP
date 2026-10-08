function test_setup_schema() {
  var firstRun = setup_schema();
  var spreadsheet = SpreadsheetApp.openById(firstRun.spreadsheet_id);
  var snapshotBefore = snapshotMiniErpSchema_(spreadsheet);

  var secondRun = setup_schema();
  var snapshotAfter = snapshotMiniErpSchema_(spreadsheet);

  assertSchemaTest_(firstRun.spreadsheet_id === secondRun.spreadsheet_id, 'Lần chạy thứ hai phải dùng lại cùng Google Sheet.');
  assertSchemaTest_(secondRun.created_spreadsheet === false, 'Lần chạy thứ hai không được tạo Google Sheet mới.');
  assertSchemaTest_(secondRun.created_sheets.length === 0, 'Lần chạy thứ hai không được tạo lại sheet.');
  assertSchemaTest_(secondRun.updated_sheets.length === 0, 'Lần chạy thứ hai không được thêm lại cột.');
  assertSchemaTest_(JSON.stringify(snapshotBefore) === JSON.stringify(snapshotAfter), 'Schema hoặc số dòng đã thay đổi ở lần chạy thứ hai.');
  assertSchemaTest_(Object.keys(MINI_ERP_SCHEMA).length === 40, 'Đặc tả F-02 phải có đúng 40 sheet.');

  Object.keys(MINI_ERP_SCHEMA).forEach(function (sheetName) {
    var sheet = spreadsheet.getSheetByName(sheetName);
    assertSchemaTest_(!!sheet, 'Thiếu sheet ' + sheetName + '.');

    var expectedHeaders = getMiniErpHeaders_(sheetName);
    var actualHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    expectedHeaders.forEach(function (header) {
      assertSchemaTest_(actualHeaders.indexOf(header) !== -1, 'Sheet ' + sheetName + ' thiếu cột ' + header + '.');
    });
  });

  console.log('PASS test_setup_schema: ' + firstRun.spreadsheet_url);
}

function snapshotMiniErpSchema_(spreadsheet) {
  return Object.keys(MINI_ERP_SCHEMA).sort().map(function (sheetName) {
    var sheet = spreadsheet.getSheetByName(sheetName);
    return {
      name: sheetName,
      last_row: sheet.getLastRow(),
      last_column: sheet.getLastColumn(),
      headers: sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0]
    };
  });
}

function assertSchemaTest_(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

