const { AsyncLocalStorage } = require('node:async_hooks');

// Stores the selected DB adapter per request.
// This allows models to keep calling getDatabase() without threading `req` everywhere.
const als = new AsyncLocalStorage();

function runWithDatabase(db, fn) {
  return als.run(db, fn);
}

function getContextDatabase() {
  return als.getStore();
}

module.exports = { runWithDatabase, getContextDatabase };

