var MINI_ERP_GEMINI_MODEL_DEFAULT = 'gemini-3.5-flash-lite';
var MINI_ERP_AI_CACHE_SECONDS = 21600;

function callGeminiJson(prompt, responseSchema) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw apiError('AI_ERROR', 'Chưa cấu hình GEMINI_API_KEY trong Script Properties.');
  if (!prompt || !responseSchema) throw apiError('VALIDATION', 'Thiếu prompt hoặc response schema.');
  var model = PropertiesService.getScriptProperties().getProperty('GEMINI_MODEL') || MINI_ERP_GEMINI_MODEL_DEFAULT;
  var cacheKey = 'mini_erp:ai:' + hashAiInput_(model + '|' + JSON.stringify(responseSchema) + '|' + String(prompt));
  var cached = CacheService.getScriptCache().get(cacheKey);
  if (cached) return JSON.parse(cached);

  var lastError;
  for (var attempt = 0; attempt < 2; attempt += 1) {
    try {
      var result = requestGeminiJson_(apiKey, model, String(prompt), responseSchema);
      validateJsonSchema_(result.data, responseSchema, '$');
      CacheService.getScriptCache().put(cacheKey, JSON.stringify(result), MINI_ERP_AI_CACHE_SECONDS);
      console.log('Gemini token usage: ' + JSON.stringify(result.usage));
      return result;
    } catch (error) {
      lastError = error;
    }
  }
  console.error(lastError && lastError.stack ? lastError.stack : lastError);
  throw apiError('AI_ERROR', 'Gemini trả dữ liệu không hợp lệ sau 2 lần thử.');
}

function requestGeminiJson_(apiKey, model, prompt, responseSchema) {
  var response = UrlFetchApp.fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent',
    {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-goog-api-key': apiKey },
      muteHttpExceptions: true,
      payload: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: responseSchema }
      })
    }
  );
  var status = response.getResponseCode();
  var body = JSON.parse(response.getContentText() || '{}');
  if (status < 200 || status >= 300) throw new Error('Gemini HTTP ' + status + ': ' + response.getContentText());
  var text = body.candidates && body.candidates[0] && body.candidates[0].content && body.candidates[0].content.parts && body.candidates[0].content.parts[0].text;
  if (!text) throw new Error('Gemini không trả nội dung JSON.');
  return { data: JSON.parse(text), usage: body.usageMetadata || {} };
}

function hashAiInput_(value) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function validateJsonSchema_(value, schema, path) {
  var type = String(schema.type || '').toLowerCase();
  if (type === 'object') {
    if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error(path + ' phải là object.');
    (schema.required || []).forEach(function (key) { if (!Object.prototype.hasOwnProperty.call(value, key)) throw new Error(path + ' thiếu ' + key); });
    Object.keys(schema.properties || {}).forEach(function (key) { if (Object.prototype.hasOwnProperty.call(value, key)) validateJsonSchema_(value[key], schema.properties[key], path + '.' + key); });
  } else if (type === 'array') {
    if (!Array.isArray(value)) throw new Error(path + ' phải là array.');
    value.forEach(function (item, index) { validateJsonSchema_(item, schema.items || {}, path + '[' + index + ']'); });
  } else if (type === 'string' && typeof value !== 'string') throw new Error(path + ' phải là string.');
  else if (type === 'number' && typeof value !== 'number') throw new Error(path + ' phải là number.');
  else if (type === 'integer' && (!Number.isInteger(value))) throw new Error(path + ' phải là integer.');
  else if (type === 'boolean' && typeof value !== 'boolean') throw new Error(path + ' phải là boolean.');
  if (schema.enum && schema.enum.indexOf(value) === -1) throw new Error(path + ' không thuộc enum.');
}
