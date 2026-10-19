function test_m03_eta_calculation() {
  if (addDaysToDate_('2026-10-06', 21) !== '2026-10-27') {
    throw new Error('M-03: ETA không bằng ngày đặt cộng lead-time.');
  }
  if (addDaysToDate_('2026-12-30', 3) !== '2027-01-02') {
    throw new Error('M-03: ETA không xử lý đúng khi qua năm.');
  }
  if (dateDiffDays_('2026-12-05', '2026-12-01') !== -4) {
    throw new Error('M-03: số ngày trễ không đúng.');
  }
  var headers = MINI_ERP_SCHEMA.POLines;
  ['eta_date', 'eta_source', 'eta_note'].forEach(function (header) {
    if (headers.indexOf(header) === -1) throw new Error('M-03: thiếu cột ' + header + '.');
  });
  console.log('PASS test_m03_eta_calculation');
}
