function test_lib_db() {
  var properties = PropertiesService.getScriptProperties();
  var previousSpreadsheetId = properties.getProperty(MINI_ERP_SPREADSHEET_PROPERTY);
  var testSpreadsheet = SpreadsheetApp.create('Mini ERP DB test ' + new Date().getTime());

  try {
    ensureMiniErpSchema_(testSpreadsheet);
    properties.setProperty(MINI_ERP_SPREADSHEET_PROPERTY, testSpreadsheet.getId());

    var rows = [];
    for (var index = 1; index <= 1000; index += 1) {
      rows.push({
        cust_id: 'TEST-' + String(index).padStart(4, '0'),
        name: 'Khách hàng thử ' + index
      });
    }

    var startedAt = new Date().getTime();
    insertMany('Customers', rows);
    var elapsedMs = new Date().getTime() - startedAt;
    assertDbTest_(elapsedMs < 10000, 'Chèn 1.000 dòng mất ' + elapsedMs + ' ms, vượt giới hạn 10 giây.');
    assertDbTest_(readAll('Customers').length === 1000, 'readAll không trả đủ 1.000 dòng.');
    assertDbTest_(findById('Customers', 'TEST-0001').name === 'Khách hàng thử 1', 'findById trả sai dữ liệu.');
    assertDbTest_(query('Customers', function (row) { return row.cust_id === 'TEST-1000'; }).length === 1, 'query trả sai dữ liệu.');

    var updated = update('Customers', 'TEST-0001', { name: 'Đã cập nhật' });
    assertDbTest_(updated.name === 'Đã cập nhật', 'update không cập nhật giá trị.');
    softDelete('Customers', 'TEST-0001');
    assertDbTest_(findById('Customers', 'TEST-0001') === null, 'softDelete chưa ẩn bản ghi.');

    testDbHeaderReorder_(testSpreadsheet.getSheetByName('Customers'));
    assertDbTest_(findById('Customers', 'TEST-0002').name === 'Khách hàng thử 2', 'Đổi thứ tự cột làm sai ánh xạ dữ liệu.');

    var firstId = nextId('PO');
    var secondId = nextId('PO');
    assertDbTest_(firstId !== secondId, 'nextId trả mã trùng.');

    console.log('PASS test_lib_db: 1000 rows in ' + elapsedMs + ' ms; ' + firstId + ', ' + secondId);
  } finally {
    if (previousSpreadsheetId) {
      properties.setProperty(MINI_ERP_SPREADSHEET_PROPERTY, previousSpreadsheetId);
    } else {
      properties.deleteProperty(MINI_ERP_SPREADSHEET_PROPERTY);
    }
    DriveApp.getFileById(testSpreadsheet.getId()).setTrashed(true);
  }
}

function testDbHeaderReorder_(sheet) {
  var values = sheet.getDataRange().getValues();
  var firstColumn = values.map(function (row) { return row[0]; });
  var secondColumn = values.map(function (row) { return row[1]; });

  values.forEach(function (row, index) {
    row[0] = secondColumn[index];
    row[1] = firstColumn[index];
  });
  sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
  clearTableCache_('Customers');
}

function test_nextId_concurrent_start() {
  var properties = PropertiesService.getScriptProperties();
  properties.deleteProperty('F03_NEXT_ID_RESULTS');
  properties.setProperty('F03_NEXT_ID_PENDING', '2');
  ScriptApp.newTrigger('test_nextId_concurrent_worker').timeBased().after(1000).create();
  ScriptApp.newTrigger('test_nextId_concurrent_worker').timeBased().after(1000).create();
  console.log('Đã tạo 2 trigger. Chờ trigger chạy rồi gọi test_nextId_concurrent_verify().');
}

function test_nextId_concurrent_worker() {
  var generatedId = nextId('PO');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var properties = PropertiesService.getScriptProperties();
    var results = JSON.parse(properties.getProperty('F03_NEXT_ID_RESULTS') || '[]');
    results.push(generatedId);
    properties.setProperty('F03_NEXT_ID_RESULTS', JSON.stringify(results));
    properties.setProperty('F03_NEXT_ID_PENDING', String(Math.max(0, Number(properties.getProperty('F03_NEXT_ID_PENDING') || 0) - 1)));
  } finally {
    lock.releaseLock();
  }
}

function test_nextId_concurrent_verify() {
  var properties = PropertiesService.getScriptProperties();
  var pending = Number(properties.getProperty('F03_NEXT_ID_PENDING') || 0);
  var results = JSON.parse(properties.getProperty('F03_NEXT_ID_RESULTS') || '[]');

  assertDbTest_(pending === 0, 'Trigger chưa chạy xong. Số trigger còn chờ: ' + pending);
  assertDbTest_(results.length === 2, 'Cần đúng 2 kết quả, nhận được ' + results.length + '.');
  assertDbTest_(results[0] !== results[1], 'Hai trigger tạo mã trùng: ' + results[0]);
  console.log('PASS test_nextId_concurrent_verify: ' + results.join(', '));
}

function assertDbTest_(condition, message) {
  if (!condition) throw new Error(message);
}

