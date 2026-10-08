var MINI_ERP_CACHE_SECONDS = 300;
var MINI_ERP_CACHED_SHEETS = ['Items', 'Customers', 'Suppliers', 'Employees'];

function readAll(sheetName) {
  validateDbSheetName_(sheetName);

  var cached = getCachedRows_(sheetName);
  if (cached !== null) {
    return cached;
  }

  var table = readTable_(sheetName);
  var rows = table.rows.filter(function (row) {
    return !row.deleted_at;
  });

  putCachedRows_(sheetName, rows);
  return rows;
}

function findById(sheetName, id) {
  var idColumn = getPrimaryKeyColumn_(sheetName);
  var target = String(id);

  return readAll(sheetName).find(function (row) {
    return String(row[idColumn]) === target;
  }) || null;
}

function query(sheetName, predicate) {
  if (typeof predicate !== 'function') {
    throw new Error('query yêu cầu predicate là một hàm.');
  }
  return readAll(sheetName).filter(predicate);
}

function insert(sheetName, obj) {
  var inserted = insertMany(sheetName, [obj]);
  return inserted[0];
}

function insertMany(sheetName, objects) {
  validateDbSheetName_(sheetName);
  if (!Array.isArray(objects)) {
    throw new Error('insertMany yêu cầu một mảng dữ liệu.');
  }
  if (objects.length === 0) {
    return [];
  }

  return withDbWriteLock_(function () {
    var sheet = getDbSheet_(sheetName);
    var headers = readHeaders_(sheet);
    var idColumn = getPrimaryKeyColumn_(sheetName);
    var existingIds = readExistingPrimaryKeys_(sheet, headers, idColumn);
    var now = getDbTimestamp_();
    var actor = getDbActor_();
    var insertedRows = [];

    objects.forEach(function (obj) {
      validateDbObject_(sheetName, headers, obj);
      var rowObject = buildInsertObject_(headers, obj, now, actor);
      var id = rowObject[idColumn];

      if (id !== '' && id !== null && id !== undefined) {
        var normalizedId = String(id);
        if (existingIds[normalizedId]) {
          throw new Error('Khóa chính đã tồn tại trong ' + sheetName + ': ' + normalizedId);
        }
        existingIds[normalizedId] = true;
      }

      insertedRows.push(rowObject);
    });

    var values = insertedRows.map(function (rowObject) {
      return headers.map(function (header) {
        return Object.prototype.hasOwnProperty.call(rowObject, header) ? rowObject[header] : '';
      });
    });
    var startRow = Math.max(sheet.getLastRow() + 1, 2);
    ensureSheetCapacity_(sheet, startRow + values.length - 1, headers.length);
    sheet.getRange(startRow, 1, values.length, headers.length).setValues(values);
    clearTableCache_(sheetName);

    if (sheetName !== 'AuditLog') {
      writeAuditEntries_(insertedRows.map(function (rowObject) {
        return buildAuditEntry_(
          getCurrentAction_('db.insert'),
          sheetName,
          rowObject[idColumn],
          null,
          rowObject
        );
      }));
    }

    return insertedRows;
  });
}

function update(sheetName, id, patch) {
  validateDbSheetName_(sheetName);

  return withDbWriteLock_(function () {
    var sheet = getDbSheet_(sheetName);
    var table = readTableFromSheet_(sheet);
    var idColumn = getPrimaryKeyColumn_(sheetName);
    validateDbObject_(sheetName, table.headers, patch);

    var rowIndex = findActiveRowIndex_(table, idColumn, id);
    if (rowIndex === -1) {
      throw new Error('Không tìm thấy bản ghi ' + id + ' trong ' + sheetName + '.');
    }

    var current = table.rows[rowIndex];
    var updated = {};
    table.headers.forEach(function (header) {
      updated[header] = current[header];
    });

    Object.keys(patch).forEach(function (key) {
      if (MINI_ERP_COMMON_COLUMNS.indexOf(key) === -1) {
        updated[key] = patch[key];
      }
    });
    updated.updated_at = getDbTimestamp_();
    updated.updated_by = getDbActor_();

    var values = table.headers.map(function (header) { return updated[header]; });
    sheet.getRange(table.row_numbers[rowIndex], 1, 1, table.headers.length).setValues([values]);
    clearTableCache_(sheetName);
    if (sheetName !== 'AuditLog') {
      writeAuditEntries_([buildAuditEntry_(
        getCurrentAction_('db.update'),
        sheetName,
        updated[idColumn],
        current,
        updated
      )]);
    }
    return updated;
  });
}

