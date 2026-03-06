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

db.exec(`
  CREATE TABLE IF NOT EXISTS fonts (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE,
    file_name TEXT,
    storage_path TEXT,
    mime_type TEXT,
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
    const stmt = db.prepare('SELECT id, api_name, display_name, configuration, created_at, updated_at FROM templates ORDER BY updated_at DESC');
    return stmt.all().map(row => {
      if (row.configuration) row.configuration = JSON.parse(row.configuration);
      return row;
    });
  }
};

const fonts = {
  save: (font) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO fonts (id, name, file_name, storage_path, mime_type, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    return stmt.run(
      font.id,
      font.name,
      font.fileName,
      font.storagePath,
      font.mimeType
    );
  },

  getById: (id) => {
    const stmt = db.prepare('SELECT * FROM fonts WHERE id = ?');
    return stmt.get(id);
  },

  getByName: (name) => {
    const stmt = db.prepare('SELECT * FROM fonts WHERE name = ?');
    return stmt.get(name);
  },

  getAll: () => {
    const stmt = db.prepare('SELECT id, name, file_name, storage_path, mime_type, created_at, updated_at FROM fonts ORDER BY updated_at DESC');
    return stmt.all();
  },

  deleteById: (id) => {
    const stmt = db.prepare('DELETE FROM fonts WHERE id = ?');
    return stmt.run(id);
  }
};

module.exports = { templates, fonts };
