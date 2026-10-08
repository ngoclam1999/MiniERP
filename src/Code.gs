/**
 * Entry point for the Mini ERP web application.
 *
 * @return {GoogleAppsScript.HTML.HtmlOutput}
 */
function doGet() {
  return HtmlService.createTemplateFromFile('src/Index')
    .evaluate()
    .setTitle('Mini ERP');
}

/**
 * Includes an HTML partial from this Apps Script project.
 *
 * @param {string} filename
 * @return {string}
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * JSON endpoint for clients that do not use google.script.run.
 *
 * @param {GoogleAppsScript.Events.DoPost} event
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function doPost(event) {
  var response;
  try {
    if (!event || !event.postData || typeof event.postData.contents !== 'string') {
      throw apiError('VALIDATION', 'Thiếu nội dung JSON của request.');
    }
    response = api(JSON.parse(event.postData.contents));
  } catch (error) {
    if (error instanceof SyntaxError) {
      response = buildApiFailure_(apiError('VALIDATION', 'Nội dung request không phải JSON hợp lệ.'));
    } else {
      response = buildApiFailure_(error);
    }
  }

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