function softDelete(sheetName, id) {
  validateDbSheetName_(sheetName);

  return withDbWriteLock_(function () {
    var sheet = getDbSheet_(sheetName);
    var table = readTableFromSheet_(sheet);
    var idColumn = getPrimaryKeyColumn_(sheetName);
    var rowIndex = findActiveRowIndex_(table, idColumn, id);

    if (rowIndex === -1) {
      throw new Error('Không tìm thấy bản ghi ' + id + ' trong ' + sheetName + '.');
    }

    var beforeDelete = copyDbObject_(table.rows[rowIndex]);
    var deleted = table.rows[rowIndex];
    var now = getDbTimestamp_();
    var actor = getDbActor_();
    deleted.deleted_at = now;
    deleted.updated_at = now;
    deleted.updated_by = actor;

    var values = table.headers.map(function (header) { return deleted[header]; });
    sheet.getRange(table.row_numbers[rowIndex], 1, 1, table.headers.length).setValues([values]);
    clearTableCache_(sheetName);
    if (sheetName !== 'AuditLog') {
      writeAuditEntries_([buildAuditEntry_(
        getCurrentAction_('db.soft_delete'),
        sheetName,
        deleted[idColumn],
        beforeDelete,
        deleted
      )]);
    }
    return deleted;
  });
}

/**
 * Returns PREFIX-YYMM-NNN and increments Counters atomically.
 * Module-specific formats such as DA-YYMM-NN are handled by their own task.
 */
function nextId(prefix) {
  var normalizedPrefix = String(prefix || '').trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9_]*$/.test(normalizedPrefix)) {
    throw new Error('prefix không hợp lệ: ' + prefix);
  }

  return withDbWriteLock_(function () {
    var period = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyMM');
    var sheet = getDbSheet_('Counters');
    var table = readTableFromSheet_(sheet);
    var matchingIndex = -1;

    table.rows.forEach(function (row, index) {
      if (!row.deleted_at && String(row.prefix) === normalizedPrefix && String(row.period) === period) {
        if (matchingIndex !== -1) {
          throw new Error('Counters bị trùng prefix/period: ' + normalizedPrefix + '/' + period);
        }
        matchingIndex = index;
      }
    });

    var nextSequence;
    var now = getDbTimestamp_();
    var actor = getDbActor_();

    if (matchingIndex === -1) {
      nextSequence = 1;
      var counter = buildInsertObject_(table.headers, {
        prefix: normalizedPrefix,
        period: period,
        last_seq: nextSequence
      }, now, actor);
      var insertValues = table.headers.map(function (header) { return counter[header]; });
      var insertRow = Math.max(sheet.getLastRow() + 1, 2);
      ensureSheetCapacity_(sheet, insertRow, table.headers.length);
      sheet.getRange(insertRow, 1, 1, table.headers.length).setValues([insertValues]);
      writeAuditEntries_([buildAuditEntry_(
        getCurrentAction_('db.next_id'),
        'Counters',
        normalizedPrefix + '/' + period,
        null,
        counter
      )]);
    } else {
      var counterRow = table.rows[matchingIndex];
      var counterBefore = copyDbObject_(counterRow);
      var lastSequence = Number(counterRow.last_seq);
      if (!Number.isFinite(lastSequence) || lastSequence < 0 || Math.floor(lastSequence) !== lastSequence) {
        throw new Error('Counters.last_seq không hợp lệ cho ' + normalizedPrefix + '/' + period);
      }
      nextSequence = lastSequence + 1;
      counterRow.last_seq = nextSequence;
      counterRow.updated_at = now;
      counterRow.updated_by = actor;
      var updateValues = table.headers.map(function (header) { return counterRow[header]; });
      sheet.getRange(table.row_numbers[matchingIndex], 1, 1, table.headers.length).setValues([updateValues]);
      writeAuditEntries_([buildAuditEntry_(
        getCurrentAction_('db.next_id'),
        'Counters',
        normalizedPrefix + '/' + period,
        counterBefore,
        counterRow
      )]);
    }

    clearTableCache_('Counters');
    return normalizedPrefix + '-' + period + '-' + String(nextSequence).padStart(3, '0');
  });
}

