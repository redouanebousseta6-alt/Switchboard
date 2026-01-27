const Database = require('better-sqlite3');
const path = require('path');

// Use a configurable path so we can point SQLite at a Railway volume in production
// Example on Railway: set DB_PATH=/data/switchboard.db and mount a volume at /data
const dbFilePath = process.env.DB_PATH || path.join(__dirname, 'switchboard.db');
const db = new Database(dbFilePath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    api_name TEXT UNIQUE,
    display_name TEXT,
    configuration TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const templates = {
  save: (template) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO templates (id, api_name, display_name, configuration, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    return stmt.run(
      template.id, 
      template.apiName, 
      template.displayName, 
      JSON.stringify(template.configuration)
    );
  },

  getById: (id) => {
    const stmt = db.prepare('SELECT * FROM templates WHERE id = ?');
    const row = stmt.get(id);
    if (row) row.configuration = JSON.parse(row.configuration);
    return row;
  },

  getByApiName: (apiName) => {
    const stmt = db.prepare('SELECT * FROM templates WHERE api_name = ?');
    const row = stmt.get(apiName);
    if (row) row.configuration = JSON.parse(row.configuration);
    return row;
  },

  getAll: () => {
    const stmt = db.prepare('SELECT id, api_name, display_name, created_at FROM templates');
    return stmt.all();
  }
};

module.exports = { templates };
