function test_d01_d02_source() {
  var index = HtmlService.createHtmlOutputFromFile('src/Index').getContent();
  var ui = HtmlService.createHtmlOutputFromFile('src/js_partners').getContent();
  if (index.indexOf("include('src/js_partners')") === -1) throw new Error('Index thiếu màn hình đối tác.');
  if (ui.indexOf("customers:{title:'Khách hàng'") === -1) throw new Error('Thiếu màn hình Khách hàng.');
  if (ui.indexOf("suppliers:{title:'Nhà cung cấp'") === -1) throw new Error('Thiếu màn hình Nhà cung cấp.');
  if (ui.indexOf("MiniERP.ui.modal") === -1) throw new Error('Form không dùng modal F-08.');
  console.log('PASS Apps Script D-01/D-02 source test.');
}
