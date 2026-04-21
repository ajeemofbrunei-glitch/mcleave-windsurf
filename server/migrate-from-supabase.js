const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load Supabase credentials from .env
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dXRwcGZoeW9vb2Rwb2RnaWJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTE2MDc5MCwiZXhwIjoyMDkwNzM2NzkwfQ.0NbtGiYJoiD5OBKt7JEIHTTl9iLrW7mLYectSipbUWQ';

if (!supabaseUrl) {
  console.error('Missing Supabase URL in .env file');
  process.exit(1);
}

// Use service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);
console.log(`Using SERVICE ROLE KEY for Supabase connection`);

// Connect to local database
const dbPath = path.join(__dirname, 'mcleave.db');
const db = new Database(dbPath);

console.log('🔄 Starting migration from Supabase to local SQLite...');

async function migrate() {
  try {
    // Migrate admin profiles
    console.log('📥 Fetching admin profiles from Supabase...');
    const { data: admins, error: adminError } = await supabase
      .from('admin_profiles')
      .select('*');

    if (adminError) {
      console.error('Error fetching admin profiles:', adminError);
    } else {
      console.log(`Found ${admins?.length || 0} admin profiles`);

      if (admins && admins.length > 0) {
        const hashPassword = bcrypt.hashSync;
        
        for (const admin of admins) {
          const existing = db.prepare('SELECT id FROM admin_profiles WHERE id = ?').get(admin.id);
          
          if (!existing) {
            const defaultPassword = 'password123';
            const hashedPassword = hashPassword(defaultPassword, 10);
            
            db.prepare(`
              INSERT INTO admin_profiles (id, email, password, store_name, store_location, role, plan, whatsapp_enabled, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              admin.id,
              admin.email,
              hashedPassword,
              admin.store_name,
              admin.store_location || null,
              admin.role || 'store_admin',
              admin.plan || 'free',
              admin.whatsapp_enabled ? 1 : 0,
              admin.is_active !== false ? 1 : 0
            );
            console.log(`✅ Migrated admin: ${admin.email} (${admin.store_name}) - Default password: password123`);
          } else {
            console.log(`⏭️  Admin already exists: ${admin.email}`);
          }
        }
      }
    }

    // Get the admin ID for JPDT to fetch its specific data
    const jpdtAdmin = admins?.find(a => a.store_location === 'JPDT');
    console.log(`🔍 JPDT Admin ID: ${jpdtAdmin?.id || 'Not found'}`);

    // Try to fetch crew members for JPDT specifically
    if (jpdtAdmin) {
      console.log('📥 Fetching crew members for JPDT specifically...');
      const { data: jpdtCrew, error: jpdtCrewError } = await supabase
        .from('crews')
        .select('*')
        .eq('admin_id', jpdtAdmin.id);

      if (jpdtCrewError) {
        console.log('   Error fetching JPDT crews:', jpdtCrewError.message);
      } else {
        console.log(`   Found ${jpdtCrew?.length || 0} crew members for JPDT`);
        if (jpdtCrew && jpdtCrew.length > 0) {
          console.log('   Sample crew data:', jpdtCrew[0]);
        }
      }

      console.log('📥 Fetching leave requests for JPDT specifically...');
      const { data: jpdtRequests, error: jpdtRequestsError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('admin_id', jpdtAdmin.id);

      if (jpdtRequestsError) {
        console.log('   Error fetching JPDT requests:', jpdtRequestsError.message);
      } else {
        console.log(`   Found ${jpdtRequests?.length || 0} leave requests for JPDT`);
        if (jpdtRequests && jpdtRequests.length > 0) {
          console.log('   Sample request data:', jpdtRequests[0]);
        }
      }
    }

    // Try to fetch from 'crews' table (original name)
    console.log('📥 Checking for crews table...');
    const { data: crewsData, error: crewsError } = await supabase
      .from('crews')
      .select('*');

    if (crewsError) {
      console.log('   crews table not found or error:', crewsError.message);
    } else {
      console.log(`   Found ${crewsData?.length || 0} records in crews table`);
      if (crewsData && crewsData.length > 0) {
        console.log('   Sample crew data:', crewsData[0]);
      }
      
      if (crewsData && crewsData.length > 0) {
        for (const member of crewsData) {
          const existing = db.prepare('SELECT id FROM crews WHERE id = ?').get(member.id);
          
          if (!existing) {
            const defaultPassword = 'password123';
            const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
            
            db.prepare(`
              INSERT INTO crews (id, name, username, phone, designation, password, joined_at, annual_leave_balance, leave_year, admin_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              member.id,
              member.name,
              member.username,
              member.phone || '',
              member.designation || 'Core Crew',
              hashedPassword,
              member.joined_at || new Date().toISOString().split('T')[0],
              member.annual_leave_balance || 0,
              member.leave_year || 2024,
              member.admin_id || null
            );
            console.log(`✅ Migrated crew: ${member.name} (${member.username})`);
          } else {
            console.log(`⏭️  Crew already exists: ${member.name}`);
          }
        }
      }
    }

    // Try crew_members table (alternative name)
    console.log('📥 Checking for crew_members table...');
    const { data: crewMembersData, error: crewMembersError } = await supabase
      .from('crew_members')
      .select('*');

    if (crewMembersError) {
      console.log('   crew_members table not found or error:', crewMembersError.message);
    } else {
      console.log(`   Found ${crewMembersData?.length || 0} records in crew_members table`);
      if (crewMembersData && crewMembersData.length > 0) {
        console.log('   Sample crew member data:', crewMembersData[0]);
      }
      
      if (crewMembersData && crewMembersData.length > 0) {
        for (const member of crewMembersData) {
          const existing = db.prepare('SELECT id FROM crews WHERE id = ?').get(member.id);
          
          if (!existing) {
            const defaultPassword = 'password123';
            const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
            
            db.prepare(`
              INSERT INTO crews (id, name, username, phone, designation, password, joined_at, annual_leave_balance, leave_year, admin_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              member.id,
              member.full_name || member.name,
              member.email || member.username,
              member.phone || '',
              member.designation || 'Core Crew',
              hashedPassword,
              member.created_at ? member.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
              member.annual_leave_balance || 0,
              member.leave_year || 2024,
              member.admin_id || null
            );
            console.log(`✅ Migrated crew member: ${member.full_name || member.name}`);
          } else {
            console.log(`⏭️  Crew member already exists: ${member.full_name || member.name}`);
          }
        }
      }
    }

    // Migrate crew members
    console.log('📥 Fetching crew members from Supabase...');
    const { data: crew, error: crewError } = await supabase
      .from('crew_members')
      .select('*');

    if (crewError) {
      console.error('Error fetching crew members:', crewError);
      return;
    }

    console.log(`Found ${crew?.length || 0} crew members`);

    if (crew && crew.length > 0) {
      for (const member of crew) {
        const existing = db.prepare('SELECT id FROM crews WHERE id = ?').get(member.id);
        
        if (!existing) {
          db.prepare(`
            INSERT INTO crews (id, name, username, phone, designation, password, joined_at, annual_leave_balance, leave_year, admin_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            member.id,
            member.full_name,
            member.email,
            member.phone || '',
            member.designation || 'Core Crew',
            '', // Password not stored in crew_members table in Supabase auth
            member.created_at ? member.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            member.annual_leave_balance || 0,
            member.leave_year || 2024,
            member.admin_id || null
          );
          console.log(`✅ Migrated crew: ${member.full_name}`);
        } else {
          console.log(`⏭️  Crew already exists: ${member.full_name}`);
        }
      }
    }

    // Migrate leave requests
    console.log('📥 Fetching leave requests from Supabase...');
    const { data: requests, error: requestsError } = await supabase
      .from('leave_requests')
      .select('*');

    if (requestsError) {
      console.error('Error fetching leave requests:', requestsError);
      return;
    }

    console.log(`Found ${requests?.length || 0} leave requests`);

    if (requests && requests.length > 0) {
      for (const req of requests) {
        const existing = db.prepare('SELECT id FROM leave_requests WHERE id = ?').get(req.id);
        
        if (!existing) {
          db.prepare(`
            INSERT INTO leave_requests (id, crew_id, crew_name, phone, designation, leave_type, date_start, date_end, reason, status, submitted_at, responded_at, admin_note, admin_id, year)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            req.id,
            req.crew_id || req.crew_member_id || 'unknown',
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
    console.log('📥 Fetching blocked dates from Supabase...');
    const { data: blockedDates, error: blockedError } = await supabase
      .from('blocked_dates')
      .select('*');

    if (blockedError) {
      console.error('Error fetching blocked dates:', blockedError);
      return;
    }

    console.log(`Found ${blockedDates?.length || 0} blocked dates`);

    if (blockedDates && blockedDates.length > 0) {
      for (const blocked of blockedDates) {
        const existing = db.prepare('SELECT id FROM blocked_dates WHERE id = ?').get(blocked.id);
        
        if (!existing) {
          db.prepare(`
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
    const adminCount = db.prepare('SELECT COUNT(*) as count FROM admin_profiles').get();
    const crewCount = db.prepare('SELECT COUNT(*) as count FROM crews').get();
    const requestCount = db.prepare('SELECT COUNT(*) as count FROM leave_requests').get();
    const blockedCount = db.prepare('SELECT COUNT(*) as count FROM blocked_dates').get();
    
    console.log('\n📊 Migration Summary:');
    console.log(`   Admins: ${adminCount.count}`);
    console.log(`   Crew: ${crewCount.count}`);
    console.log(`   Leave Requests: ${requestCount.count}`);
    console.log(`   Blocked Dates: ${blockedCount.count}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    db.close();
  }
}

migrate();
