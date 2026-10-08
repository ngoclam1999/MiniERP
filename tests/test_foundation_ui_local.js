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

console.log('PASS local F-08 test: shared components, Style Guide, no native dialogs');
console.log('PASS local F-09 test: Promise client, normalized errors, LOCK_TIMEOUT retry');
console.log('PASS local F-10 UI test: admin settings form and read-only counters');
