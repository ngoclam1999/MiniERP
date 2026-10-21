'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');

class MockRange {
  constructor(sheet, row, column, rowCount = 1, columnCount = 1) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.rowCount = rowCount;
    this.columnCount = columnCount;
  }

  setValues(values) {
    for (let rowOffset = 0; rowOffset < this.rowCount; rowOffset += 1) {
      for (let columnOffset = 0; columnOffset < this.columnCount; columnOffset += 1) {
        this.sheet.setCell(
          this.row + rowOffset,
          this.column + columnOffset,
          values[rowOffset][columnOffset]
        );
      }
    }
    return this;
  }

  getDisplayValues() {
    const values = [];
    for (let rowOffset = 0; rowOffset < this.rowCount; rowOffset += 1) {
      const row = [];
      for (let columnOffset = 0; columnOffset < this.columnCount; columnOffset += 1) {
        row.push(String(this.sheet.getCell(this.row + rowOffset, this.column + columnOffset) || ''));
      }
      values.push(row);
    }
    return values;
  }

  getValues() {
    const values = [];
    for (let rowOffset = 0; rowOffset < this.rowCount; rowOffset += 1) {
      const row = [];
      for (let columnOffset = 0; columnOffset < this.columnCount; columnOffset += 1) {
        row.push(this.sheet.getCell(this.row + rowOffset, this.column + columnOffset));
      }
      values.push(row);
    }
    return values;
  }

  isBlank() {
    return this.getDisplayValues().every((row) => row.every((value) => value === ''));
  }
}

class MockSheet {
  constructor(name) {
    this.name = name;
    this.cells = [];
    this.frozenRows = 0;
    this.maxRows = 1000;
    this.maxColumns = 26;
  }

  getName() { return this.name; }
  setFrozenRows(count) { this.frozenRows = count; }
  getRange(rowOrA1, column, rowCount, columnCount) {
    if (rowOrA1 === 'A1') return new MockRange(this, 1, 1, 1, 1);
    return new MockRange(this, rowOrA1, column, rowCount, columnCount);
  }
  getDataRange() {
    return new MockRange(this, 1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1));
  }
  getMaxRows() { return this.maxRows; }
  getMaxColumns() { return this.maxColumns; }
  insertRowsAfter(_afterPosition, count) { this.maxRows += count; }
  insertColumnsAfter(_afterPosition, count) { this.maxColumns += count; }
  getLastRow() {
    let last = 0;
    this.cells.forEach((row, index) => {
      if (row && row.some((value) => value !== '' && value !== undefined)) last = index + 1;
    });
    return last;
  }
  getLastColumn() {
    let last = 0;
    this.cells.forEach((row) => {
      if (!row) return;
      row.forEach((value, index) => {
        if (value !== '' && value !== undefined) last = Math.max(last, index + 1);
      });
    });
    return last;
  }
  setCell(row, column, value) {
    if (!this.cells[row - 1]) this.cells[row - 1] = [];
    this.cells[row - 1][column - 1] = value;
  }
  getCell(row, column) {
    return this.cells[row - 1]?.[column - 1] ?? '';
  }
}

class MockSpreadsheet {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.sheets = [new MockSheet('Sheet1')];
  }
  getId() { return this.id; }
  getUrl() { return `https://docs.google.com/spreadsheets/d/${this.id}`; }
  getSheets() { return this.sheets.slice(); }
  getSheetByName(name) { return this.sheets.find((sheet) => sheet.name === name) || null; }
  insertSheet(name) {
    const sheet = new MockSheet(name);
    this.sheets.push(sheet);
    return sheet;
  }
  deleteSheet(sheet) { this.sheets = this.sheets.filter((candidate) => candidate !== sheet); }
}

const propertyValues = new Map();
const spreadsheets = new Map();
const cacheValues = new Map();
let nextSpreadsheetId = 1;

const context = {
  console,
  PropertiesService: {
    getScriptProperties() {
      return {
        getProperty(key) { return propertyValues.get(key) || null; },
        setProperty(key, value) { propertyValues.set(key, value); }
      };
    }
  },
  SpreadsheetApp: {
    create(name) {
      const spreadsheet = new MockSpreadsheet(`sheet-${nextSpreadsheetId++}`, name);
      spreadsheets.set(spreadsheet.getId(), spreadsheet);
      return spreadsheet;
    },
    openById(id) {
      const spreadsheet = spreadsheets.get(id);
      if (!spreadsheet) throw new Error(`Unknown spreadsheet ${id}`);
      return spreadsheet;
    }
  },
  Utilities: {
    formatDate(_date, _timezone, format) {
      return format === 'yyMM' ? '2610' : '2026-10-06T12:00:00';
    },
    DigestAlgorithm: { SHA_256: 'SHA_256' },
    Charset: { UTF_8: 'UTF_8' },
    computeDigest(_algorithm, value) { return Array.from(crypto.createHash('sha256').update(value).digest()); },
    base64EncodeWebSafe(bytes) { return Buffer.from(bytes.map((value) => value < 0 ? value + 256 : value)).toString('base64url'); }
  },
  Session: {
    getActiveUser() {
      return { getEmail() { return 'test@example.com'; } };
    }
  },
  LockService: {
    getScriptLock() {
      return {
        tryLock() { return true; },
        releaseLock() {}
      };
    }
  },
  CacheService: {
    getScriptCache() {
      return {
        get(key) { return cacheValues.get(key) || null; },
        put(key, value) { cacheValues.set(key, value); },
        remove(key) { cacheValues.delete(key); }
      };
    }
  }
};

