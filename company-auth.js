const AUTH_STORAGE_KEY = 'bodhi-quality-company-v1';
const SESSION_STORAGE_KEY = 'bodhi-quality-session-v1';
const LOGIN_GUARD_KEY = 'bodhi-quality-login-guard-v1';
const SESSION_TTL = 12 * 60 * 60 * 1000;
const PASSWORD_ITERATIONS = 180000;

export const ROLE_META = {
  admin: { label: '系统管理员', description: '人员、数据和全部报告管理', canEdit: true, canApprove: true, canManageUsers: true },
  manager: { label: '项目负责人', description: '报告管理、审核与签发', canEdit: true, canApprove: true, canManageUsers: false },
  inspector: { label: '质检工程师', description: '创建、录入和提交验收报告', canEdit: true, canApprove: false, canManageUsers: false },
  viewer: { label: '查阅人员', description: '查看、打印已生成报告', canEdit: false, canApprove: false, canManageUsers: false },
};

const normalizeEmployeeId = value => String(value || '').trim().toUpperCase();
const encodeBytes = bytes => btoa(String.fromCharCode(...bytes));
const decodeBytes = value => Uint8Array.from(atob(value), character => character.charCodeAt(0));
const createId = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const derivePassword = async (password, salt) => {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: decodeBytes(salt), iterations: PASSWORD_ITERATIONS },
    material,
    256,
  );
  return encodeBytes(new Uint8Array(bits));
};

const createPasswordRecord = async password => {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = encodeBytes(saltBytes);
  return { salt, passwordHash: await derivePassword(password, salt) };
};

const appendEvent = (workspace, event) => ({
  ...workspace,
  events: [
    { id: createId('event'), at: new Date().toISOString(), ...event },
    ...(workspace.events || []),
  ].slice(0, 300),
});

export const validatePassword = password => {
  if (String(password || '').length < 8) return '密码至少需要 8 位';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return '密码需要同时包含字母和数字';
  return '';
};

export const loadCompany = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null');
    if (!parsed?.organization?.name || !Array.isArray(parsed.users)) return null;
    return { ...parsed, events: Array.isArray(parsed.events) ? parsed.events : [] };
  } catch {
    return null;
  }
};

export const saveCompany = workspace => {
  if (workspace) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(workspace));
};

export const initializeCompany = async ({ organizationName, name, employeeId, department, password }) => {
  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(passwordError);
  const credentials = await createPasswordRecord(password);
  const now = new Date().toISOString();
  const admin = {
    id: createId('user'),
    name: name.trim(),
    employeeId: normalizeEmployeeId(employeeId),
    department: department.trim() || '工程质量管理',
    role: 'admin',
    active: true,
    createdAt: now,
    ...credentials,
  };
  return appendEvent({
    version: 1,
    organization: { id: createId('org'), name: organizationName.trim(), createdAt: now },
    users: [admin],
    events: [],
  }, { type: 'company_initialized', actorId: admin.id, actorName: admin.name, detail: '建立公司管理员账号' });
};

const readLoginGuard = () => {
  try { return JSON.parse(localStorage.getItem(LOGIN_GUARD_KEY) || '{}'); } catch { return {}; }
};

const writeLoginGuard = guard => localStorage.setItem(LOGIN_GUARD_KEY, JSON.stringify(guard));

export const authenticateUser = async (workspace, employeeId, password) => {
  const normalizedId = normalizeEmployeeId(employeeId);
  const guard = readLoginGuard();
  const entry = guard[normalizedId] || { failures: 0, lockUntil: 0 };
  if (entry.lockUntil > Date.now()) {
    const minutes = Math.max(1, Math.ceil((entry.lockUntil - Date.now()) / 60000));
    throw new Error(`登录尝试过多，请 ${minutes} 分钟后再试`);
  }
  const user = workspace.users.find(item => item.employeeId === normalizedId);
  const valid = Boolean(user?.active) && await derivePassword(password, user.salt) === user.passwordHash;
  if (!valid) {
    const failures = entry.failures + 1;
    guard[normalizedId] = failures >= 5
      ? { failures: 0, lockUntil: Date.now() + 15 * 60 * 1000 }
      : { failures, lockUntil: 0 };
    writeLoginGuard(guard);
    throw new Error(failures >= 5 ? '登录失败次数过多，账号已锁定 15 分钟' : '员工号或密码不正确');
  }
  delete guard[normalizedId];
  writeLoginGuard(guard);
  return user;
};

