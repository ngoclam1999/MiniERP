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
assert.equal(secondSeed.items.created.length, 0);
assert.equal(secondSeed.employees.created.length, 0);
assert.equal(context.api({ action: 'customer.delete', payload: { cust_id: 'CUST-TEST-001' } }).ok, true);
assert.equal(context.api({ action: 'supplier.delete', payload: { sup_id: 'SUP-TEST-001' } }).ok, true);
console.log('PASS local D-01/D-02 test: CRUD, search, duplicate tax, payment terms, lead-time, idempotent demo seed');

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

