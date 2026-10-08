var MINI_ERP_SPREADSHEET_PROPERTY = 'SPREADSHEET_ID';
var MINI_ERP_SPREADSHEET_NAME = 'Mini ERP';
var MINI_ERP_COMMON_COLUMNS = [
  'deleted_at',
  'created_at',
  'created_by',
  'updated_at',
  'updated_by'
];

var MINI_ERP_SCHEMA = {
  Settings: ['key', 'value', 'note'],
  Users: ['email', 'emp_id', 'role', 'extra_roles', 'status'],
  Counters: ['prefix', 'period', 'last_seq'],
  AuditLog: ['ts', 'user', 'action', 'entity', 'entity_id', 'before_json', 'after_json'],
  Notifications: ['id', 'to_user', 'title', 'body', 'link', 'read_at'],
  AIAlerts: ['id', 'type', 'severity', 'project_id', 'ref_id', 'title', 'body', 'status', 'fingerprint'],

  Customers: ['cust_id', 'name', 'tax_code', 'contact_name', 'phone', 'email', 'address', 'note'],
  Suppliers: ['sup_id', 'name', 'tax_code', 'contact_name', 'phone', 'email', 'address', 'payment_terms', 'avg_lead_days', 'note'],
  Items: ['sku', 'name', 'category', 'unit', 'spec', 'min_stock', 'default_sup_id', 'lead_time_days', 'avg_cost_vnd', 'wh_type', 'barcode'],
  Warehouses: ['wh_id', 'name', 'wh_type'],

  Projects: ['project_id', 'name', 'cust_id', 'contract_value_vnd', 'start_date', 'due_date', 'pm_emp_id', 'budget_vnd', 'status', 'note'],
  ProjectPayments: ['pay_id', 'project_id', 'seq', 'name', 'percent', 'amount_vnd', 'due_date', 'status', 'paid_date', 'receipt_no'],
  BOM: ['bom_id', 'project_id', 'sku', 'qty_required', 'need_date', 'qty_reserved', 'qty_ordered', 'qty_issued', 'note'],

  StockBalance: ['sku', 'wh_id', 'qty_on_hand', 'qty_reserved'],
  StockReservations: ['res_id', 'project_id', 'sku', 'wh_id', 'qty', 'status'],
  StockMovements: ['mv_id', 'ts', 'type', 'sku', 'wh_id', 'qty', 'unit_cost_vnd', 'project_id', 'ref_doc', 'note'],
  GoodsReceipts: ['gr_id', 'po_id', 'sup_id', 'ts', 'status'],
  GoodsReceiptLines: ['line_id', 'gr_id', 'po_line_id', 'sku', 'qty', 'project_id'],
  IssueNotes: ['px_id', 'project_id', 'ts', 'status'],
  IssueLines: ['line_id', 'px_id', 'sku', 'qty', 'unit_cost_vnd'],
  Stocktakes: ['kk_id', 'wh_id', 'date', 'status'],
  StocktakeLines: ['line_id', 'kk_id', 'sku', 'qty_book', 'qty_counted', 'reason'],

  PR: ['pr_id', 'project_id', 'sku', 'qty', 'need_date', 'status', 'source'],
  PO: ['po_id', 'sup_id', 'order_date', 'payment_terms', 'currency', 'status', 'total_vnd'],
  POLines: ['line_id', 'po_id', 'sku', 'project_id', 'pr_id', 'qty', 'unit_price_vnd', 'lead_time_days', 'eta_date', 'need_date', 'qty_received'],

  Employees: ['emp_id', 'full_name', 'dob', 'gender', 'phone', 'address', 'dept', 'position', 'contract_type', 'contract_start', 'contract_end', 'insurance_no', 'bank_name', 'bank_account', 'emergency_name', 'emergency_phone', 'status'],
  EmployeeSensitive: ['emp_id', 'id_card_no', 'tax_code'],
  EmployeeSkills: ['id', 'emp_id', 'skill', 'level'],
  EmployeeCerts: ['id', 'emp_id', 'name', 'issued_date', 'expiry_date', 'file_url'],

  Tasks: ['task_id', 'project_id', 'title', 'type', 'assignee_emp_id', 'start_date', 'due_date', 'status', 'progress_pct', 'depends_on', 'priority', 'qc_by'],

  Requests: ['req_id', 'type', 'emp_id', 'project_id', 'from_date', 'to_date', 'hours', 'reason', 'handover_emp_id', 'status', 'current_step'],
  RequestApprovals: ['id', 'req_id', 'step', 'approver', 'decision', 'comment', 'ts'],
  TripExpenses: ['id', 'req_id', 'category', 'amount_vnd', 'receipt_url'],
  Attendance: ['id', 'emp_id', 'date', 'type', 'hours', 'project_id', 'req_id'],
  PayrollInputs: ['id', 'month', 'emp_id', 'ot_hours', 'ot_amount_vnd', 'allowance_vnd', 'leave_days', 'req_ids'],

  CashAccounts: ['acct_id', 'name', 'type', 'opening_balance_vnd'],
  CashLedger: ['no', 'date', 'kind', 'acct_id', 'amount_vnd', 'project_id', 'party_type', 'party_id', 'pay_id', 'po_id', 'req_id', 'description'],
  Payables: ['ap_id', 'sup_id', 'ref', 'po_id', 'amount_vnd', 'due_date', 'paid_vnd'],
  Receivables: ['ar_id', 'cust_id', 'ref', 'project_id', 'pay_id', 'amount_vnd', 'due_date', 'received_vnd'],

  ProjectCosts: ['id', 'project_id', 'kind', 'amount_vnd', 'ref_type', 'ref_id', 'ts']
};

