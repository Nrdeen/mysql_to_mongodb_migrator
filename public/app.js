/* Simple API testing UI (no dependencies). */

const els = {
  dbType: document.getElementById('dbType'),
  btnHealth: document.getElementById('btnHealth'),

  signupEmail: document.getElementById('signupEmail'),
  signupPassword: document.getElementById('signupPassword'),
  signupName: document.getElementById('signupName'),
  signupRole: document.getElementById('signupRole'),
  btnSignup: document.getElementById('btnSignup'),
  btnFillUser: document.getElementById('btnFillUser'),

  loginEmail: document.getElementById('loginEmail'),
  loginPassword: document.getElementById('loginPassword'),
  btnLogin: document.getElementById('btnLogin'),
  btnMe: document.getElementById('btnMe'),

  token: document.getElementById('token'),
  userId: document.getElementById('userId'),
  postId: document.getElementById('postId'),
  envelopeEId: document.getElementById('envelopeEId'),
  btnSaveSession: document.getElementById('btnSaveSession'),
  btnClearSession: document.getElementById('btnClearSession'),

  btnGetUser: document.getElementById('btnGetUser'),
  btnUpdateUser: document.getElementById('btnUpdateUser'),
  btnCreatePost: document.getElementById('btnCreatePost'),
  btnGetPost: document.getElementById('btnGetPost'),
  btnUpdatePost: document.getElementById('btnUpdatePost'),
  btnDeletePost: document.getElementById('btnDeletePost'),

  method: document.getElementById('method'),
  path: document.getElementById('path'),
  body: document.getElementById('body'),
  btnSend: document.getElementById('btnSend'),

  statusPill: document.getElementById('statusPill'),
  dbPill: document.getElementById('dbPill'),
  response: document.getElementById('response'),
  templates: document.getElementById('templates'),

  // Discover Schema elements
  mysqlHost: document.getElementById('mysqlHost'),
  mysqlPort: document.getElementById('mysqlPort'),
  mysqlUsername: document.getElementById('mysqlUsername'),
  mysqlPassword: document.getElementById('mysqlPassword'),
  mysqlDatabase: document.getElementById('mysqlDatabase'),
  btnDiscoverMySQL: document.getElementById('btnDiscoverMySQL'),

  discoverResponse: document.getElementById('discoverResponse'),
  discoverTargetUri: document.getElementById('discoverTargetUri'),
  discoverMigrationOptions: document.getElementById('discoverMigrationOptions'),
  btnAktar: document.getElementById('btnAktar'),
  btnClearDiscovery: document.getElementById('btnClearDiscovery'),
  discoveryProgressBar: document.getElementById('discoveryProgressBar'),
  discoveryProgressText: document.getElementById('discoveryProgressText'),
  transferResponse: document.getElementById('transferResponse')
};

function nowId(prefix) {
  return `${prefix}+${Date.now()}@example.com`;
}

function storageKey(dbType) {
  return `api_test_ui_session_${dbType}`;
}

function getDbType() {
  return els.dbType.value;
}

function loadSession() {
  const key = storageKey(getDbType());
  const raw = localStorage.getItem(key);
  if (!raw) return;
  try {
    const s = JSON.parse(raw);
    els.token.value = s.token || '';
    els.userId.value = s.userId || '';
    els.postId.value = s.postId || '';
    els.envelopeEId.value = s.envelopeEId || '';
    els.loginEmail.value = s.email || '';
    els.signupEmail.value = s.email || '';
  } catch {}
}