vm.createContext(context);
vm.runInContext(fs.readFileSync('src/lib_schema.gs', 'utf8'), context, { filename: 'src/lib_schema.gs' });
vm.runInContext(fs.readFileSync('src/lib_api.gs', 'utf8'), context, { filename: 'src/lib_api.gs' });
vm.runInContext(fs.readFileSync('src/lib_db.gs', 'utf8'), context, { filename: 'src/lib_db.gs' });
vm.runInContext(fs.readFileSync('src/lib_notifications.gs', 'utf8'), context, { filename: 'src/lib_notifications.gs' });
vm.runInContext(fs.readFileSync('src/lib_auth.gs', 'utf8'), context, { filename: 'src/lib_auth.gs' });
vm.runInContext(fs.readFileSync('src/lib_ai.gs', 'utf8'), context, { filename: 'src/lib_ai.gs' });
vm.runInContext(fs.readFileSync('src/api_warehouses.gs', 'utf8'), context, { filename: 'src/api_warehouses.gs' });
vm.runInContext(fs.readFileSync('src/api_ledger.gs', 'utf8'), context, { filename: 'src/api_ledger.gs' });
vm.runInContext(fs.readFileSync('src/api_settings.gs', 'utf8'), context, { filename: 'src/api_settings.gs' });
vm.runInContext(fs.readFileSync('src/api_partners.gs', 'utf8'), context, { filename: 'src/api_partners.gs' });
vm.runInContext(fs.readFileSync('src/api_items.gs', 'utf8'), context, { filename: 'src/api_items.gs' });
vm.runInContext(fs.readFileSync('src/api_employees.gs', 'utf8'), context, { filename: 'src/api_employees.gs' });
vm.runInContext(fs.readFileSync('src/api_hr_skills.gs', 'utf8'), context, { filename: 'src/api_hr_skills.gs' });
vm.runInContext(fs.readFileSync('src/api_projects.gs', 'utf8'), context, { filename: 'src/api_projects.gs' });
vm.runInContext(fs.readFileSync('src/api_bom_costs.gs', 'utf8'), context, { filename: 'src/api_bom_costs.gs' });
vm.runInContext(fs.readFileSync('src/api_stock.gs', 'utf8'), context, { filename: 'src/api_stock.gs' });
vm.runInContext(fs.readFileSync('src/api_procurement.gs', 'utf8'), context, { filename: 'src/api_procurement.gs' });
vm.runInContext(fs.readFileSync('src/api_tasks.gs', 'utf8'), context, { filename: 'src/api_tasks.gs' });
vm.runInContext(fs.readFileSync('src/Code.gs', 'utf8'), context, { filename: 'src/Code.gs' });

const first = context.setup_schema();
assert.equal(first.created_spreadsheet, true);
assert.equal(first.created_sheets.length, 40);

const spreadsheet = spreadsheets.get(first.spreadsheet_id);
assert.equal(spreadsheet.getSheets().length, 40);
assert.equal(spreadsheet.getSheetByName('Sheet1'), null);
assert.equal(context.readAll('Warehouses').length, 3);

const settings = spreadsheet.getSheetByName('Settings');
settings.setCell(2, 1, 'sentinel_key');
settings.setCell(2, 2, 'sentinel_value');

const second = context.setup_schema();
assert.equal(second.created_spreadsheet, false);
assert.equal(second.created_sheets.length, 0);
assert.equal(second.updated_sheets.length, 0);
assert.equal(settings.getCell(2, 1), 'sentinel_key');
assert.equal(settings.getCell(2, 2), 'sentinel_value');

assert.deepEqual(
  spreadsheet.getSheetByName('BOM').getRange(1, 1, 1, 14).getDisplayValues()[0],
  ['bom_id', 'project_id', 'sku', 'qty_required', 'need_date', 'qty_reserved', 'qty_ordered', 'qty_issued', 'note', 'deleted_at', 'created_at', 'created_by', 'updated_at', 'updated_by']
);

console.log('PASS local schema test: 40 sheets, idempotent, sentinel data preserved');

const customerRows = Array.from({ length: 1000 }, (_, index) => ({
  cust_id: `LOCAL-${String(index + 1).padStart(4, '0')}`,
  name: `Khách hàng ${index + 1}`
}));
context.insertMany('Customers', customerRows);
assert.equal(context.readAll('Customers').length, 1000);
assert.equal(context.findById('Customers', 'LOCAL-0001').name, 'Khách hàng 1');
assert.equal(context.query('Customers', (row) => row.cust_id === 'LOCAL-1000').length, 1);
assert.equal(context.update('Customers', 'LOCAL-0001', { name: 'Đã cập nhật' }).name, 'Đã cập nhật');

const customerSheet = spreadsheet.getSheetByName('Customers');
for (let row = 1; row <= customerSheet.getLastRow(); row += 1) {
  const first = customerSheet.getCell(row, 1);
  const secondValue = customerSheet.getCell(row, 2);
  customerSheet.setCell(row, 1, secondValue);
  customerSheet.setCell(row, 2, first);
}
context.clearTableCache_('Customers');
assert.equal(context.findById('Customers', 'LOCAL-0002').name, 'Khách hàng 2');

context.softDelete('Customers', 'LOCAL-0001');
assert.equal(context.findById('Customers', 'LOCAL-0001'), null);

const firstCounterId = context.nextId('PO');
const secondCounterId = context.nextId('PO');
assert.equal(firstCounterId, 'PO-2610-001');
assert.equal(secondCounterId, 'PO-2610-002');

console.log('PASS local db test: CRUD, 1000-row batch, soft delete, sequential counter');

const missingAction = context.api({ action: 'missing.action', payload: {} });
assert.equal(missingAction.ok, false);
assert.equal(missingAction.error.code, 'NOT_FOUND');

context.registerApiAction_('test.read', (payload) => ({ echo: payload.value }), false);
assert.deepEqual(
  JSON.parse(JSON.stringify(context.api({ action: 'test.read', payload: { value: 7 } }))),
  { ok: true, data: { echo: 7 } }
);

