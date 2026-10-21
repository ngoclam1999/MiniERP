function test_m04_payment_terms() {
  var deposit = buildPayableRows_({
    po_id: 'PO-TEST', sup_id: 'SUP-TEST', order_date: '2026-10-10',
    payment_terms: 'Cọc 30%, còn lại net 15', total_vnd: 1000000
  });
  if (deposit.length !== 2 || deposit[0].amount_vnd !== 300000 || deposit[1].amount_vnd !== 700000) {
    throw new Error('M-04: phân bổ cọc 30% không đúng.');
  }
  if (deposit[1].due_date !== '2026-10-25') throw new Error('M-04: ngày đến hạn phần còn lại không đúng.');
  var net = buildPayableRows_({
    po_id: 'PO-NET', sup_id: 'SUP-TEST', order_date: '2026-10-10',
    payment_terms: 'Net 30', total_vnd: 1000000
  });
  if (net.length !== 1 || net[0].due_date !== '2026-11-09') throw new Error('M-04: điều khoản Net 30 không đúng.');
  console.log('PASS test_m04_payment_terms');
}