export const createSession = (user, remember = false) => {
  const session = { userId: user.id, expiresAt: Date.now() + SESSION_TTL };
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  if (remember) localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_STORAGE_KEY);
  return session;
};

export const loadSessionUser = workspace => {
  if (!workspace) return null;
  let session = null;
  try {
    session = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(SESSION_STORAGE_KEY) || 'null');
  } catch {
    session = null;
  }
  if (!session || session.expiresAt <= Date.now()) {
    clearSession();
    return null;
  }
  const user = workspace.users.find(item => item.id === session.userId && item.active);
  return user || null;
};

export const clearSession = () => {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(SESSION_STORAGE_KEY);
};

export const addCompanyUser = async (workspace, data, actor) => {
  const employeeId = normalizeEmployeeId(data.employeeId);
  if (workspace.users.some(user => user.employeeId === employeeId)) throw new Error('该员工号已存在');
  const passwordError = validatePassword(data.password);
  if (passwordError) throw new Error(passwordError);
  const credentials = await createPasswordRecord(data.password);
  const user = {
    id: createId('user'),
    name: data.name.trim(),
    employeeId,
    department: data.department.trim(),
    role: ROLE_META[data.role] ? data.role : 'inspector',
    active: true,
    createdAt: new Date().toISOString(),
    ...credentials,
  };
  return appendEvent({ ...workspace, users: [...workspace.users, user] }, {
    type: 'user_created', actorId: actor.id, actorName: actor.name, detail: `新增人员：${user.name}（${ROLE_META[user.role].label}）`,
  });
};

export const setCompanyUserActive = (workspace, userId, active, actor) => {
  const target = workspace.users.find(user => user.id === userId);
  if (!target) throw new Error('未找到人员账号');
  if (target.id === actor.id && !active) throw new Error('不能停用当前登录账号');
  if (!active && target.role === 'admin' && workspace.users.filter(user => user.active && user.role === 'admin').length === 1) throw new Error('至少需要保留一名启用状态的管理员');
  const updated = { ...workspace, users: workspace.users.map(user => user.id === userId ? { ...user, active } : user) };
  return appendEvent(updated, {
    type: active ? 'user_enabled' : 'user_disabled', actorId: actor.id, actorName: actor.name, detail: `${active ? '启用' : '停用'}人员：${target.name}`,
  });
};

export const setCompanyUserRole = (workspace, userId, role, actor) => {
  const target = workspace.users.find(user => user.id === userId);
  if (!target || !ROLE_META[role]) throw new Error('人员或角色无效');
  if (target.role === 'admin' && role !== 'admin' && workspace.users.filter(user => user.active && user.role === 'admin').length === 1) throw new Error('至少需要保留一名启用状态的管理员');
  const updated = { ...workspace, users: workspace.users.map(user => user.id === userId ? { ...user, role } : user) };
  return appendEvent(updated, {
    type: 'user_role_changed', actorId: actor.id, actorName: actor.name, detail: `调整 ${target.name} 的角色为${ROLE_META[role].label}`,
  });
};

export const resetCompanyUserPassword = async (workspace, userId, newPassword, actor) => {
  const target = workspace.users.find(user => user.id === userId);
  if (!target) throw new Error('未找到人员账号');
  const passwordError = validatePassword(newPassword);
  if (passwordError) throw new Error(passwordError);
  const credentials = await createPasswordRecord(newPassword);
  const updated = { ...workspace, users: workspace.users.map(user => user.id === userId ? { ...user, ...credentials, passwordChangedAt: new Date().toISOString() } : user) };
  return appendEvent(updated, {
    type: 'password_reset', actorId: actor.id, actorName: actor.name, detail: `重置 ${target.name} 的登录密码`,
  });
};

export const changeOwnPassword = async (workspace, userId, currentPassword, newPassword) => {
  const user = workspace.users.find(item => item.id === userId);
  if (!user || await derivePassword(currentPassword, user.salt) !== user.passwordHash) throw new Error('当前密码不正确');
  const passwordError = validatePassword(newPassword);
  if (passwordError) throw new Error(passwordError);
  const credentials = await createPasswordRecord(newPassword);
  const updated = { ...workspace, users: workspace.users.map(item => item.id === userId ? { ...item, ...credentials, passwordChangedAt: new Date().toISOString() } : item) };
  return appendEvent(updated, { type: 'password_changed', actorId: user.id, actorName: user.name, detail: '修改登录密码' });
};

export const recordCompanyEvent = (workspace, event) => appendEvent(workspace, event);