context.registerApiAction_('test.write', () => context.insert('Customers', {
  cust_id: 'API-WRITE-001',
  name: 'Ghi qua API'
}), true);
assert.equal(context.api({ action: 'test.write', payload: {} }).ok, true);
assert.equal(context.findById('Customers', 'API-WRITE-001').name, 'Ghi qua API');

const originalLockService = context.LockService;
context.LockService = {
  getScriptLock() {
    return {
      tryLock() { return false; },
      releaseLock() { throw new Error('Không được release lock khi tryLock thất bại.'); }
    };
  }
};
context.registerApiAction_('test.lock_timeout', () => 'unreachable', true);
const lockTimeout = context.api({ action: 'test.lock_timeout', payload: {} });
assert.equal(lockTimeout.ok, false);
assert.equal(lockTimeout.error.code, 'LOCK_TIMEOUT');
context.LockService = originalLockService;

console.log('PASS local api test: routing, NOT_FOUND, nested write lock, LOCK_TIMEOUT');

const auditsBeforeSensitiveTest = context.readAll('AuditLog').length;
context.insert('EmployeeSensitive', {
  emp_id: 'EMP-SENSITIVE-001',
  id_card_no: '079123456789',
  tax_code: 'TAX-001'
});
context.insert('Employees', {
  emp_id: 'EMP-SENSITIVE-001',
  full_name: 'Nhân viên thử',
  bank_account: '0123456789'
});
context.update('Employees', 'EMP-SENSITIVE-001', { bank_account: '9876543210' });

const sensitiveAudits = context.readAll('AuditLog').slice(auditsBeforeSensitiveTest);
assert.equal(sensitiveAudits.length, 3);
const serializedSensitiveAudits = JSON.stringify(sensitiveAudits);
assert.equal(serializedSensitiveAudits.includes('079123456789'), false);
assert.equal(serializedSensitiveAudits.includes('0123456789'), false);
assert.equal(serializedSensitiveAudits.includes('9876543210'), false);
assert.equal(serializedSensitiveAudits.includes('id_card_no'), true);
assert.equal(serializedSensitiveAudits.includes('bank_account'), true);

const notification = context.createNotification(
  'receiver@example.com',
  'Thông báo thử',
  'Nội dung thử',
  '#test'
);
assert.equal(notification.to_user, 'receiver@example.com');
assert.equal(context.listUnreadNotifications('receiver@example.com').length, 1);

console.log('PASS local audit/notification test: automatic audit, sensitive values omitted, unread notification');

context.insert('Users', { email: 'test@example.com', emp_id: 'EMP-001', role: 'admin', extra_roles: '[]', status: 'active' });
context.insert('Employees', { emp_id: 'EMP-001', full_name: 'Quản trị thử' });
const me = context.api({ action: 'auth.me', payload: {} });
assert.equal(me.ok, true);
assert.equal(me.data.role, 'admin');
assert.equal(me.data.perms.settings, 'rw');
const ownNotification = context.createNotification('test@example.com', 'Thông báo của tôi', 'Nội dung', '#projects');
assert.ok(context.api({ action: 'notification.list', payload: {} }).data.some((row) => row.id === ownNotification.id));
assert.equal(context.api({ action: 'notification.mark_read', payload: { id: notification.id } }).error.code, 'FORBIDDEN');
assert.ok(context.api({ action: 'notification.mark_read', payload: { id: ownNotification.id } }).data.read_at);
assert.equal(context.api({ action: 'notification.list', payload: {} }).data.some((row) => row.id === ownNotification.id), false);

context.insert('CashAccounts', { acct_id: 'CASH-01', name: 'Tiền mặt', type: 'cash', opening_balance_vnd: 1000000 });
const receipt = context.api({ action: 'ledger.entry_create', payload: { date: '2026-10-06', kind: 'in', acct_id: 'CASH-01', amount_vnd: 500000, description: 'Thu thử' } });
const payment = context.api({ action: 'ledger.entry_create', payload: { date: '2026-10-06', kind: 'out', acct_id: 'CASH-01', amount_vnd: 200000, description: 'Chi thử' } });
assert.equal(receipt.data.no, 'PT-0001');
assert.equal(payment.data.no, 'PC-0001');
assert.equal(context.getAccountBalance_('CASH-01').balance_vnd, 1300000);
assert.equal(context.api({ action: 'ledger.reverse', payload: { no: 'PC-0001', date: '2026-10-06' } }).ok, true);
assert.equal(context.getAccountBalance_('CASH-01').balance_vnd, 1500000);

console.log('PASS local D-04/C-01/F-05 test: warehouses, ledger balance/reversal, auth permissions');

const settingsSave = context.api({ action: 'settings.save', payload: { entries: [
  { key: 'ot_multiplier_weekday', value: '1.5', note: 'Hệ số OT' },
  { key: 'vietqr_account_no', value: '0123456789', note: 'Số tài khoản' },
  { key: 'ai_scan_hour', value: '6', note: 'Giờ quét' }
] } });
assert.equal(settingsSave.ok, true);
assert.equal(context.api({ action: 'settings.list', payload: {} }).data.find((row) => row.key === 'ot_multiplier_weekday').value, '1.5');
assert.equal(context.api({ action: 'counter.list', payload: {} }).ok, true);
assert.equal(context.api({ action: 'settings.save', payload: { entries: [{ key: 'ai_scan_hour', value: '24' }] } }).error.code, 'VALIDATION');
const settingsAudit = context.readAll('AuditLog').filter((row) => row.entity === 'Settings' && row.entity_id === 'vietqr_account_no').at(-1);
assert.equal(settingsAudit.after_json.includes('0123456789'), false);
assert.equal(settingsAudit.after_json.includes('[REDACTED]'), true);
context.update('Users', 'test@example.com', { role: 'director' });
assert.equal(context.api({ action: 'settings.list', payload: {} }).error.code, 'FORBIDDEN');
context.update('Users', 'test@example.com', { role: 'admin' });
console.log('PASS local F-10 test: admin Settings save/list, read-only Counters, validation, sensitive audit');

