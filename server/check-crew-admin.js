const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'mcleave.db');
const db = new Database(dbPath);

console.log('=== CREW MEMBERS ===');
const crews = db.prepare('SELECT id, name, username, admin_id FROM crews').all();
crews.forEach(c => {
  console.log(`Username: ${c.username} | Name: ${c.name} | AdminID: ${c.admin_id || 'NULL'}`);
});

console.log('\n=== ADMINS ===');
try {
  const admins = db.prepare('SELECT id, email, store_name FROM admin_profiles').all();
  admins.forEach(a => {
    console.log(`Email: ${a.email} | Store: ${a.store_name}`);
  });
} catch (error) {
  console.log('Error fetching admins:', error.message);
}

db.close();
