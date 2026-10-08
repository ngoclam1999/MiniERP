var MINI_ERP_ROLES = ['admin', 'director', 'manager', 'engineer', 'purchasing', 'warehouse', 'accountant', 'hr', 'employee'];
var MINI_ERP_ROLE_PERMS = {
  admin: { projects: 'rw', tasks: 'rw', purchasing: 'rw', stock: 'rw', hr: 'rw', requests: 'rw', finance: 'rw', ai: 'rw', settings: 'rw' },
  director: { projects: 'r', tasks: 'r', purchasing: 'r', stock: 'r', hr: 'r', requests: 'approve', finance: 'r', ai: 'r' },
  manager: { projects: 'rw_proj', tasks: 'rw_proj', purchasing: 'r', stock: 'r', hr: 'r_summary', requests: 'approve_level_1', ai: 'r' },
  engineer: { projects: 'rw', tasks: 'rw_own', purchasing: 'r', stock: 'r', requests: 'w_own', ai: 'r' },
  purchasing: { projects: 'r', tasks: 'r', purchasing: 'rw', stock: 'r', requests: 'w_own', finance: 'r_ap', ai: 'r' },
  warehouse: { projects: 'r', tasks: 'r', purchasing: 'r', stock: 'rw', requests: 'w_own', ai: 'r' },
  accountant: { projects: 'r', purchasing: 'r', stock: 'r', requests: 'approve_level_2_expense', finance: 'rw', ai: 'r' },
  hr: { tasks: 'r', hr: 'rw', requests: 'approve_level_2', ai: 'r' },
  employee: { projects: 'r_proj', tasks: 'rw_own', hr: 'r_own', requests: 'w_own' }
};

function registerAuthActions_() {
  if (!Object.prototype.hasOwnProperty.call(MINI_ERP_API_ACTIONS, 'auth.me')) {
    registerApiAction_('auth.me', function () { return authMe_(); }, false);
  }
}

function authMe_() {
  var email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  if (!email) throw apiError('UNAUTHENTICATED', 'Không xác định được email đăng nhập.');
  var users = query('Users', function (row) { return String(row.email).trim().toLowerCase() === email; });
  if (users.length !== 1 || String(users[0].status) !== 'active') {
    throw apiError('UNAUTHENTICATED', 'Tài khoản chưa được cấp quyền: ' + email);
  }
  var user = users[0];
  var roles = [String(user.role)].concat(parseExtraRoles_(user.extra_roles));
  roles.forEach(validateRole_);
  var employee = findById('Employees', user.emp_id);
  return {
    email: email,
    emp_id: user.emp_id,
    name: employee ? employee.full_name : email,
    role: user.role,
    extra_roles: roles.slice(1),
    perms: mergeRolePermissions_(roles)
  };
}

function getAuthContext_() { return authMe_(); }

function requireRole(ctx, allowedRoles) {
  if (!ctx || !Array.isArray(allowedRoles)) throw new Error('requireRole thiếu ngữ cảnh hoặc danh sách vai trò.');
  var roles = [ctx.role].concat(ctx.extra_roles || []);
  if (roles.indexOf('admin') === -1 && !allowedRoles.some(function (role) { return roles.indexOf(role) !== -1; })) {
    throw apiError('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.');
  }
  return ctx;
}

function requireProjectAccess(ctx, projectId) {
  var project = findById('Projects', projectId);
  if (!project) throw apiError('NOT_FOUND', 'Không tìm thấy dự án: ' + projectId, 'project_id');
  var roles = [ctx.role].concat(ctx.extra_roles || []);
  if (roles.indexOf('admin') !== -1 || roles.indexOf('director') !== -1 || roles.indexOf('engineer') !== -1) return project;
  if (roles.indexOf('manager') !== -1 && String(project.pm_emp_id) === String(ctx.emp_id)) return project;
  if (roles.indexOf('employee') !== -1 && query('Tasks', function (task) {
    return String(task.project_id) === String(projectId) && String(task.assignee_emp_id) === String(ctx.emp_id);
  }).length > 0) return project;
  throw apiError('FORBIDDEN', 'Bạn không được phân công vào dự án này.');
}

function parseExtraRoles_(value) {
  if (!value) return [];
  try {
    var parsed = JSON.parse(String(value));
    if (!Array.isArray(parsed)) throw new Error('not array');
    return parsed.map(String);
  } catch (error) {
    throw apiError('VALIDATION', 'Users.extra_roles phải là JSON array.');
  }
}

function validateRole_(role) {
  if (MINI_ERP_ROLES.indexOf(role) === -1) throw apiError('VALIDATION', 'Vai trò không hợp lệ: ' + role);
}

function mergeRolePermissions_(roles) {
  var merged = {};
  roles.forEach(function (role) {
    var perms = MINI_ERP_ROLE_PERMS[role] || {};
    Object.keys(perms).forEach(function (moduleName) {
      if (!merged[moduleName] || role === 'admin') merged[moduleName] = perms[moduleName];
    });
  });
  return merged;
}

function setup_first_admin() {
  return withLock(function () {
    var email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
    if (!email) throw apiError('UNAUTHENTICATED', 'Không xác định được email đăng nhập.');
    var users = readAll('Users');
    var existing = users.find(function (user) { return String(user.email).trim().toLowerCase() === email; });
    if (existing) return existing;
    if (users.some(function (user) { return String(user.role) === 'admin' && String(user.status) === 'active'; })) {
      throw apiError('CONFLICT', 'Hệ thống đã có quản trị viên khác; hãy cấp quyền trong sheet Users.');
    }
    return insert('Users', { email: email, emp_id: email, role: 'admin', extra_roles: '[]', status: 'active' });
  });
}