const customerCreate = context.api({ action: 'customer.create', payload: { cust_id: 'CUST-TEST-001', name: 'Khách hàng thử', tax_code: 'TAX-CUST-001', contact_name: 'Liên hệ A' } });
assert.equal(customerCreate.ok, true);
assert.equal(context.api({ action: 'customer.create', payload: { cust_id: 'CUST-TEST-002', name: 'Trùng thuế', tax_code: 'TAX-CUST-001' } }).error.code, 'CONFLICT');
assert.equal(context.api({ action: 'customer.list', payload: { search: 'liên hệ a' } }).data.length, 1);
assert.equal(context.api({ action: 'customer.update', payload: { cust_id: 'CUST-TEST-001', patch: { name: 'Khách hàng đã sửa' } } }).data.name, 'Khách hàng đã sửa');

const supplierCreate = context.api({ action: 'supplier.create', payload: { sup_id: 'SUP-TEST-001', name: 'Nhà cung cấp thử', tax_code: 'TAX-SUP-001', payment_terms: 'Cọc 30%, còn lại net 15', avg_lead_days: 12 } });
assert.equal(supplierCreate.ok, true);
assert.equal(context.api({ action: 'supplier.update', payload: { sup_id: 'SUP-TEST-001', patch: { payment_terms: 'Net 30', avg_lead_days: 9 } } }).data.payment_terms, 'Net 30');
assert.equal(context.api({ action: 'supplier.list', payload: { search: 'net 30' } }).data.length, 1);
assert.equal(context.api({ action: 'supplier.create', payload: { sup_id: 'SUP-TEST-002', name: 'Lead lỗi', avg_lead_days: -1 } }).error.code, 'VALIDATION');
const firstSeed = context.seed_sample_data();
const secondSeed = context.seed_sample_data();
assert.equal(firstSeed.customers.created.length, 2);
assert.equal(firstSeed.suppliers.created.length, 2);
assert.equal(secondSeed.customers.created.length, 0);
assert.equal(secondSeed.suppliers.created.length, 0);
assert.equal(firstSeed.items.created.length, 3);
assert.equal(firstSeed.employees.created.length, 2);
assert.equal(firstSeed.prs.created.length, 3);
assert.equal(firstSeed.pos.created.length, 2);
assert.equal(firstSeed.po_lines.created.length, 2);
assert.equal(secondSeed.items.created.length, 0);
assert.equal(secondSeed.employees.created.length, 0);
assert.equal(secondSeed.prs.created.length, 0);
assert.equal(secondSeed.pos.created.length, 0);
assert.equal(secondSeed.po_lines.created.length, 0);
const receiptScan = context.api({ action: 'gr.scan', payload: { code: 'DEMO-ITEM-0002' } });
assert.equal(receiptScan.ok, true);
assert.equal(receiptScan.data.po_lines[0].line_id, 'PO-DEMO-001-1');
assert.equal(context.api({ action: 'gr.post', payload: { lines: [{ po_line_id: 'PO-DEMO-001-1', qty: 1 }] } }).data.receipt.status, 'posted');
assert.equal(context.findById('PO', 'PO-DEMO-001').status, 'partial');
assert.equal(context.api({ action: 'gr.post', payload: { lines: [{ po_line_id: 'PO-DEMO-001-1', qty: 1 }] } }).data.receipt.status, 'posted');
assert.equal(context.findById('PO', 'PO-DEMO-001').status, 'received');
assert.equal(Number(context.findById('BOM', 'BOM-DEMO-002').qty_ordered), 0);
assert.equal(Number(context.findById('BOM', 'BOM-DEMO-002').qty_reserved), 2);
const noPoReceipt = context.api({ action: 'gr.post', payload: { lines: [{ sku: 'SENSOR-DEMO-001', qty: 1 }] } });
assert.equal(noPoReceipt.ok, true);
assert.match(noPoReceipt.data.warning, /không có PO/i);
assert.equal(context.api({ action: 'customer.delete', payload: { cust_id: 'CUST-TEST-001' } }).ok, true);
assert.equal(context.api({ action: 'supplier.delete', payload: { sup_id: 'SUP-TEST-001' } }).ok, true);
console.log('PASS local D-01/D-02/K-06 test: master data, idempotent seed, scan/partial receipt, BOM reservation, no-PO warning');

const itemCreate = context.api({ action: 'item.create', payload: { sku: 'ITEM-TEST-001', name: 'Cảm biến thử', category: 'sensor', unit: 'cái', wh_type: 'common', barcode: 'BAR-001' } });
assert.equal(itemCreate.ok, true);
assert.equal(context.api({ action: 'item.list', payload: { search: 'BAR-001' } }).data.length, 1);
assert.equal(context.api({ action: 'item.create', payload: { sku: 'ITEM-TEST-001', name: 'Trùng', unit: 'cái', wh_type: 'common' } }).error.code, 'CONFLICT');
const bulkRows = Array.from({ length: 500 }, (_, index) => ({ sku: `BULK-${String(index + 1).padStart(3, '0')}`, name: `Vật tư ${index + 1}`, category: 'other', unit: 'cái', wh_type: 'common', barcode: `BULK-BAR-${index + 1}` }));
const bulkStart = Date.now();
assert.equal(context.api({ action: 'item.import_preview', payload: { rows: bulkRows } }).data.errors.length, 0);
assert.equal(context.api({ action: 'item.import_commit', payload: { rows: bulkRows } }).data.created, 500);
assert.ok(Date.now() - bulkStart < 30000);
const invalidPreview = context.api({ action: 'item.import_preview', payload: { rows: [{ sku: 'BULK-001', name: '', unit: 'cái', wh_type: 'common' }] } }).data;
assert.equal(invalidPreview.errors[0].row, 2);
console.log('PASS local D-03 test: CRUD, barcode search, 500-row import, row errors, unique SKU');

