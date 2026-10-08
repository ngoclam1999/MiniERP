function createNotification(toUser, title, body, link) {
  var normalizedUser = String(toUser || '').trim();
  var normalizedTitle = String(title || '').trim();
  if (!normalizedUser) {
    throw apiError('VALIDATION', 'Thiếu người nhận thông báo.', 'to_user');
  }
  if (!normalizedTitle) {
    throw apiError('VALIDATION', 'Thiếu tiêu đề thông báo.', 'title');
  }

  return insert('Notifications', {
    id: nextId('NTF'),
    to_user: normalizedUser,
    title: normalizedTitle,
    body: body === undefined || body === null ? '' : String(body),
    link: link === undefined || link === null ? '' : String(link),
    read_at: ''
  });
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
