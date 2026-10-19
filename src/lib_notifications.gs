function createNotification(toUser, title, body, link) {
  var normalizedUser = String(toUser || '').trim();
  var normalizedTitle = String(title || '').trim();
  if (!normalizedUser) {
    throw apiError('VALIDATION', 'Thiếu người nhận thông báo.', 'to_user');
  }
  if (!normalizedTitle) {
    throw apiError('VALIDATION', 'Thiếu tiêu đề thông báo.', 'title');
  }

  var notification = insert('Notifications', {
    id: nextId('NTF'),
    to_user: normalizedUser,
    title: normalizedTitle,
    body: body === undefined || body === null ? '' : String(body),
    link: link === undefined || link === null ? '' : String(link),
    read_at: ''
  });
  sendNotificationEmail_(notification);
  return notification;
}

function registerNotificationActions_() {
  registerActionOnce_('notification.list', function () {
    var ctx = getAuthContext_();
    return listUnreadNotifications(ctx.email).sort(function (a, b) {
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });
  }, false);
  registerActionOnce_('notification.mark_read', function (payload) {
    var ctx = getAuthContext_();
    var notification = findById('Notifications', payload && payload.id);
    if (!notification) throw apiError('NOT_FOUND', 'Không tìm thấy thông báo.', 'id');
    if (String(notification.to_user).toLowerCase() !== String(ctx.email).toLowerCase()) {
      throw apiError('FORBIDDEN', 'Bạn không có quyền cập nhật thông báo này.');
    }
    if (notification.read_at) return notification;
    return update('Notifications', notification.id, { read_at: getDbTimestamp_() });
  }, true);
}

function sendNotificationEmail_(notification) {
  var email = String(notification && notification.to_user || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof MailApp === 'undefined') return false;
  try {
    var message = String(notification.body || '');
    if (notification.link) message += '\n\nMở trong Mini ERP: ' + notification.link;
    MailApp.sendEmail(email, String(notification.title || 'Mini ERP'), message);
    return true;
  } catch (error) {
    console.warn('Không thể gửi email thông báo ' + notification.id + ': ' + error.message);
    return false;
  }
}

function listUnreadNotifications(toUser) {
  var normalizedUser = String(toUser || '').trim();
  if (!normalizedUser) {
    throw apiError('VALIDATION', 'Thiếu người nhận thông báo.', 'to_user');
  }
  return query('Notifications', function (notification) {
    return String(notification.to_user) === normalizedUser && !notification.read_at;
  });
}