context.update('Users', 'test@example.com', { role: 'hr', emp_id: 'EMP-DEMO-001' });
assert.equal(context.api({ action: 'employee.get', payload: { emp_id: 'EMP-DEMO-001' } }).data.id_card_no, '079123456312');
const reveal = context.api({ action: 'employee.reveal', payload: { emp_id: 'EMP-DEMO-001', field: 'id_card_no' } });
assert.equal(reveal.data.value, '079123456312');
assert.equal(context.readAll('AuditLog').filter((row) => row.action === 'employee.reveal').length, 1);
context.update('Users', 'test@example.com', { role: 'manager' });
assert.equal(context.api({ action: 'employee.get', payload: { emp_id: 'EMP-DEMO-001' } }).data.id_card_no, '079•••••••312');
assert.equal(context.api({ action: 'employee.reveal', payload: { emp_id: 'EMP-DEMO-001', field: 'id_card_no' } }).error.code, 'FORBIDDEN');
context.update('Users', 'test@example.com', { role: 'admin' });
console.log('PASS local H-01 test: employee list/detail, role masking, reveal audit');

context.update('Users', 'test@example.com', { role: 'hr' });
assert.equal(context.api({ action: 'skill.upsert', payload: { emp_id: 'EMP-DEMO-001', skill: 'PLC', level: 'advanced' } }).ok, true);
assert.equal(context.api({ action: 'skill.upsert', payload: { emp_id: 'EMP-DEMO-001', skill: 'PLC', level: 'expert' } }).data.level, 'expert');
assert.equal(context.api({ action: 'cert.add', payload: { emp_id: 'EMP-DEMO-001', name: 'An toàn điện', issued_date: '2026-01-01', expiry_date: '2026-10-10', file_url: 'https://drive.google.com/demo' } }).ok, true);
assert.equal(context.api({ action: 'cert.list_expiring', payload: { days: 60 } }).data.length, 1);
assert.equal(context.scanCertificateExpiryAlerts().created, 1);
assert.equal(context.scanCertificateExpiryAlerts().created, 0);
console.log('PASS local H-02 test: skill upsert, certificate Drive URL, expiry list and idempotent alert');

context.update('Users', 'test@example.com', { role: 'admin', emp_id: 'EMP-DEMO-001' });
const project = context.api({ action: 'project.create', payload: { name: 'Máy đóng gói Demo', cust_id: 'CUST-DEMO-001', contract_value_vnd: 100000000, start_date: '2026-10-08', due_date: '2027-01-31', pm_emp_id: 'EMP-DEMO-001', budget_vnd: 70000000, status: 'active' } });
assert.equal(project.ok, true);
assert.equal(project.data.payments.length, 3);
assert.equal(project.data.payments.reduce((sum, line) => sum + Number(line.percent), 0), 100);
const badPlan = project.data.payments.map((line, i) => ({ pay_id: line.pay_id, name: line.name, percent: [40, 40, 30][i] }));
assert.equal(context.api({ action: 'payment.update_plan', payload: { project_id: project.data.project_id, lines: badPlan } }).error.field, 'percent');
const goodPlan = project.data.payments.map((line, i) => ({ pay_id: line.pay_id, name: line.name, percent: [40, 40, 20][i] }));
assert.equal(context.api({ action: 'payment.update_plan', payload: { project_id: project.data.project_id, lines: goodPlan } }).ok, true);
assert.equal(context.api({ action: 'project.list', payload: {} }).data[0].progress_pct, 0);
console.log('PASS local B-01/B-02/B-03 test: project CRUD/detail UI data, generated ID, default and validated payment plan');

const prerequisiteTask = context.api({ action: 'task.create', payload: { project_id: project.data.project_id, title: 'Lắp tủ điện', type: 'electrical_cabinet', assignee_emp_id: 'EMP-DEMO-001', due_date: '2026-12-01' } });
assert.equal(prerequisiteTask.ok, true);
const dependentTask = context.api({ action: 'task.create', payload: { project_id: project.data.project_id, title: 'Lập trình PLC', type: 'plc', assignee_emp_id: 'EMP-DEMO-001', due_date: '2027-02-01', depends_on: prerequisiteTask.data.task.task_id } });
assert.match(dependentTask.data.warning, /vượt hạn dự án/i);
assert.equal(context.api({ action: 'task.move', payload: { task_id: dependentTask.data.task.task_id, status: 'doing' } }).error.code, 'INVALID_STATE');
assert.equal(context.api({ action: 'task.move', payload: { task_id: prerequisiteTask.data.task.task_id, status: 'doing' } }).data.status, 'doing');
assert.equal(context.api({ action: 'task.move', payload: { task_id: prerequisiteTask.data.task.task_id, status: 'qc' } }).data.status, 'qc');
assert.equal(context.api({ action: 'task.move', payload: { task_id: prerequisiteTask.data.task.task_id, status: 'done' } }).data.status, 'done');
assert.equal(context.api({ action: 'task.move', payload: { task_id: dependentTask.data.task.task_id, status: 'doing' } }).data.status, 'doing');
assert.equal(context.api({ action: 'task.move', payload: { task_id: dependentTask.data.task.task_id, status: 'qc' } }).data.status, 'qc');
assert.equal(context.api({ action: 'task.move', payload: { task_id: dependentTask.data.task.task_id, status: 'doing' } }).error.field, 'reason');
assert.equal(context.api({ action: 'task.move', payload: { task_id: dependentTask.data.task.task_id, status: 'doing', reason: 'Cần sửa trình tự điều khiển' } }).data.return_reason, 'Cần sửa trình tự điều khiển');
assert.equal(context.api({ action: 'task.update', payload: { task_id: dependentTask.data.task.task_id, patch: { depends_on: dependentTask.data.task.task_id } } }).error.field, 'depends_on');
context.update('Users', 'test@example.com', { role: 'engineer', emp_id: 'EMP-DEMO-001' });
assert.equal(context.api({ action: 'task.create', payload: { project_id: project.data.project_id, title: 'Việc của người khác', assignee_emp_id: 'EMP-DEMO-002', due_date: '2026-12-01' } }).error.code, 'FORBIDDEN');
context.update('Users', 'test@example.com', { role: 'admin', emp_id: 'EMP-DEMO-001' });
context.update('ProjectPayments', project.data.payments[0].pay_id, { due_date: '2026-12-10' });
context.insert('PO', { po_id: 'CAL-PO', sup_id: 'SUP-DEMO-001', order_date: '2026-12-01', status: 'confirmed', total_vnd: 0 });
context.insert('POLines', { line_id: 'CAL-PO-LINE-1', po_id: 'CAL-PO', sku: 'PLC-DEMO-001', project_id: project.data.project_id, qty: 1, eta_date: '2026-12-12', need_date: '2026-12-15', qty_received: 0 });
context.insert('Requests', { req_id: 'REQ-CAL-TRIP', type: 'trip', emp_id: 'EMP-DEMO-001', project_id: project.data.project_id, from_date: '2026-12-14', to_date: '2026-12-16', status: 'approved' });
context.update('Projects', project.data.project_id, { due_date: '2026-12-31' });
const calendarEvents = context.api({ action: 'calendar.list', payload: { month: '2026-12', project_id: project.data.project_id } });
assert.equal(calendarEvents.ok, true);
assert.deepEqual(new Set(calendarEvents.data.map((row) => row.type)), new Set(['task','eta','payment','trip','handover']));
assert.equal(context.api({ action: 'calendar.list', payload: { month: '12/2026' } }).error.field, 'month');
console.log('PASS local T-01/T-02/T-03 test: task rules, QC workflow, progress and five-source monthly calendar');

