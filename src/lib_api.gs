var MINI_ERP_API_ERROR_CODES = [
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'VALIDATION',
  'NOT_FOUND',
  'CONFLICT',
  'LOCK_TIMEOUT',
  'STOCK_NOT_RESERVED',
  'STOCK_INSUFFICIENT',
  'INVALID_STATE',
  'AI_ERROR',
  'INTERNAL'
];
var MINI_ERP_API_ACTIONS = {};
var MINI_ERP_LOCK_TIMEOUT_MS = 20000;
var MINI_ERP_LOCK_DEPTH = 0;
var MINI_ERP_REQUEST_CONTEXT = null;

function apiError(code, message, field) {
  if (MINI_ERP_API_ERROR_CODES.indexOf(code) === -1) {
    throw new Error('Mã lỗi API không hợp lệ: ' + code);
  }

  var error = new Error(String(message || ''));
  error.name = 'MiniErpApiError';
  error.code = code;
  if (field !== undefined && field !== null && field !== '') {
    error.field = String(field);
  }
  return error;
}

function withLock(fn, timeoutMs) {
  if (typeof fn !== 'function') {
    throw new Error('withLock yêu cầu fn là một hàm.');
  }

  if (MINI_ERP_LOCK_DEPTH > 0) {
    return fn();
  }

  var waitMs = timeoutMs === undefined ? MINI_ERP_LOCK_TIMEOUT_MS : Number(timeoutMs);
  if (!Number.isFinite(waitMs) || waitMs < 0) {
    throw new Error('timeoutMs của withLock phải là số không âm.');
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(waitMs)) {
    throw apiError('LOCK_TIMEOUT', 'Hệ thống đang bận, thử lại sau vài giây');
  }

  MINI_ERP_LOCK_DEPTH += 1;
  try {
    return fn();
  } finally {
    MINI_ERP_LOCK_DEPTH -= 1;
    lock.releaseLock();
  }
}

function registerApiAction_(action, handler, isWrite) {
  var normalizedAction = String(action || '').trim();
  if (!/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(normalizedAction)) {
    throw new Error('Tên action không hợp lệ: ' + action);
  }
  if (typeof handler !== 'function') {
    throw new Error('Handler của action ' + normalizedAction + ' phải là một hàm.');
  }
  if (Object.prototype.hasOwnProperty.call(MINI_ERP_API_ACTIONS, normalizedAction)) {
    throw new Error('Action đã được đăng ký: ' + normalizedAction);
  }

  MINI_ERP_API_ACTIONS[normalizedAction] = {
    handler: handler,
    is_write: isWrite === true
  };
}

function api(request) {
  try {
    ensureApiActionsRegistered_();
    var normalizedRequest = validateApiRequest_(request);
    var route = MINI_ERP_API_ACTIONS[normalizedRequest.action];
    if (!route) {
      throw apiError('NOT_FOUND', 'Không tìm thấy action: ' + normalizedRequest.action, 'action');
    }

    var invoke = function () {
      var previousContext = MINI_ERP_REQUEST_CONTEXT;
      var requestContext = {
        action: normalizedRequest.action,
        client_ts: normalizedRequest.client_ts
      };
      MINI_ERP_REQUEST_CONTEXT = requestContext;
      try {
        return route.handler(normalizedRequest.payload, requestContext);
      } finally {
        MINI_ERP_REQUEST_CONTEXT = previousContext;
      }
    };
    var result = route.is_write ? withLock(invoke) : invoke();
    return buildApiSuccess_(result);
  } catch (error) {
    return buildApiFailure_(error);
  }
}

function ensureApiActionsRegistered_() {
  if (typeof registerWarehouseActions_ === 'function') registerWarehouseActions_();
  if (typeof registerLedgerActions_ === 'function') registerLedgerActions_();
  if (typeof registerAuthActions_ === 'function') registerAuthActions_();
  if (typeof registerSettingsActions_ === 'function') registerSettingsActions_();
}

function validateApiRequest_(request) {
  if (!request || Object.prototype.toString.call(request) !== '[object Object]') {
    throw apiError('VALIDATION', 'Request phải là một object.');
  }

  var action = String(request.action || '').trim();
  if (!action) {
    throw apiError('VALIDATION', 'Thiếu action.', 'action');
  }
  if (!/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(action)) {
    throw apiError('VALIDATION', 'Action phải theo định dạng <module>.<verb>.', 'action');
  }

  var payload = request.payload;
  if (payload === undefined || payload === null) {
    payload = {};
  }
  if (Object.prototype.toString.call(payload) !== '[object Object]') {
    throw apiError('VALIDATION', 'payload phải là một object.', 'payload');
  }

  return {
    action: action,
    payload: payload,
    client_ts: request.client_ts === undefined ? '' : String(request.client_ts)
  };
}

function buildApiSuccess_(result) {
  if (result && Object.prototype.toString.call(result) === '[object Object]' &&
      Object.prototype.hasOwnProperty.call(result, 'data') &&
      Object.prototype.hasOwnProperty.call(result, 'meta')) {
    return { ok: true, data: result.data, meta: result.meta };
  }
  return { ok: true, data: result === undefined ? null : result };
}

function buildApiFailure_(error) {
  var isApiError = error && error.name === 'MiniErpApiError' &&
    MINI_ERP_API_ERROR_CODES.indexOf(error.code) !== -1;
  var responseError = isApiError ? {
    code: error.code,
    message: error.message
  } : {
    code: 'INTERNAL',
    message: 'Đã xảy ra lỗi nội bộ.'
  };

  if (isApiError && error.field) {
    responseError.field = error.field;
  }
  if (!isApiError) {
    console.error(error && error.stack ? error.stack : error);
  }
  return { ok: false, error: responseError };
}
