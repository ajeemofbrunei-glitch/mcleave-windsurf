const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

// Connect to old database (project root)
const oldDbPath = path.join(__dirname, '../mcleave.db');
const oldDb = new Database(oldDbPath);

// Connect to new database (server folder)
const newDbPath = path.join(__dirname, 'mcleave.db');
const newDb = new Database(newDbPath);

console.log('🔄 Starting migration from old database to new database...');

async function migrate() {
  try {
    // Check what tables exist in old database
    const tables = oldDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('📋 Tables in old database:', tables.map(t => t.name));

    // Migrate admin profiles
    console.log('📥 Fetching admin profiles from old database...');
    const oldAdmins = oldDb.prepare('SELECT * FROM admin_profiles').all();
    console.log(`Found ${oldAdmins.length} admin profiles in old database`);

    if (oldAdmins.length > 0) {
      for (const admin of oldAdmins) {
        const existing = newDb.prepare('SELECT id FROM admin_profiles WHERE id = ?').get(admin.id);
        
        if (!existing) {
          newDb.prepare(`
            INSERT INTO admin_profiles (id, email, password, store_name, store_location, role, plan, whatsapp_enabled, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            admin.id,
            admin.email,
            admin.password,
            admin.store_name,
            admin.store_location || null,
            admin.role || 'store_admin',
            admin.plan || 'free',
            admin.whatsapp_enabled ? 1 : 0,
            admin.is_active !== false ? 1 : 0
          );
          console.log(`✅ Migrated admin: ${admin.email} (${admin.store_name})`);
        } else {
          console.log(`⏭️  Admin already exists: ${admin.email}`);
        }
      }
    }

    // Migrate crews
    console.log('📥 Fetching crews from old database...');
    const oldCrews = oldDb.prepare('SELECT * FROM crews').all();
    console.log(`Found ${oldCrews.length} crew members in old database`);

    if (oldCrews.length > 0) {
      for (const crew of oldCrews) {
        const existing = newDb.prepare('SELECT id FROM crews WHERE id = ?').get(crew.id);
        
        if (!existing) {
          newDb.prepare(`
            INSERT INTO crews (id, name, username, phone, designation, password, joined_at, annual_leave_balance, leave_year, admin_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            crew.id,
            crew.name,
            crew.username,
            crew.phone || '',
            crew.designation || 'Core Crew',
            crew.password,
            crew.joined_at || new Date().toISOString().split('T')[0],
            crew.annual_leave_balance || 0,
            crew.leave_year || 2024,
            crew.admin_id || null
          );
          console.log(`✅ Migrated crew: ${crew.name} (${crew.username})`);
        } else {
          console.log(`⏭️  Crew already exists: ${crew.name}`);
        }
      }
    }

    // Migrate leave requests
    console.log('📥 Fetching leave requests from old database...');
    const oldRequests = oldDb.prepare('SELECT * FROM leave_requests').all();
    console.log(`Found ${oldRequests.length} leave requests in old database`);

    if (oldRequests.length > 0) {
      for (const req of oldRequests) {
        const existing = newDb.prepare('SELECT id FROM leave_requests WHERE id = ?').get(req.id);
        
        if (!existing) {
          newDb.prepare(`
            INSERT INTO leave_requests (id, crew_id, crew_name, phone, designation, leave_type, date_start, date_end, reason, status, submitted_at, responded_at, admin_note, admin_id, year)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            req.id,
            req.crew_id,
            req.crew_name,
            req.phone,
            req.designation,
            req.leave_type,
            req.date_start,
            req.date_end,
            req.reason,
            req.status,
            req.submitted_at,
            req.responded_at || null,
            req.admin_note || '',
            req.admin_id || null,
            req.year || null
          );
          console.log(`✅ Migrated request: ${req.crew_name}`);
        } else {
          console.log(`⏭️  Request already exists: ${req.crew_name}`);
        }
      }
    }

    // Migrate blocked dates
    console.log('📥 Fetching blocked dates from old database...');
    const oldBlocked = oldDb.prepare('SELECT * FROM blocked_dates').all();
    console.log(`Found ${oldBlocked.length} blocked dates in old database`);

    if (oldBlocked.length > 0) {
      for (const blocked of oldBlocked) {
        const existing = newDb.prepare('SELECT id FROM blocked_dates WHERE id = ?').get(blocked.id);
        
        if (!existing) {
          newDb.prepare(`
            INSERT INTO blocked_dates (id, date, admin_id)
            VALUES (?, ?, ?)
          `).run(
            blocked.id,
            blocked.date,
            blocked.admin_id || 'admin-default-001'
          );
          console.log(`✅ Migrated blocked date: ${blocked.date}`);
        } else {
          console.log(`⏭️  Blocked date already exists: ${blocked.date}`);
        }
      }
    }

    console.log('✅ Migration completed successfully!');
    
    // Display summary
    const adminCount = newDb.prepare('SELECT COUNT(*) as count FROM admin_profiles').get();
    const crewCount = newDb.prepare('SELECT COUNT(*) as count FROM crews').get();
    const requestCount = newDb.prepare('SELECT COUNT(*) as count FROM leave_requests').get();
    const blockedCount = newDb.prepare('SELECT COUNT(*) as count FROM blocked_dates').get();
    
    console.log('\n📊 New Database Summary:');
    console.log(`   Admins: ${adminCount.count}`);
    console.log(`   Crew: ${crewCount.count}`);
    console.log(`   Leave Requests: ${requestCount.count}`);
    console.log(`   Blocked Dates: ${blockedCount.count}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    oldDb.close();
    newDb.close();
  }
}

migrate();
