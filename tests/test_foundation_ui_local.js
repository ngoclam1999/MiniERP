const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const index = read('src/Index.html');
const css = read('src/css_components.html');
const ui = read('src/js_ui.html');
const client = read('src/js_client.html');
const enhancements = read('src/js_foundation_enhancements.html');
const settings = read('src/js_settings.html');
const partners = read('src/js_partners.html');
const catalogHr = read('src/js_catalog_hr.html');
const projects = read('src/js_projects.html');
const stock = read('src/js_stock.html');

function check(condition, message) {
  if (!condition) throw new Error(message);
}

check(index.includes("include('src/css_components')"), 'Index chưa include CSS component.');
check(index.includes("include('src/js_ui')"), 'Index chưa include thư viện UI.');
check(index.includes("include('src/js_client')"), 'Index chưa include Client API.');
check(/function\s+table\(/.test(ui), 'Thiếu component bảng.');
check(/function\s+chip\(/.test(ui), 'Thiếu component chip.');
check(/function\s+tabs\(/.test(ui), 'Thiếu component tab.');
check(/function\s+modal\(/.test(ui), 'Thiếu component modal.');
check(/function\s+toast\(/.test(ui), 'Thiếu component toast.');
check(/function\s+formField\(/.test(ui), 'Thiếu component form.');
check(/function\s+allocation\(/.test(ui), 'Thiếu thanh phân bổ.');
check(enhancements.includes("current==='style-guide'"), 'Thiếu route Style Guide.');
check(enhancements.includes("closest('a[href^=\"#\"]')"), 'Hash link chưa được giữ trong iframe Apps Script.');
check(enhancements.includes("addEventListener('hashchange'"), 'Route mở rộng chưa lắng nghe hashchange.');
check(!/\b(?:alert|confirm|prompt)\s*\(/.test(index + ui + client + enhancements), 'Không được gọi alert/confirm/prompt.');
check(client.includes('return new Promise'), 'Client API chưa bọc Promise.');
check(client.includes("error.code==='LOCK_TIMEOUT'"), 'LOCK_TIMEOUT chưa có xử lý riêng.');
check(client.includes("label:'Thử lại'"), 'LOCK_TIMEOUT thiếu nút Thử lại.');
check(css.includes('@media(max-width:760px)'), 'Component chưa có responsive phone.');
check(css.includes('prefers-reduced-motion'), 'Component chưa hỗ trợ reduced motion.');
check(index.includes("include('src/js_settings')"), 'Index chưa include trang Settings.');
check(settings.includes("MiniERP.api.call('settings.list'"), 'Trang Settings chưa đọc cấu hình qua Client API.');
check(settings.includes("MiniERP.api.call('settings.save'"), 'Trang Settings chưa lưu cấu hình qua Client API.');
check(settings.includes("MiniERP.api.call('counter.list'"), 'Trang Settings chưa tải Counters.');
check(index.includes("include('src/js_partners')"), 'Index chưa include trang đối tác.');
check(partners.includes("customers:{title:'Khách hàng'"), 'Thiếu màn hình Khách hàng.');
check(partners.includes("suppliers:{title:'Nhà cung cấp'"), 'Thiếu màn hình Nhà cung cấp.');
check(partners.includes("c.module+'.list'"), 'Danh mục chưa gọi API tìm kiếm.');
check(partners.includes("MiniERP.ui.modal"), 'Form danh mục chưa dùng modal trong trang.');
check(partners.includes('sequence!==requestSequence||requestKind!==currentKind'), 'Danh mục chưa chặn response cũ khi đổi màn hình.');
check(index.includes("include('src/js_stock')"), 'Index chưa include màn hình tồn kho.');
check(stock.includes("MiniERP.api.call('stock.list'"), 'Màn hình kho chưa tải tồn kho.');
check(stock.includes("MiniERP.api.call('stock.card'"), 'Màn hình kho chưa có thẻ kho.');
check(projects.includes("MiniERP.api.call('customer.list'"), 'Form dự án chưa gợi ý khách hàng hiện có.');
check(projects.includes("href=\"#customers\""), 'Form dự án thiếu liên kết tạo khách hàng trước.');
check(projects.includes("MiniERP.api.call('employee.list'"), 'Form dự án chưa gợi ý QLDA hiện có.');
check(projects.includes("href=\"#employees\""), 'Form dự án thiếu liên kết tạo nhân viên trước.');
check(projects.includes("MiniERP.api.call('item.list'"), 'Form BOM chưa gợi ý vật tư hiện có.');
check(catalogHr.includes("MiniERP.api.call('supplier.list'"), 'Form vật tư chưa gợi ý nhà cung cấp hiện có.');

console.log('PASS local F-08 test: shared components, Style Guide, no native dialogs');
console.log('PASS local F-09 test: Promise client, normalized errors, LOCK_TIMEOUT retry');
console.log('PASS local F-10 UI test: admin settings form and read-only counters');
console.log('PASS local D-01/D-02 UI test: customer and supplier CRUD screens');
console.log('PASS local K-03/reference UI test: stock screen and linked-record suggestions');