function saveSession(extra = {}) {
  const key = storageKey(getDbType());
  const session = {
    token: els.token.value.trim(),
    userId: els.userId.value.trim(),
    postId: els.postId.value.trim(),
    envelopeEId: els.envelopeEId.value.trim(),
    email: extra.email || els.loginEmail.value.trim() || els.signupEmail.value.trim()
  };
  localStorage.setItem(key, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(storageKey(getDbType()));
  els.token.value = '';
  els.userId.value = '';
  els.postId.value = '';
  els.envelopeEId.value = '';
}

function setResponse({ status, headers, body }) {
  els.statusPill.textContent = status ? `HTTP ${status}` : '—';
  els.statusPill.className = 'pill ' + (status >= 200 && status < 300 ? 'ok' : status ? 'bad' : '');

  const dbUsed = headers?.get?.('x-db-used') || headers?.get?.('X-Db-Used') || '—';
  els.dbPill.textContent = `x-db-used: ${dbUsed}`;

  if (typeof body === 'string') {
    els.response.textContent = body;
  } else {
    els.response.textContent = JSON.stringify(body, null, 2);
  }
}

async function apiFetch(method, path, jsonBody) {
  const headers = new Headers();
  headers.set('x-db-type', getDbType());

  const token = els.token.value.trim();
  if (token && path.startsWith('/api/')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let body;
  if (jsonBody !== undefined && jsonBody !== null && method !== 'GET') {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(jsonBody);
  }

  const res = await fetch(path, { method, headers, body });
  const contentType = res.headers.get('content-type') || '';
  let parsed;
  if (contentType.includes('application/json')) {
    parsed = await res.json();
  } else {
    parsed = await res.text();
  }
  setResponse({ status: res.status, headers: res.headers, body: parsed });
  return { res, parsed };
}

function setExplorer(method, path, bodyObj) {
  els.method.value = method;
  els.path.value = path;
  els.body.value = bodyObj ? JSON.stringify(bodyObj, null, 2) : '';
}

function addTemplate(label, method, path, bodyObj) {
  const btn = document.createElement('button');
  btn.className = 'template-btn';
  btn.textContent = label;
  btn.onclick = () => setExplorer(method, path, bodyObj);
  els.templates.appendChild(btn);
}

function initTemplates() {
  els.templates.innerHTML = '';
  addTemplate('Kimlik: Kayıt', 'POST', '/api/auth/signup', {
    email: nowId('test'),
    password: 'test123456',
    name: 'Test User',
    role: 'user'
  });
  addTemplate('Kimlik: Giriş', 'POST', '/api/auth/login', { email: '', password: 'test123456' });
  addTemplate('Kimlik: Benim Verilerim', 'GET', '/api/auth/me');

  addTemplate('Gönderiler: Oluştur', 'POST', '/api/posts', {
    title: 'Merhaba dünya',
    content: 'İlk gönderim',
    status: 'draft'
  });
  addTemplate('Gönderiler: Listele', 'GET', '/api/posts?page=1&limit=10&sort=-createdAt');
  addTemplate('Gönderiler: ID ile Getir', 'GET', '/api/posts/{{postId}}');
  addTemplate('Posts: Update by ID', 'PUT', '/api/posts/{{postId}}', { status: 'published' });
  addTemplate('Posts: Delete by ID', 'DELETE', '/api/posts/{{postId}}');

  addTemplate('Demo: insertMany', 'POST', '/api/demo/posts/bulk', { count: 5, prefix: 'demo' });
  addTemplate('Demo: count', 'GET', '/api/demo/posts/count');
  addTemplate('Demo: updateMany', 'PATCH', '/api/demo/posts/publish-many', { fromStatus: 'draft', toStatus: 'published' });
  addTemplate('Demo: aggregate', 'POST', '/api/demo/posts/aggregate', {
    pipeline: [{ $match: { status: 'published' } }, { $sort: { createdAt: -1 } }, { $limit: 5 }]
  });
  addTemplate('Demo: deleteMany', 'DELETE', '/api/demo/posts/delete-many', { status: 'draft' });

  addTemplate('Envelopes: Create', 'POST', '/api/envelopes', { ETId: 'ET-1', SV: 1, ORGId: 'ORG-1', Data: 'hello', SL: 'local' });
  addTemplate('Envelopes: List', 'GET', '/api/envelopes?limit=10&skip=0&sort=-CreatedAt');
  addTemplate('Envelopes: Get by EId', 'GET', '/api/envelopes/{{envelopeEId}}');
  addTemplate('Envelopes: Update', 'PUT', '/api/envelopes/{{envelopeEId}}', { ES: 20, Data: 'updated' });
  addTemplate('Envelopes: updateMany', 'PATCH', '/api/envelopes/status/bulk', { oldStatus: 10, newStatus: 20 });
  addTemplate('Envelopes: count', 'GET', '/api/envelopes/_meta/count');
  addTemplate('Envelopes: distinct ETId', 'GET', '/api/envelopes/_meta/distinct/ETId');
  addTemplate('Envelopes: exists', 'GET', '/api/envelopes/_meta/exists/{{envelopeEId}}');
  addTemplate('Envelopes: aggregate', 'POST', '/api/envelopes/_meta/aggregate', {
    pipeline: [{ $match: { ES: 20 } }, { $sort: { CreatedAt: -1 } }, { $limit: 5 }]
  });
}

function resolveVars(path) {
  return path
    .replace('{{postId}}', encodeURIComponent(els.postId.value.trim()))
    .replace('{{userId}}', encodeURIComponent(els.userId.value.trim()))
    .replace('{{envelopeEId}}', encodeURIComponent(els.envelopeEId.value.trim()));
}

// Wire events
els.dbType.onchange = () => {
  loadSession();
  initTemplates();
};

els.btnHealth.onclick = async () => {
  await apiFetch('GET', '/health');
};

els.btnFillUser.onclick = () => {
  const e = nowId('test');
  els.signupEmail.value = e;
  els.loginEmail.value = e;
  els.signupPassword.value = 'test123456';
  els.loginPassword.value = 'test123456';
};

els.btnSignup.onclick = async () => {
  const body = {
    email: els.signupEmail.value.trim(),
    password: els.signupPassword.value,
    name: els.signupName.value.trim() || 'Test User',
    role: els.signupRole.value
  };
  const { parsed } = await apiFetch('POST', '/api/auth/signup', body);
  const token = parsed?.data?.token;
  const user = parsed?.data?.user;
  if (token) els.token.value = token;
  if (user) els.userId.value = String(user._id ?? user.id ?? '');
  saveSession({ email: body.email });
};

els.btnLogin.onclick = async () => {
  const body = {
    email: els.loginEmail.value.trim(),
    password: els.loginPassword.value
  };
  const { parsed } = await apiFetch('POST', '/api/auth/login', body);
  const token = parsed?.data?.token;
  const user = parsed?.data?.user;
  if (token) els.token.value = token;
  if (user) els.userId.value = String(user._id ?? user.id ?? '');
  saveSession({ email: body.email });
};

els.btnMe.onclick = async () => {
  await apiFetch('GET', '/api/auth/me');
};

els.btnSaveSession.onclick = () => saveSession();
els.btnClearSession.onclick = () => {
  clearSession();
  setResponse({ status: 0, headers: new Headers(), body: '(cleared)' });
};

els.btnGetUser.onclick = async () => {
  const id = els.userId.value.trim();
  if (!id) return setResponse({ status: 0, headers: new Headers(), body: 'Set userId first' });
  await apiFetch('GET', `/api/users/${encodeURIComponent(id)}`);
};

els.btnUpdateUser.onclick = async () => {
  const id = els.userId.value.trim();
  if (!id) return setResponse({ status: 0, headers: new Headers(), body: 'Set userId first' });
  await apiFetch('PUT', `/api/users/${encodeURIComponent(id)}`, { name: 'Updated Name' });
};

els.btnCreatePost.onclick = async () => {
  const { parsed } = await apiFetch('POST', '/api/posts', {
    title: `Post ${Date.now()}`,
    content: 'Created from UI',
    status: 'draft'
  });
  const post = parsed?.data;
  if (post) els.postId.value = String(post._id ?? post.id ?? '');
  saveSession();
};

els.btnGetPost.onclick = async () => {
  const id = els.postId.value.trim();
  if (!id) return setResponse({ status: 0, headers: new Headers(), body: 'Set postId first' });
  await apiFetch('GET', `/api/posts/${encodeURIComponent(id)}`);
};

els.btnUpdatePost.onclick = async () => {
  const id = els.postId.value.trim();
  if (!id) return setResponse({ status: 0, headers: new Headers(), body: 'Set postId first' });
  await apiFetch('PUT', `/api/posts/${encodeURIComponent(id)}`, { status: 'published' });
};

els.btnDeletePost.onclick = async () => {
  const id = els.postId.value.trim();
  if (!id) return setResponse({ status: 0, headers: new Headers(), body: 'Set postId first' });
  await apiFetch('DELETE', `/api/posts/${encodeURIComponent(id)}`);
};

els.btnSend.onclick = async () => {
  const method = els.method.value;
  const path = resolveVars(els.path.value.trim());

  let body = null;
  const raw = els.body.value.trim();
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch (e) {
      return setResponse({ status: 0, headers: new Headers(), body: `Invalid JSON body: ${e.message}` });
    }
  }

  await apiFetch(method, path, body);
};

// Tab switching
function switchTab(tabId) {
  const tabContents = document.querySelectorAll('.tab-content');
  const tabBtns = document.querySelectorAll('.tab-btn');
  
  tabContents.forEach(tab => tab.classList.remove('active'));
  tabBtns.forEach(btn => btn.classList.remove('active'));
  
  document.getElementById(tabId).classList.add('active');
  event.target.classList.add('active');
}

const tabBtns = document.querySelectorAll('.tab-btn');
tabBtns.forEach(btn => {
  btn.onclick = (e) => switchTab(e.target.dataset.tab);
});

// Discover Schema Functions
let lastDiscoveredSchema = null;

async function performDiscovery(dbType) {
  const isMySQL = dbType === 'mysql';
  const host = isMySQL ? els.mysqlHost.value.trim() : els.mssqlHost.value.trim();
  const port = isMySQL ? els.mysqlPort.value : els.mssqlPort.value;
  const username = isMySQL ? els.mysqlUsername.value.trim() : els.mssqlUsername.value.trim();
  const password = isMySQL ? els.mysqlPassword.value : els.mssqlPassword.value;
  const database = isMySQL ? els.mysqlDatabase.value.trim() : els.mssqlDatabase.value.trim();

  if (!host || !username || !database) {
    els.discoverResponse.textContent = 'Error: Please fill in all required fields (host, username, database)';
    return;
  }

  els.discoverResponse.textContent = '🔄 Discovering schema...';

  try {
    const res = await fetch('/api/migration/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host,
        port: parseInt(port) || (dbType === 'mysql' ? 3306 : 1433),
        username,
        password,
        database,
        dbType
      })
    });

    const data = await res.json();
    lastDiscoveredSchema = data;
    els.discoverResponse.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    els.discoverResponse.textContent = `❌ Error: ${err.message}`;
  }
}

