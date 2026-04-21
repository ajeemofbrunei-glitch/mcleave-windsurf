const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'mcleave.db');
const db = new Database(dbPath);

console.log('📊 Database Check');
console.log('================');

const adminCount = db.prepare('SELECT COUNT(*) as count FROM admin_profiles').get();
console.log(`Admins: ${adminCount.count}`);

const crewCount = db.prepare('SELECT COUNT(*) as count FROM crews').get();
console.log(`Crew: ${crewCount.count}`);

const requestCount = db.prepare('SELECT COUNT(*) as count FROM leave_requests').get();
console.log(`Leave Requests: ${requestCount.count}`);

const blockedCount = db.prepare('SELECT COUNT(*) as count FROM blocked_dates').get();
console.log(`Blocked Dates: ${blockedCount.count}`);

console.log('\n📋 Sample Admin Data:');
const admins = db.prepare('SELECT id, email, store_location FROM admin_profiles LIMIT 3').all();
admins.forEach(admin => console.log(`  - ${admin.email} (${admin.store_location})`));

console.log('\n👥 Sample Crew Data:');
const crews = db.prepare('SELECT id, name, username FROM crews LIMIT 3').all();
crews.forEach(crew => console.log(`  - ${crew.name} (${crew.username})`));

console.log('\n📝 Sample Leave Request Data:');
const requests = db.prepare('SELECT id, crew_name, status FROM leave_requests LIMIT 3').all();
requests.forEach(req => console.log(`  - ${req.crew_name} (${req.status})`));

db.close();