function getMiniErpSpreadsheet_() {
  var spreadsheetId = PropertiesService.getScriptProperties().getProperty(MINI_ERP_SPREADSHEET_PROPERTY);
  if (!spreadsheetId) {
    throw new Error('Chưa cấu hình SPREADSHEET_ID. Hãy chạy setup_schema() trước.');
  }
  return SpreadsheetApp.openById(spreadsheetId);
}

function getDbSheet_(sheetName) {
  var sheet = getMiniErpSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Không tìm thấy sheet ' + sheetName + '. Hãy chạy setup_schema().');
  }
  return sheet;
}

function readTable_(sheetName) {
  return readTableFromSheet_(getDbSheet_(sheetName));
}

function readTableFromSheet_(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length === 0) {
    throw new Error('Sheet ' + sheet.getName() + ' chưa có hàng tiêu đề.');
  }

  var headers = values[0].map(function (value) { return String(value).trim(); });
  validateHeaders_(sheet.getName(), headers);

  var rows = [];
  var rowNumbers = [];
  values.slice(1).forEach(function (row, index) {
    if (!row.some(function (value) { return value !== ''; })) return;
    var obj = {};
    headers.forEach(function (header, index) {
      obj[header] = row[index] === undefined ? '' : row[index];
    });
    rows.push(obj);
    rowNumbers.push(index + 2);
  });

  return { headers: headers, rows: rows, row_numbers: rowNumbers };
}

function readHeaders_(sheet) {
  var lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) {
    throw new Error('Sheet ' + sheet.getName() + ' chưa có hàng tiêu đề.');
  }
  var headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
    .map(function (value) { return String(value).trim(); });
  validateHeaders_(sheet.getName(), headers);
  return headers;
}

function validateHeaders_(sheetName, headers) {
  var seen = {};
  headers.forEach(function (header) {
    if (!header) {
      throw new Error('Sheet ' + sheetName + ' có tiêu đề cột rỗng.');
    }
    if (seen[header]) {
      throw new Error('Sheet ' + sheetName + ' có tiêu đề cột trùng: ' + header);
    }
    seen[header] = true;
  });
}

function validateDbSheetName_(sheetName) {
  if (!Object.prototype.hasOwnProperty.call(MINI_ERP_SCHEMA, sheetName)) {
    throw new Error('Sheet không có trong đặc tả: ' + sheetName);
  }
}

function validateDbObject_(sheetName, headers, obj) {
  if (!obj || Object.prototype.toString.call(obj) !== '[object Object]') {
    throw new Error('Dữ liệu ghi vào ' + sheetName + ' phải là object.');
  }
  Object.keys(obj).forEach(function (key) {
    if (headers.indexOf(key) === -1) {
      throw new Error('Cột không tồn tại trong ' + sheetName + ': ' + key);
    }
  });
}

function getPrimaryKeyColumn_(sheetName) {
  validateDbSheetName_(sheetName);
  return MINI_ERP_SCHEMA[sheetName][0];
}

function readExistingPrimaryKeys_(sheet, headers, idColumn) {
  var idIndex = headers.indexOf(idColumn);
  if (idIndex === -1) {
    throw new Error('Sheet ' + sheet.getName() + ' thiếu khóa chính ' + idColumn + '.');
  }
  var result = {};
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return result;
  }

  sheet.getRange(2, idIndex + 1, lastRow - 1, 1).getValues().forEach(function (row) {
    if (row[0] !== '') result[String(row[0])] = true;
  });
  return result;
}

function buildInsertObject_(headers, obj, now, actor) {
  var rowObject = {};
  headers.forEach(function (header) {
    rowObject[header] = Object.prototype.hasOwnProperty.call(obj, header) ? obj[header] : '';
  });
  rowObject.deleted_at = '';
  rowObject.created_at = now;
  rowObject.created_by = actor;
  rowObject.updated_at = now;
  rowObject.updated_by = actor;
  return rowObject;
}

