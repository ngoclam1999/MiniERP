/**
 * Smoke test for task F-01. Run this function in the Apps Script editor.
 */
function test_doGet_hello() {
  var output = doGet();
  var content = output.getContent();

  if (content.indexOf('<h1>Hello</h1>') === -1) {
    throw new Error('WebApp không hiển thị tiêu đề Hello.');
  }

  console.log('PASS test_doGet_hello');
}

