const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'mcleave.db');
const db = new Database(dbPath);

try {
  // Check if maintenance_mode column exists in admins table
  const columns = db.prepare("PRAGMA table_info(admins)").all();
  const hasMaintenanceMode = columns.some(col => col.name === 'maintenance_mode');

  if (!hasMaintenanceMode) {
    console.log('Adding maintenance_mode column to admins table...');
    db.exec('ALTER TABLE admins ADD COLUMN maintenance_mode INTEGER DEFAULT 0');
    console.log('✅ maintenance_mode column added successfully');
  } else {
    console.log('ℹ️  maintenance_mode column already exists');
  }
} catch (error) {
  console.error('❌ Error adding column:', error);
} finally {
  db.close();
}