const bomAdd = context.api({ action: 'bom.add_line', payload: { project_id: project.data.project_id, sku: 'PLC-DEMO-001', qty_required: 5, need_date: '2026-11-15', note: 'Dòng thử' } });
assert.equal(bomAdd.ok, true);
assert.equal(bomAdd.data.qty_short, 1);
assert.equal(bomAdd.data.reconciliation.reservations_created, 1);
assert.equal(bomAdd.data.reconciliation.prs_created, 1);
assert.equal(context.api({ action: 'bom.update_line', payload: { bom_id: bomAdd.data.bom_id, patch: { qty_reserved: 3, qty_ordered: 3 } } }).error.field, 'qty_required');
const previewBom = context.api({ action: 'bom.import_preview', payload: { duplicate_mode: 'sum', rows: [
  { sku: 'PLC-DEMO-001', qty_required: 2, need_date: '2026-12-01' },
  { sku: 'PLC-DEMO-001', qty_required: 3, need_date: '2026-12-01' },
  { sku: 'UNKNOWN', qty_required: 1, need_date: '2026-12-01' },
  { sku: 'SERVO-DEMO-001', qty_required: -1, need_date: '2026-12-01' }
] } }).data;
assert.equal(previewBom.errors.length, 2);
assert.equal(Number(previewBom.valid_rows[0].qty_required), 5);
const importedBom = context.api({ action: 'bom.import_commit', payload: { project_id: project.data.project_id, rows: previewBom.valid_rows } }).data;
assert.equal(importedBom.created, 1);
assert.equal(context.readAll('PR').find((row) => row.project_id === project.data.project_id && row.sku === 'PLC-DEMO-001' && row.status === 'open').qty, 6);
assert.equal(context.api({ action: 'bom.list', payload: { project_id: project.data.project_id } }).data.length, 2);
context.insert('ProjectCosts', { id: 'COST-TEST-001', project_id: project.data.project_id, kind: 'material', amount_vnd: 17200000 });
const cost = context.api({ action: 'project.cost', payload: { project_id: project.data.project_id } }).data;
assert.equal(cost.material, 17200000);
assert.equal(cost.actual, 17200000);
assert.equal(cost.gross_margin, 82800000);
console.log('PASS local B-04/B-05/B-06/B-07 test: BOM invariants/import/status data and project cost aggregation');

context.api({ action: 'stock.receive', payload: { sku: 'ITEM-TEST-001', wh_id: 'WH-COMMON', qty: 5, unit_cost_vnd: 100000 } });
const projectB = context.api({ action: 'project.create', payload: { name: 'Máy thử B', cust_id: 'CUST-DEMO-001', contract_value_vnd: 50000000, start_date: '2026-10-08', due_date: '2027-02-28', pm_emp_id: 'EMP-DEMO-001', status: 'active' } }).data;
const autoReservedA = context.api({ action: 'bom.add_line', payload: { project_id: project.data.project_id, sku: 'ITEM-TEST-001', qty_required: 2, need_date: '2026-11-01' } });
const autoReservedB = context.api({ action: 'bom.add_line', payload: { project_id: projectB.project_id, sku: 'ITEM-TEST-001', qty_required: 4, need_date: '2026-12-01' } });
assert.equal(autoReservedA.data.reconciliation.reservations_created, 1);
assert.equal(autoReservedB.data.reconciliation.reservations_created, 1);
assert.equal(autoReservedB.data.reconciliation.prs_created, 1);
assert.equal(context.activeReservedQty_(project.data.project_id, 'ITEM-TEST-001'), 2);
const stockBeforeRepeat = context.readAll('StockReservations').length;
context.api({ action: 'bom.reconcile', payload: { project_id: projectB.project_id } });
assert.equal(context.readAll('StockReservations').length, stockBeforeRepeat);
assert.equal(context.api({ action: 'stock.list', payload: { search: 'ITEM-TEST-001' } }).data[0].available, 0);
const issue = context.api({ action: 'issue.create', payload: { project_id: project.data.project_id, lines: [{ sku: 'ITEM-TEST-001', qty: 2 }] } }).data;
assert.equal(context.api({ action: 'issue.post', payload: { px_id: issue.px_id } }).ok, true);
assert.equal(context.findById('StockBalance', 'ITEM-TEST-001').qty_on_hand, 3);
const rejectedIssue = context.api({ action: 'issue.create', payload: { project_id: project.data.project_id, lines: [{ sku: 'ITEM-TEST-001', qty: 1 }] } }).data;
assert.equal(context.api({ action: 'issue.post', payload: { px_id: rejectedIssue.px_id } }).error.code, 'STOCK_NOT_RESERVED');
assert.equal(context.api({ action: 'issue.cancel', payload: { px_id: issue.px_id } }).ok, true);
assert.equal(context.findById('StockBalance', 'ITEM-TEST-001').qty_on_hand, 5);
assert.equal(context.api({ action: 'stock.adjust', payload: { sku: 'ITEM-TEST-001', wh_id: 'WH-COMMON', qty: -10 } }).error.code, 'STOCK_INSUFFICIENT');
console.log('PASS local K-01/K-02/K-03/K-04 test: automatic/idempotent BOM reconcile, stock view data, issue/reversal');

