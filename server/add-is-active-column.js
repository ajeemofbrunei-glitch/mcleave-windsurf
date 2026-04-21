const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'mcleave.db');
const db = new Database(dbPath);

try {
  // Check if is_active column exists
  const columns = db.prepare("PRAGMA table_info(crews)").all();
  const hasIsActive = columns.some(col => col.name === 'is_active');

  if (!hasIsActive) {
    console.log('Adding is_active column to crews table...');
    db.exec('ALTER TABLE crews ADD COLUMN is_active INTEGER DEFAULT 1');
    console.log('✅ is_active column added successfully');
  } else {
    console.log('ℹ️  is_active column already exists');
  }
} catch (error) {
  console.error('❌ Error adding column:', error);
} finally {
  db.close();
}
