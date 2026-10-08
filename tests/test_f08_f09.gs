function test_f08_f09() {
  var index = HtmlService.createHtmlOutputFromFile('src/Index').getContent();
  var css = HtmlService.createHtmlOutputFromFile('src/css_components').getContent();
  var ui = HtmlService.createHtmlOutputFromFile('src/js_ui').getContent();
  var client = HtmlService.createHtmlOutputFromFile('src/js_client').getContent();
  var enhancements = HtmlService.createHtmlOutputFromFile('src/js_foundation_enhancements').getContent();

  assertFoundationUi_(index.indexOf("include('src/js_ui')") !== -1, 'Index thiếu thư viện UI.');
  assertFoundationUi_(ui.indexOf('function modal(') !== -1, 'Thiếu modal dùng chung.');
  assertFoundationUi_(ui.indexOf('function allocation(') !== -1, 'Thiếu thanh phân bổ.');
  assertFoundationUi_(enhancements.indexOf("current==='style-guide'") !== -1, 'Thiếu route Style Guide.');
  assertFoundationUi_(client.indexOf('return new Promise') !== -1, 'Client API chưa trả Promise.');
  assertFoundationUi_(client.indexOf("error.code==='LOCK_TIMEOUT'") !== -1, 'Thiếu xử lý LOCK_TIMEOUT.');
  assertFoundationUi_(client.indexOf("label:'Thử lại'") !== -1, 'Thiếu nút Thử lại.');
  assertFoundationUi_(css.indexOf('prefers-reduced-motion') !== -1, 'Thiếu reduced motion.');
  console.log('PASS Apps Script F-08/F-09 source test.');
}

function assertFoundationUi_(condition, message) {
  if (!condition) throw new Error(message);
}
