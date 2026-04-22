// PostgreSQL database adapter for Render
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Use connection string from environment
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Render
});

// Hash password
async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Verify password
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// Initialize database
async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_profiles (
        id TEXT PRIMARY KEY,
        store_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        maintenance_mode INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS crews (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        phone TEXT NOT NULL,
        designation TEXT NOT NULL,
        password TEXT NOT NULL,
        joined_at TEXT NOT NULL,
        annual_leave_balance REAL DEFAULT 0,
        leave_year INTEGER DEFAULT 2024,
        admin_id TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id TEXT PRIMARY KEY,
        crew_id TEXT NOT NULL,
        leave_type TEXT NOT NULL,
        date_start TEXT NOT NULL,
        date_end TEXT NOT NULL,
        reason TEXT,
        status TEXT DEFAULT 'pending',
        admin_note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        user_type TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('PostgreSQL database initialized');
  } finally {
    client.release();
  }
}

// Database client
const dbClient = {
  // Admin methods
  getAdminById: async (id) => {
    const result = await pool.query('SELECT * FROM admin_profiles WHERE id = $1', [id]);
    return result.rows[0];
  },
  
  getAdminByEmail: async (email) => {
    const result = await pool.query('SELECT * FROM admin_profiles WHERE email = $1', [email]);
    return result.rows[0];
  },
  
  createAdmin: async (admin) => {
    const hashed = await hashPassword(admin.password);
    await pool.query(
      'INSERT INTO admin_profiles (id, store_name, email, password, address, phone) VALUES ($1, $2, $3, $4, $5, $6)',
      [admin.id, admin.store_name, admin.email, hashed, admin.address || '', admin.phone || '']
    );
    return admin;
  },
  
  // Crew methods
  getCrewById: async (id) => {
    const result = await pool.query('SELECT * FROM crews WHERE id = $1', [id]);
    return result.rows[0];
  },
  
  getCrewByUsername: async (username) => {
    const result = await pool.query('SELECT * FROM crews WHERE username = $1', [username]);
    return result.rows[0];
  },
  
  getCrewsByAdmin: async (adminId) => {
    const result = await pool.query('SELECT * FROM crews WHERE admin_id = $1 ORDER BY created_at DESC', [adminId]);
    return result.rows;
  },
  
  createCrew: async (crew) => {
    const hashed = await hashPassword(crew.password);
    await pool.query(
      'INSERT INTO crews (id, name, username, phone, designation, password, joined_at, annual_leave_balance, leave_year, admin_id, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
      [crew.id, crew.name, crew.username, crew.phone || '', crew.designation, hashed, crew.joined_at, crew.annual_leave_balance || 0, crew.leave_year || 2024, crew.admin_id, crew.is_active !== false ? 1 : 0]
    );
    return crew;
  },
  
  updateCrew: async (id, updates) => {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    if (updates.name !== undefined) { fields.push(`name = $${paramCount++}`); values.push(updates.name); }
    if (updates.phone !== undefined) { fields.push(`phone = $${paramCount++}`); values.push(updates.phone); }
    if (updates.designation !== undefined) { fields.push(`designation = $${paramCount++}`); values.push(updates.designation); }
    if (updates.annual_leave_balance !== undefined) { fields.push(`annual_leave_balance = $${paramCount++}`); values.push(updates.annual_leave_balance); }
    if (updates.is_active !== undefined) { fields.push(`is_active = $${paramCount++}`); values.push(updates.is_active ? 1 : 0); }
    if (updates.password !== undefined) { 
      const hashed = await hashPassword(updates.password);
      fields.push(`password = $${paramCount++}`); 
      values.push(hashed); 
    }
    
    if (fields.length === 0) return;
    
    values.push(id);
    const sql = `UPDATE crews SET ${fields.join(', ')} WHERE id = $${paramCount}`;
    await pool.query(sql, values);
  },
  
  deleteCrew: async (id) => {
    await pool.query('DELETE FROM crews WHERE id = $1', [id]);
  },
  
  // Leave request methods
  getLeaveRequestsByAdmin: async (adminId) => {
    const result = await pool.query(
      `SELECT lr.*, c.name as crew_name, c.username as crew_username 
       FROM leave_requests lr 
       JOIN crews c ON lr.crew_id = c.id 
       WHERE c.admin_id = $1 
       ORDER BY lr.created_at DESC`,
      [adminId]
    );
    return result.rows;
  },
  
  getLeaveRequestsByCrew: async (crewId) => {
    const result = await pool.query(
      'SELECT * FROM leave_requests WHERE crew_id = $1 ORDER BY created_at DESC',
      [crewId]
    );
    return result.rows;
  },
  
  createLeaveRequest: async (request) => {
    await pool.query(
      'INSERT INTO leave_requests (id, crew_id, leave_type, date_start, date_end, reason, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [request.id, request.crew_id, request.leave_type, request.date_start, request.date_end, request.reason || '', request.status || 'pending']
    );
    return request;
  },
  
  updateLeaveRequest: async (id, updates) => {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    if (updates.status !== undefined) { fields.push(`status = $${paramCount++}`); values.push(updates.status); }
    if (updates.admin_note !== undefined) { fields.push(`admin_note = $${paramCount++}`); values.push(updates.admin_note); }
    
    if (fields.length === 0) return;
    
    values.push(id);
    const sql = `UPDATE leave_requests SET ${fields.join(', ')} WHERE id = $${paramCount}`;
    await pool.query(sql, values);
  },
  
  // Audit logging
  logAudit: async (userId, userType, action, details, ipAddress) => {
    await pool.query(
      'INSERT INTO audit_logs (user_id, user_type, action, details, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [userId, userType, action, details, ipAddress]
    );
  },
  
  getAuditLogs: async (limit = 100) => {
    const result = await pool.query(
      'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  },
  
  // Reports
  getAllAdmins: async () => {
    const result = await pool.query('SELECT * FROM admin_profiles ORDER BY created_at DESC');
    return result.rows;
  },
  
  getAllCrews: async () => {
    const result = await pool.query('SELECT * FROM crews ORDER BY created_at DESC');
    return result.rows;
  },
  
  getAllLeaveRequests: async () => {
    const result = await pool.query('SELECT * FROM leave_requests ORDER BY created_at DESC');
    return result.rows;
  },
  
  // Stats
  getDatabaseStats: async () => {
    const adminCount = await pool.query('SELECT COUNT(*) as count FROM admin_profiles');
    const crewCount = await pool.query('SELECT COUNT(*) as count FROM crews');
    const requestCount = await pool.query('SELECT COUNT(*) as count FROM leave_requests');
    return {
      admins: parseInt(adminCount.rows[0].count),
      crews: parseInt(crewCount.rows[0].count),
      leaveRequests: parseInt(requestCount.rows[0].count)
    };
  },
  
  // Init
  init: initDb,
  pool // Export pool for direct queries if needed
};

module.exports = { dbClient, hashPassword, verifyPassword };