/**
 * Creates the configured spreadsheet when needed and normalizes every sheet
 * declared in section 3 of MINI_ERP_AGENT_SPEC.md.
 *
 * Existing sheets, columns and data are preserved. Missing headers are
 * appended to row 1. The spreadsheet ID is stored in Script Properties.
 *
 * @return {{spreadsheet_id: string, spreadsheet_url: string, created_spreadsheet: boolean, created_sheets: string[], updated_sheets: Object[]}}
 */
function setup_schema() {
  var target = getOrCreateMiniErpSpreadsheet_();
  var result = ensureMiniErpSchema_(target.spreadsheet);
  var warehouseResult = typeof initializeDefaultWarehouses_ === 'function' ? initializeDefaultWarehouses_() : null;

  return {
    spreadsheet_id: target.spreadsheet.getId(),
    spreadsheet_url: target.spreadsheet.getUrl(),
    created_spreadsheet: target.created,
    created_sheets: result.created_sheets,
    updated_sheets: result.updated_sheets,
    default_warehouses: warehouseResult
  };
}

function getOrCreateMiniErpSpreadsheet_() {
  var properties = PropertiesService.getScriptProperties();
  var spreadsheetId = properties.getProperty(MINI_ERP_SPREADSHEET_PROPERTY);

  if (spreadsheetId) {
    try {
      return {
        spreadsheet: SpreadsheetApp.openById(spreadsheetId),
        created: false
      };
    } catch (error) {
      throw new Error(
        'Không thể mở Google Sheet theo SPREADSHEET_ID đã cấu hình. ' +
        'Hãy kiểm tra ID và quyền truy cập. Chi tiết: ' + error.message
      );
    }
  }

  var spreadsheet = SpreadsheetApp.create(MINI_ERP_SPREADSHEET_NAME);
  properties.setProperty(MINI_ERP_SPREADSHEET_PROPERTY, spreadsheet.getId());

  return {
    spreadsheet: spreadsheet,
    created: true
  };
}

function ensureMiniErpSchema_(spreadsheet) {
  var createdSheets = [];
  var updatedSheets = [];

  Object.keys(MINI_ERP_SCHEMA).forEach(function (sheetName) {
    var expectedHeaders = getMiniErpHeaders_(sheetName);
    var sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
      sheet.setFrozenRows(1);
      createdSheets.push(sheetName);
      return;
    }

    var missingHeaders = appendMissingHeaders_(sheet, expectedHeaders);
    if (missingHeaders.length > 0) {
      updatedSheets.push({
        sheet: sheetName,
        added_headers: missingHeaders
      });
    }

    sheet.setFrozenRows(1);
  });

  removeInitialBlankSheet_(spreadsheet);

  return {
    created_sheets: createdSheets,
    updated_sheets: updatedSheets
  };
}

function getMiniErpHeaders_(sheetName) {
  var businessColumns = MINI_ERP_SCHEMA[sheetName];
  if (!businessColumns) {
    throw new Error('Sheet không có trong đặc tả: ' + sheetName);
  }

  return businessColumns.concat(MINI_ERP_COMMON_COLUMNS);
}

function appendMissingHeaders_(sheet, expectedHeaders) {
  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var existingHeaders = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
    .map(function (value) { return String(value).trim(); });
  var nonEmptyHeaders = existingHeaders.filter(function (value) { return value !== ''; });

  if (nonEmptyHeaders.length === 0) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    return expectedHeaders.slice();
  }

  var seen = {};
  nonEmptyHeaders.forEach(function (header) {
    if (seen[header]) {
      throw new Error('Sheet ' + sheet.getName() + ' có tiêu đề cột trùng: ' + header);
    }
    seen[header] = true;
  });

  var missingHeaders = expectedHeaders.filter(function (header) {
    return !seen[header];
  });

  if (missingHeaders.length > 0) {
    var writeColumn = sheet.getLastColumn() + 1;
    sheet.getRange(1, writeColumn, 1, missingHeaders.length).setValues([missingHeaders]);
  }

  return missingHeaders;
}

function removeInitialBlankSheet_(spreadsheet) {
  var defaultSheet = spreadsheet.getSheetByName('Sheet1');
  if (!defaultSheet || spreadsheet.getSheets().length <= 1) {
    return;
  }

  if (defaultSheet.getLastRow() === 0 && defaultSheet.getLastColumn() === 0) {
    spreadsheet.deleteSheet(defaultSheet);
    return;
  }

  if (defaultSheet.getLastRow() === 1 && defaultSheet.getLastColumn() === 1 && defaultSheet.getRange('A1').isBlank()) {
    spreadsheet.deleteSheet(defaultSheet);
  }
}

