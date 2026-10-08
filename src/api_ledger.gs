var MINI_ERP_BALANCE_CACHE_SECONDS = 60;

function registerLedgerActions_() {
  registerActionOnce_('account.list', function () { requireRole(getAuthContext_(), ['director','accountant']); return readAll('CashAccounts'); }, false);
  registerActionOnce_('account.balance', function (p) { requireRole(getAuthContext_(), ['director','accountant']); return getAccountBalance_(p.acct_id); }, false);
  registerActionOnce_('account.create', function (p) { requireRole(getAuthContext_(), ['accountant']); validateCashAccount_(p); return insert('CashAccounts', p); }, true);
  registerActionOnce_('ledger.list', function () { requireRole(getAuthContext_(), ['director','accountant']); return readAll('CashLedger'); }, false);
  registerActionOnce_('ledger.entry_create', function (p) { requireRole(getAuthContext_(), ['accountant']); return createLedgerEntry_(p); }, true);
  registerActionOnce_('ledger.reverse', function (p) { requireRole(getAuthContext_(), ['accountant']); return reverseLedgerEntry_(p.no, p.date, p.description); }, true);
}

function validateCashAccount_(p) {
  if (!p || !p.acct_id || !p.name || ['cash','bank'].indexOf(String(p.type)) === -1 || !Number.isFinite(Number(p.opening_balance_vnd))) {
    throw apiError('VALIDATION', 'Tài khoản quỹ không hợp lệ.');
  }
}

function getAccountBalance_(accountId) {
  var account = findById('CashAccounts', accountId);
  if (!account) throw apiError('NOT_FOUND', 'Không tìm thấy tài khoản quỹ: ' + accountId);
  var balance = Number(account.opening_balance_vnd) || 0;
  query('CashLedger', function (row) { return String(row.acct_id) === String(accountId); }).forEach(function (row) {
    balance += String(row.kind) === 'in' ? Number(row.amount_vnd) : -Number(row.amount_vnd);
  });
  return { acct_id: accountId, balance_vnd: balance };
}

function createLedgerEntry_(p) {
  if (!p || ['in','out'].indexOf(String(p.kind)) === -1 || !p.acct_id || !p.date || !(Number(p.amount_vnd) > 0) || !p.description) {
    throw apiError('VALIDATION', 'Phiếu quỹ thiếu hoặc sai dữ liệu bắt buộc.');
  }
  var account = findById('CashAccounts', p.acct_id);
  if (!account) throw apiError('NOT_FOUND', 'Không tìm thấy tài khoản quỹ: ' + p.acct_id);
  if (p.kind === 'out' && account.type === 'cash' && getAccountBalance_(p.acct_id).balance_vnd < Number(p.amount_vnd)) {
    throw apiError('CONFLICT', 'Số dư tiền mặt không đủ để lập phiếu chi.');
  }
  var row = copyDbObject_(p);
  row.no = nextDocumentNo_(p.kind === 'in' ? 'PT' : 'PC');
  var inserted = insert('CashLedger', row);
  CacheService.getScriptCache().remove('mini_erp:balance:' + p.acct_id);
  return inserted;
}

function reverseLedgerEntry_(no, date, description) {
  var original = findById('CashLedger', no);
  if (!original) throw apiError('NOT_FOUND', 'Không tìm thấy phiếu: ' + no);
  return createLedgerEntry_({
    date: date,
    kind: original.kind === 'in' ? 'out' : 'in',
    acct_id: original.acct_id,
    amount_vnd: original.amount_vnd,
    project_id: original.project_id,
    party_type: original.party_type,
    party_id: original.party_id,
    pay_id: original.pay_id,
    po_id: original.po_id,
    req_id: original.req_id,
    description: description || ('Đảo phiếu ' + no)
  });
}

function nextDocumentNo_(prefix) {
  var sheet = getDbSheet_('Counters');
  var table = readTableFromSheet_(sheet);
  var index = table.rows.findIndex(function (row) { return !row.deleted_at && row.prefix === prefix && row.period === 'ALL'; });
  var sequence = index === -1 ? 1 : Number(table.rows[index].last_seq) + 1;
  if (index === -1) {
    insert('Counters', { prefix: prefix, period: 'ALL', last_seq: sequence });
  } else {
    var row = table.rows[index];
    var before = copyDbObject_(row);
    row.last_seq = sequence;
    row.updated_at = getDbTimestamp_();
    row.updated_by = getDbActor_();
    sheet.getRange(table.row_numbers[index], 1, 1, table.headers.length).setValues([table.headers.map(function (header) { return row[header]; })]);
    writeAuditEntries_([buildAuditEntry_(getCurrentAction_('db.next_document_no'), 'Counters', prefix + '/ALL', before, row)]);
  }
  return prefix + '-' + String(sequence).padStart(4, '0');
}