const projectBReservation = context.readAll('StockReservations').find((row) => row.project_id === projectB.project_id && row.sku === 'ITEM-TEST-001' && row.status === 'active');
assert.equal(context.api({ action: 'stock.release', payload: { res_id: projectBReservation.res_id } }).ok, true);
const stocktake = context.api({ action: 'stocktake.create', payload: { wh_id: 'WH-COMMON' } }).data;
const countedLine = stocktake.lines.find((line) => line.sku === 'ITEM-TEST-001');
assert.ok(countedLine);
assert.equal(context.api({ action: 'stocktake.save_counts', payload: { kk_id: stocktake.kk_id, lines: stocktake.lines.map((line) => ({ line_id: line.line_id, qty_counted: line.sku === 'ITEM-TEST-001' ? 4 : line.qty_book, reason: '', project_id: '' })) } }).error.field, 'reason');
const savedStocktake = context.api({ action: 'stocktake.save_counts', payload: { kk_id: stocktake.kk_id, lines: stocktake.lines.map((line) => ({ line_id: line.line_id, qty_counted: line.sku === 'ITEM-TEST-001' ? 4 : line.qty_book, reason: line.sku === 'ITEM-TEST-001' ? 'hư hỏng khi chế tạo' : '', project_id: line.sku === 'ITEM-TEST-001' ? project.data.project_id : '' })) } });
assert.equal(savedStocktake.ok, true);
assert.equal(context.api({ action: 'stocktake.approve', payload: { kk_id: stocktake.kk_id } }).ok, true);
assert.equal(context.findById('StockBalance', 'ITEM-TEST-001').qty_on_hand, 4);
assert.ok(context.readAll('ProjectCosts').some((row) => row.ref_type === 'stocktake' && row.ref_id === stocktake.kk_id));
const blockedStocktake = context.api({ action: 'stocktake.create', payload: { wh_id: 'WH-COMMON' } }).data;
assert.equal(context.api({ action: 'stocktake.save_counts', payload: { kk_id: blockedStocktake.kk_id, lines: blockedStocktake.lines.map((line) => ({ line_id: line.line_id, qty_counted: line.sku === 'ITEM-TEST-001' ? 1 : line.qty_book, reason: line.sku === 'ITEM-TEST-001' ? 'mất mát' : '', project_id: '' })) } }).ok, true);
const blockedApproval = context.api({ action: 'stocktake.approve', payload: { kk_id: blockedStocktake.kk_id } });
assert.equal(blockedApproval.error.code, 'STOCK_INSUFFICIENT');
assert.ok(context.readAll('PR').some((row) => row.project_id === project.data.project_id && row.sku === 'ITEM-TEST-001' && row.status === 'open'));
console.log('PASS local K-07 test: snapshot counts, negative reason, approval adjustment, cost and compensation PR');

