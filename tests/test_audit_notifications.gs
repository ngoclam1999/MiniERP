function test_audit_and_notifications() {
  var properties = PropertiesService.getScriptProperties();
  var previousSpreadsheetId = properties.getProperty(MINI_ERP_SPREADSHEET_PROPERTY);
  var testSpreadsheet = SpreadsheetApp.create('Mini ERP audit test ' + new Date().getTime());

  try {
    ensureMiniErpSchema_(testSpreadsheet);
    properties.setProperty(MINI_ERP_SPREADSHEET_PROPERTY, testSpreadsheet.getId());

    insert('EmployeeSensitive', {
      emp_id: 'EMP-AUDIT-001',
      id_card_no: '079123456789',
      tax_code: 'TAX-001'
    });
    insert('Employees', {
      emp_id: 'EMP-AUDIT-001',
      full_name: 'Nhân viên audit',
      bank_account: '0123456789'
    });
    update('Employees', 'EMP-AUDIT-001', { bank_account: '9876543210' });

    var audits = readAll('AuditLog');
    assertAuditTest_(audits.length === 3, 'Cần 3 AuditLog cho 2 insert và 1 update, nhận được ' + audits.length + '.');
    var serialized = JSON.stringify(audits);
    assertAuditTest_(serialized.indexOf('079123456789') === -1, 'AuditLog làm lộ CCCD.');
    assertAuditTest_(serialized.indexOf('0123456789') === -1, 'AuditLog làm lộ số tài khoản cũ.');
    assertAuditTest_(serialized.indexOf('9876543210') === -1, 'AuditLog làm lộ số tài khoản mới.');
    assertAuditTest_(serialized.indexOf('id_card_no') !== -1, 'AuditLog thiếu tên trường CCCD đã thay đổi.');
    assertAuditTest_(serialized.indexOf('bank_account') !== -1, 'AuditLog thiếu tên trường tài khoản đã thay đổi.');

    var notification = createNotification('receiver@example.com', 'Thông báo thử', 'Nội dung thử', '#test');
    assertAuditTest_(notification.id.indexOf('NTF-') === 0, 'Notification không có ID đúng tiền tố.');
    assertAuditTest_(listUnreadNotifications('receiver@example.com').length === 1, 'Không đọc được notification chưa xem.');
    console.log('PASS test_audit_and_notifications');
  } finally {
    if (previousSpreadsheetId) {
      properties.setProperty(MINI_ERP_SPREADSHEET_PROPERTY, previousSpreadsheetId);
    } else {
      properties.deleteProperty(MINI_ERP_SPREADSHEET_PROPERTY);
    }
    DriveApp.getFileById(testSpreadsheet.getId()).setTrashed(true);
  }
}

function assertAuditTest_(condition, message) {
  if (!condition) throw new Error(message);
}
