function test_api_contract() {
  ensureF04TestActions_();

  var missing = api({ action: 'missing.action', payload: {} });
  assertApiTest_(missing.ok === false, 'Action không tồn tại phải trả ok=false.');
  assertApiTest_(missing.error.code === 'NOT_FOUND', 'Action không tồn tại phải trả NOT_FOUND.');

  var invalid = api({ action: 'invalid', payload: {} });
  assertApiTest_(invalid.ok === false, 'Action sai định dạng phải trả ok=false.');
  assertApiTest_(invalid.error.code === 'VALIDATION', 'Action sai định dạng phải trả VALIDATION.');

  var read = api({ action: 'test.echo', payload: { value: 7 } });
  assertApiTest_(read.ok === true && read.data.value === 7, 'Action đọc trả sai dữ liệu.');
  console.log('PASS test_api_contract');
}

function test_api_concurrent_start() {
  var properties = PropertiesService.getScriptProperties();
  properties.setProperty('F04_CONCURRENT_VALUE', '0');
  ScriptApp.newTrigger('test_api_concurrent_worker').timeBased().after(1000).create();
  ScriptApp.newTrigger('test_api_concurrent_worker').timeBased().after(1000).create();
  console.log('Đã tạo 2 trigger. Chờ trigger chạy rồi gọi test_api_concurrent_verify().');
}

function test_api_concurrent_worker() {
  ensureF04TestActions_();
  var result = api({ action: 'test.concurrent_write', payload: {} });
  if (!result.ok) {
    throw new Error('Concurrent worker lỗi: ' + result.error.code + ' - ' + result.error.message);
  }
}

function test_api_concurrent_verify() {
  var value = Number(PropertiesService.getScriptProperties().getProperty('F04_CONCURRENT_VALUE'));
  assertApiTest_(value === 2, 'Hai request ghi đồng thời phải cho kết quả 2, nhận được ' + value + '.');
  console.log('PASS test_api_concurrent_verify: ' + value);
}

function ensureF04TestActions_() {
  if (!Object.prototype.hasOwnProperty.call(MINI_ERP_API_ACTIONS, 'test.echo')) {
    registerApiAction_('test.echo', function (payload) {
      return { value: payload.value };
    }, false);
  }

  if (!Object.prototype.hasOwnProperty.call(MINI_ERP_API_ACTIONS, 'test.concurrent_write')) {
    registerApiAction_('test.concurrent_write', function () {
      var properties = PropertiesService.getScriptProperties();
      var current = Number(properties.getProperty('F04_CONCURRENT_VALUE') || 0);
      Utilities.sleep(1000);
      properties.setProperty('F04_CONCURRENT_VALUE', String(current + 1));
      return { value: current + 1 };
    }, true);
  }
}

function assertApiTest_(condition, message) {
  if (!condition) throw new Error(message);
}