function findActiveRowIndex_(table, idColumn, id) {
  var target = String(id);
  return table.rows.findIndex(function (row) {
    return !row.deleted_at && String(row[idColumn]) === target;
  });
}

function ensureSheetCapacity_(sheet, requiredRows, requiredColumns) {
  if (sheet.getMaxRows() < requiredRows) {
    sheet.insertRowsAfter(sheet.getMaxRows(), requiredRows - sheet.getMaxRows());
  }
  if (sheet.getMaxColumns() < requiredColumns) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), requiredColumns - sheet.getMaxColumns());
  }
}

function getDbTimestamp_() {
  return Utilities.formatDate(new Date(), 'Asia/Bangkok', "yyyy-MM-dd'T'HH:mm:ss") + '+07:00';
}

function getDbActor_() {
  return Session.getActiveUser().getEmail() || '';
}

function getCurrentAction_(fallbackAction) {
  return MINI_ERP_REQUEST_CONTEXT && MINI_ERP_REQUEST_CONTEXT.action ?
    MINI_ERP_REQUEST_CONTEXT.action : fallbackAction;
}

function buildAuditEntry_(action, entity, entityId, before, after) {
  return {
    ts: getDbTimestamp_(),
    user: getDbActor_(),
    action: action,
    entity: entity,
    entity_id: entityId === undefined || entityId === null ? '' : String(entityId),
    before_json: JSON.stringify(sanitizeAuditEntityObject_(entity, before)),
    after_json: JSON.stringify(sanitizeAuditEntityObject_(entity, after))
  };
}

function sanitizeAuditEntityObject_(entity, value) {
  var sanitized = sanitizeAuditObject_(value);
  if (entity === 'Settings' && sanitized && sanitized.key === 'vietqr_account_no') {
    sanitized.value = '[REDACTED]';
  }
  return sanitized;
}

function sanitizeAuditObject_(value) {
  if (value === null || value === undefined) return null;

  var sanitized = {};
  var sensitiveFields = [];
  Object.keys(value).forEach(function (key) {
    if (key === 'id_card_no' || key === 'bank_account') {
      sensitiveFields.push(key);
      return;
    }
    sanitized[key] = value[key];
  });
  if (sensitiveFields.length > 0) {
    sanitized.sensitive_fields = sensitiveFields;
  }
  return sanitized;
}

function writeAuditEntries_(entries) {
  if (!entries || entries.length === 0) return;

  var sheet = getDbSheet_('AuditLog');
  var headers = readHeaders_(sheet);
  var now = getDbTimestamp_();
  var actor = getDbActor_();
  var values = entries.map(function (entry) {
    var rowObject = buildInsertObject_(headers, entry, now, actor);
    return headers.map(function (header) {
      return rowObject[header];
    });
  });
  var startRow = Math.max(sheet.getLastRow() + 1, 2);
  ensureSheetCapacity_(sheet, startRow + values.length - 1, headers.length);
  sheet.getRange(startRow, 1, values.length, headers.length).setValues(values);
}

function copyDbObject_(source) {
  var copy = {};
  Object.keys(source).forEach(function (key) {
    copy[key] = source[key];
  });
  return copy;
}

function withDbWriteLock_(fn) {
  return withLock(fn);
}

function getCachedRows_(sheetName) {
  if (MINI_ERP_CACHED_SHEETS.indexOf(sheetName) === -1) return null;
  var value = CacheService.getScriptCache().get(getTableCacheKey_(sheetName));
  return value ? JSON.parse(value) : null;
}

function putCachedRows_(sheetName, rows) {
  if (MINI_ERP_CACHED_SHEETS.indexOf(sheetName) === -1) return;
  try {
    CacheService.getScriptCache().put(
      getTableCacheKey_(sheetName),
      JSON.stringify(rows),
      MINI_ERP_CACHE_SECONDS
    );
  } catch (error) {
    console.warn('Không thể cache sheet ' + sheetName + ': ' + error.message);
  }
}

function clearTableCache_(sheetName) {
  if (MINI_ERP_CACHED_SHEETS.indexOf(sheetName) === -1) return;
  CacheService.getScriptCache().remove(getTableCacheKey_(sheetName));
}

function getTableCacheKey_(sheetName) {
  return 'mini_erp:' + getMiniErpSpreadsheet_().getId() + ':' + sheetName;
}

