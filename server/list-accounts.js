const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'mcleave.db');
const db = new Database(dbPath);

console.log('=== ADMINS ===');
const admins = db.prepare('SELECT id, email, store_name, role FROM admins').all();
admins.forEach(a => {
  console.log(`Email: ${a.email} | Store: ${a.store_name} | Role: ${a.role}`);
});

console.log('\n=== CREWS ===');
const crews = db.prepare('SELECT id, username, name, designation FROM crews').all();
crews.forEach(c => {
  console.log(`Username: ${c.username} | Name: ${c.name} | Designation: ${c.designation}`);
});

db.close();
