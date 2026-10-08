function test_f10_settings_source() {
  var apiSource = HtmlService.createHtmlOutputFromFile('src/js_settings').getContent();
  var indexSource = HtmlService.createHtmlOutputFromFile('src/Index').getContent();
  if (indexSource.indexOf("include('src/js_settings')") === -1) throw new Error('Index thiếu trang Settings.');
  if (apiSource.indexOf("MiniERP.api.call('settings.list'") === -1) throw new Error('Settings UI thiếu action list.');
  if (apiSource.indexOf("MiniERP.api.call('settings.save'") === -1) throw new Error('Settings UI thiếu action save.');
  if (apiSource.indexOf("MiniERP.api.call('counter.list'") === -1) throw new Error('Settings UI thiếu Counters.');
  console.log('PASS Apps Script F-10 source test.');
}
