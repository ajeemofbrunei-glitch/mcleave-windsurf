const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'mcleave.db');
const db = new Database(dbPath);

// Check admin profiles
const admin = db.prepare('SELECT * FROM admin_profiles WHERE email = ?').get('ajeemofbrunei@gmail.com');
console.log('Admin account:');
console.log(admin || 'Not found');

// Check all crews
const crews = db.prepare('SELECT id, name, username, admin_id, is_active, created_at FROM crews').all();
console.log('\nAll crew accounts:', crews.length);
console.log(crews);

// Check crews with specific username
const crew = db.prepare('SELECT * FROM crews WHERE username = ?').get('ajeemofbrunei@gmail.com');
console.log('\nCrew with username ajeemofbrunei@gmail.com:');
console.log(crew || 'Not found');

db.close();