assert.equal(context.api({ action: 'bom.add_line', payload: { project_id: project.data.project_id, sku: 'SERVO-DEMO-001', qty_required: 5, need_date: '2026-12-01' } }).ok, true);
const manualPr = context.api({ action: 'pr.create_manual', payload: { project_id: project.data.project_id, sku: 'SERVO-DEMO-001', qty: 2, need_date: '2026-12-01' } });
assert.equal(manualPr.ok, true);
assert.equal(manualPr.data.source, 'manual');
const cancelledPr = context.api({ action: 'pr.create_manual', payload: { project_id: project.data.project_id, sku: 'SENSOR-DEMO-001', qty: 1, need_date: '2026-12-02' } }).data;
assert.equal(context.api({ action: 'pr.cancel', payload: { pr_id: cancelledPr.pr_id } }).data.status, 'cancelled');
assert.ok(context.api({ action: 'pr.list', payload: { status: 'open', search: 'SERVO-DEMO-001' } }).data.some((row) => row.pr_id === manualPr.data.pr_id));
const po = context.api({ action: 'pr.to_po', payload: { pr_ids: [manualPr.data.pr_id], sup_id: 'SUP-DEMO-001' } });
assert.equal(po.ok, true);
assert.equal(po.data.status, 'draft');
assert.equal(po.data.lines[0].pr_id, manualPr.data.pr_id);
assert.equal(po.data.lines[0].eta_date, '2026-10-27');
assert.equal(po.data.lines[0].eta_source, 'calculated');
assert.equal(context.findById('PR', manualPr.data.pr_id).status, 'po_created');
assert.equal(context.api({ action: 'po.confirm', payload: { po_id: po.data.po_id } }).error.code, 'INVALID_STATE');
const editedPo = context.api({ action: 'po.update', payload: { po_id: po.data.po_id, patch: { lines: po.data.lines.map((line) => ({ ...line, unit_price_vnd: 2500000, lead_time_days: 12 })) } } });
assert.equal(editedPo.data.total_vnd, 5000000);
assert.equal(editedPo.data.lines[0].eta_date, '2026-10-18');
assert.equal(context.api({ action: 'eta.update', payload: { line_id: po.data.lines[0].line_id, eta_date: '2026-11-20', note: '' } }).error.field, 'note');
const manualEta = context.api({ action: 'eta.update', payload: { line_id: po.data.lines[0].line_id, eta_date: '2026-12-05', note: 'Nhà cung cấp dời lịch giao' } });
assert.equal(manualEta.data.eta_source, 'manual');
assert.equal(manualEta.data.eta_note, 'Nhà cung cấp dời lịch giao');
const etaRow = context.api({ action: 'eta.list', payload: { project_id: project.data.project_id, today: '2026-10-17' } }).data.find((line) => line.line_id === po.data.lines[0].line_id);
assert.equal(etaRow.eta_state, 'late');
assert.equal(etaRow.late_days, 4);
assert.ok(context.readAll('AuditLog').some((row) => row.action === 'eta.update' && row.entity_id === po.data.lines[0].line_id));
assert.equal(context.api({ action: 'po.send', payload: { po_id: po.data.po_id } }).data.status, 'sent');
assert.equal(context.api({ action: 'po.confirm', payload: { po_id: po.data.po_id } }).data.status, 'confirmed');
const poPayables = context.readAll('Payables').filter((row) => row.po_id === po.data.po_id);
assert.equal(poPayables.length, 2);
assert.equal(Number(poPayables[0].amount_vnd), 1500000);
assert.equal(Number(poPayables[1].amount_vnd), 3500000);
assert.equal(poPayables[1].due_date, '2026-10-21');
context.insert('CashAccounts', { acct_id: 'BANK-01', name: 'Ngân hàng thử', type: 'bank', opening_balance_vnd: 0 });
context.insert('PO', { po_id: 'PO-PAY-TEST', sup_id: 'SUP-DEMO-001', order_date: '2026-10-09', payment_terms: 'Net 30', currency: 'VND', status: 'confirmed', total_vnd: 1000 });
context.insert('Payables', { ap_id: 'PO-PAY-TEST-AP-1', po_id: 'PO-PAY-TEST', sup_id: 'SUP-DEMO-001', due_date: '2026-10-10', amount_vnd: 400, paid_vnd: 0 });
context.insert('Payables', { ap_id: 'PO-PAY-TEST-AP-2', po_id: 'PO-PAY-TEST', sup_id: 'SUP-DEMO-001', due_date: '2026-10-20', amount_vnd: 600, paid_vnd: 0 });
const poPayment = context.api({ action: 'ledger.payment_create', payload: { po_id: 'PO-PAY-TEST', acct_id: 'BANK-01', date: '2026-10-21', amount_vnd: 500, description: 'Thanh toán PO thử' } });
assert.equal(poPayment.ok, true);
assert.equal(poPayment.data.outstanding_vnd, 500);
assert.equal(Number(context.findById('Payables', 'PO-PAY-TEST-AP-1').paid_vnd), 400);
assert.equal(Number(context.findById('Payables', 'PO-PAY-TEST-AP-2').paid_vnd), 100);
assert.match(poPayment.data.warning, /ngân hàng đang âm/i);
assert.equal(context.api({ action: 'ledger.payment_create', payload: { acct_id: 'CASH-01', date: '2026-10-21', amount_vnd: 2000000, description: 'Chi vượt quỹ' } }).error.code, 'CONFLICT');
console.log('PASS local C-03 test: PO payable allocation, negative-bank warning and negative-cash prevention');
assert.equal(context.buildPayableRows_({ po_id: 'PO-NET', sup_id: 'SUP-DEMO-002', order_date: '2026-10-09', payment_terms: 'Net 30', total_vnd: 650000 })[0].due_date, '2026-11-08');
assert.throws(() => context.buildPayableRows_({ po_id: 'PO-BAD', sup_id: 'SUP-DEMO-002', order_date: '2026-10-09', payment_terms: 'Thanh toán sau', total_vnd: 1 }), /chỉ hỗ trợ/);
const servoBom = context.readAll('BOM').find((row) => row.project_id === project.data.project_id && row.sku === 'SERVO-DEMO-001');
assert.equal(Number(servoBom.qty_ordered), 2);
assert.equal(context.api({ action: 'po.send', payload: { po_id: po.data.po_id } }).error.code, 'INVALID_STATE');
assert.equal(context.api({ action: 'po.cancel', payload: { po_id: po.data.po_id } }).data.status, 'cancelled');
assert.equal(context.readAll('Payables').filter((row) => row.po_id === po.data.po_id).length, 0);
assert.equal(Number(context.findById('BOM', servoBom.bom_id).qty_ordered), 0);
assert.equal(context.findById('PR', manualPr.data.pr_id).status, 'open');
console.log('PASS local M-01/M-02/M-03/M-04 test: PR/PO lifecycle, ETA, payables, audit history and BOM reversal');

propertyValues.set('GEMINI_API_KEY', 'test-key');
let aiFetchCount = 0;
context.UrlFetchApp = {
  fetch() {
    aiFetchCount += 1;
    const text = aiFetchCount === 1 ? '{"wrong":true}' : '{"summary":"Ổn"}';
    return { getResponseCode() { return 200; }, getContentText() { return JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }], usageMetadata: { totalTokenCount: 12 } }); } };
  }
};
const aiSchema = { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'] };
assert.equal(context.callGeminiJson('Tóm tắt', aiSchema).data.summary, 'Ổn');
assert.equal(aiFetchCount, 2);
assert.equal(context.callGeminiJson('Tóm tắt', aiSchema).data.summary, 'Ổn');
assert.equal(aiFetchCount, 2);
console.log('PASS local A-01 test: schema retry, token usage, six-hour cache');

