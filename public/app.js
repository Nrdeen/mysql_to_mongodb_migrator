/* Database Migrator - Schema Discovery & Migration Interface */

const els = {
  dbType: document.getElementById('dbType'),
  btnHealth: document.getElementById('btnHealth'),

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

// Boot - Initialize
els.btnHealth.onclick = async () => {
  const res = await fetch('/health');
  const data = await res.json();
  alert('✅ Server is healthy: ' + JSON.stringify(data));
};