els.btnDiscoverMySQL.onclick = () => performDiscovery('mysql');

// Aktar (Transfer) Function
async function performAktar() {
  if (!lastDiscoveredSchema) {
    els.transferResponse.textContent = '❌ Error: Please discover a database schema first';
    return;
  }

  const targetUri = els.discoverTargetUri.value.trim();
  if (!targetUri) {
    els.transferResponse.textContent = '❌ Error: Please enter MongoDB URI';
    return;
  }

  let migrationOptions = {};
  try {
    const raw = els.discoverMigrationOptions.value.trim();
    if (raw) migrationOptions = JSON.parse(raw);
  } catch (e) {
    els.transferResponse.textContent = `❌ Error: Invalid migration options JSON: ${e.message}`;
    return;
  }

  const dbType = 'mysql';
  const isMySQL = dbType === 'mysql';
  const sourceData = {
    dbType,
    host: els.mysqlHost.value.trim(),
    port: parseInt(els.mysqlPort.value) || 3306,
    username: els.mysqlUsername.value.trim(),
    password: els.mysqlPassword.value,
    database: els.mysqlDatabase.value.trim()
  };

  els.transferResponse.textContent = '🚀 Starting transfer to MongoDB...';
  els.discoveryProgressBar.style.width = '10%';
  els.discoveryProgressText.textContent = 'Initializing transfer...';

  try {
    const res = await fetch('/api/migration/migrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: sourceData,
        target: { uri: targetUri },
        options: migrationOptions
      })
    });

    const data = await res.json();
    
    if (data.success) {
      els.discoveryProgressBar.style.width = '100%';
      els.discoveryProgressText.textContent = '✅ Transfer completed successfully!';
      els.transferResponse.textContent = JSON.stringify({
        status: 'SUCCESS',
        message: 'Data transferred to MongoDB',
        details: data
      }, null, 2);
    } else {
      els.discoveryProgressBar.style.width = '0%';
      els.discoveryProgressText.textContent = '❌ Transfer failed';
      els.transferResponse.textContent = JSON.stringify({
        status: 'FAILED',
        error: data.error || 'Unknown error',
        details: data
      }, null, 2);
    }
  } catch (err) {
    els.transferResponse.textContent = `❌ Error: ${err.message}`;
    els.discoveryProgressBar.style.width = '0%';
    els.discoveryProgressText.textContent = 'Error occurred';
  }
}

els.btnAktar.onclick = performAktar;
els.btnClearDiscovery.onclick = () => {
  els.discoverResponse.textContent = '(no discovery yet)';
  els.transferResponse.textContent = '(no transfer yet)';
  els.discoveryProgressBar.style.width = '0%';
  els.discoveryProgressText.textContent = 'Ready';
  lastDiscoveredSchema = null;
};

// Boot
els.signupName.value = els.signupName.value || 'Test User';
els.signupPassword.value = els.signupPassword.value || 'test123456';
els.loginPassword.value = els.loginPassword.value || 'test123456';
loadSession();
initTemplates();

