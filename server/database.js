const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, 'mcleave.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS leave_requests (
    id TEXT PRIMARY KEY,
    crew_id TEXT NOT NULL,
    crew_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    designation TEXT NOT NULL,
    leave_type TEXT NOT NULL,
    date_start TEXT NOT NULL,
    date_end TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    submitted_at TEXT NOT NULL,
    responded_at TEXT,
    admin_note TEXT DEFAULT '',
    admin_id TEXT,
    year INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS blocked_dates (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    admin_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, admin_id)
  );

  CREATE TABLE IF NOT EXISTS admin_profiles (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    store_name TEXT NOT NULL,
    store_location TEXT,
    role TEXT DEFAULT 'store_admin',
    plan TEXT DEFAULT 'free',
    whatsapp_enabled INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    maintenance_mode INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    maintenance_mode INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    user_type TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Add maintenance_mode column to admin_profiles if it doesn't exist
try {
  const columns = db.prepare("PRAGMA table_info(admin_profiles)").all();
  const hasMaintenanceMode = columns.some(col => col.name === 'maintenance_mode');
  if (!hasMaintenanceMode) {
    db.exec('ALTER TABLE admin_profiles ADD COLUMN maintenance_mode INTEGER DEFAULT 0');
  }
} catch (error) {
  console.error('Error adding maintenance_mode column:', error);
}

// Insert default system settings
const settings = db.prepare('SELECT * FROM system_settings WHERE id = 1').get();
if (!settings) {
  db.prepare('INSERT INTO system_settings (id, maintenance_mode) VALUES (1, 0)').run();
}

// Create indexes
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_leave_requests_crew_id ON leave_requests(crew_id);
  CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
  CREATE INDEX IF NOT EXISTS idx_leave_requests_admin_id ON leave_requests(admin_id);
  CREATE INDEX IF NOT EXISTS idx_blocked_dates_date ON blocked_dates(date);
  CREATE INDEX IF NOT EXISTS idx_blocked_dates_admin_id ON blocked_dates(admin_id);
  CREATE INDEX IF NOT EXISTS idx_crews_admin_id ON crews(admin_id);
`);

// JWT Secret - use environment variable in production
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Auth functions
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

function validatePassword(password) {
  const errors = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// Email configuration
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

async function sendEmailNotification(to, subject, html) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('Email not configured - skipping notification');
    return;
  }

  try {
    await emailTransporter.sendMail({
      from: process.env.SMTP_FROM || 'McLeave System <noreply@mcleave.com>',
      to,
      subject,
      html
    });
    console.log('Email sent successfully to:', to);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

async function sendWhatsAppNotification(phoneNumber, message) {
  if (!process.env.WHATSAPP_API_KEY || !process.env.WHATSAPI_API_URL) {
    console.log('WhatsApp not configured - skipping notification');
    return;
  }

  try {
    // Format phone number (remove any non-numeric characters and add country code if needed)
    const formattedPhone = phoneNumber.replace(/[^0-9]/g, '');
    
    // Call WhatsApp API (placeholder - would need actual API integration)
    // Example with a service like Twilio or WhatsApp Business API
    const response = await fetch(process.env.WHATSAPI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`
      },
      body: JSON.stringify({
        phone: formattedPhone,
        message: message
      })
    });

    if (response.ok) {
      console.log('WhatsApp sent successfully to:', formattedPhone);
    } else {
      console.error('WhatsApp API error:', response.statusText);
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
}

function generateToken(userId, role) {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Database functions
const dbClient = {
  // Admin functions
  getAdminByEmail: (email) => {
    const stmt = db.prepare('SELECT * FROM admin_profiles WHERE email = ? AND is_active = 1');
    return stmt.get(email);
  },

  createAdmin: async (admin) => {
    const hashedPassword = await hashPassword(admin.password);
    const stmt = db.prepare(`
      INSERT INTO admin_profiles (id, email, password, store_name, store_location, role, plan, whatsapp_enabled, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
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
    return { ...admin, password: hashedPassword };
  },

  updateAdmin: async (id, updates) => {
    const fields = [];
    const values = [];

    if (updates.store_name !== undefined) { fields.push('store_name = ?'); values.push(updates.store_name); }
    if (updates.store_location !== undefined) { fields.push('store_location = ?'); values.push(updates.store_location); }
    if (updates.plan !== undefined) { fields.push('plan = ?'); values.push(updates.plan); }
    if (updates.whatsapp_enabled !== undefined) { fields.push('whatsapp_enabled = ?'); values.push(updates.whatsapp_enabled ? 1 : 0); }
    if (updates.maintenance_mode !== undefined) { fields.push('maintenance_mode = ?'); values.push(updates.maintenance_mode ? 1 : 0); }
    if (updates.is_active !== undefined) { fields.push('is_active = ?'); values.push(updates.is_active ? 1 : 0); }
    if (updates.password !== undefined) {
      const hashed = await hashPassword(updates.password);
      fields.push('password = ?'); values.push(hashed);
    }

    if (fields.length === 0) return;

    values.push(id);
    const stmt = db.prepare(`UPDATE admin_profiles SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  },

  resetPassword: async (id, newPassword) => {
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    const hashed = await hashPassword(newPassword);
    const stmt = db.prepare('UPDATE admin_profiles SET password = ? WHERE id = ?');
    stmt.run(hashed, id);
  },

  getAllAdmins: () => {
    const stmt = db.prepare('SELECT id, email, store_name, store_location, role, plan, whatsapp_enabled, is_active, maintenance_mode, created_at FROM admin_profiles ORDER BY created_at DESC');
    return stmt.all();
  },

  getAdminById: (id) => {
    const stmt = db.prepare('SELECT * FROM admin_profiles WHERE id = ?');
    return stmt.get(id);
  },

  // Crew functions
  getCrewByUsername: (username) => {
    const stmt = db.prepare('SELECT * FROM crews WHERE username = ?');
    return stmt.get(username);
  },

  createCrew: async (crew) => {
    const hashedPassword = await hashPassword(crew.password);
    const stmt = db.prepare(`
      INSERT INTO crews (id, name, username, phone, designation, password, joined_at, annual_leave_balance, leave_year, admin_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      crew.id,
      crew.name,
      crew.username,
      crew.phone,
      crew.designation,
      hashedPassword,
      crew.joined_at,
      crew.annual_leave_balance || 0,
      crew.leave_year || 2024,
      crew.admin_id || null
    );
    return { ...crew, password: hashedPassword };
  },

  getCrewsByAdmin: (adminId) => {
    const stmt = db.prepare('SELECT * FROM crews WHERE admin_id = ? ORDER BY created_at DESC');
    return stmt.all(adminId);
  },

  updateCrew: async (id, updates) => {
    const fields = [];
    const values = [];
    
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.phone !== undefined) { fields.push('phone = ?'); values.push(updates.phone); }
    if (updates.designation !== undefined) { fields.push('designation = ?'); values.push(updates.designation); }
    if (updates.annual_leave_balance !== undefined) { fields.push('annual_leave_balance = ?'); values.push(updates.annual_leave_balance); }
    if (updates.is_active !== undefined) { fields.push('is_active = ?'); values.push(updates.is_active ? 1 : 0); }
    if (updates.password !== undefined) { 
      const hashed = await hashPassword(updates.password);
      fields.push('password = ?'); values.push(hashed); 
    }
    
    if (fields.length === 0) return;
    
    values.push(id);
    const stmt = db.prepare(`UPDATE crews SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  },

  deleteCrew: (id) => {
    const stmt = db.prepare('DELETE FROM crews WHERE id = ?');
    stmt.run(id);
  },

  // Leave request functions
  getLeaveRequestsByAdmin: (adminId) => {
    const stmt = db.prepare('SELECT * FROM leave_requests WHERE admin_id = ? ORDER BY created_at DESC');
    return stmt.all(adminId);
  },

  getLeaveRequestsByCrew: (crewId) => {
    const stmt = db.prepare('SELECT * FROM leave_requests WHERE crew_id = ? ORDER BY created_at DESC');
    return stmt.all(crewId);
  },

  createLeaveRequest: (request) => {
    const stmt = db.prepare(`
      INSERT INTO leave_requests (id, crew_id, crew_name, phone, designation, leave_type, date_start, date_end, reason, status, submitted_at, responded_at, admin_note, admin_id, year)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      request.id,
      request.crew_id,
      request.crew_name,
      request.phone,
      request.designation,
      request.leave_type,
      request.date_start,
      request.date_end,
      request.reason,
      request.status,
      request.submitted_at,
      request.responded_at || null,
      request.admin_note,
      request.admin_id || null,
      request.year || null
    );
    return request;
  },

  updateLeaveRequest: (id, updates) => {
    const fields = [];
    const values = [];
    
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.responded_at !== undefined) { fields.push('responded_at = ?'); values.push(updates.responded_at); }
    if (updates.admin_note !== undefined) { fields.push('admin_note = ?'); values.push(updates.admin_note); }
    
    if (fields.length === 0) return;
    
    values.push(id);
    const stmt = db.prepare(`UPDATE leave_requests SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  },

  deleteLeaveRequest: (id) => {
    const stmt = db.prepare('DELETE FROM leave_requests WHERE id = ?');
    stmt.run(id);
  },

  // Blocked dates functions
  getBlockedDatesByAdmin: (adminId) => {
    const stmt = db.prepare('SELECT * FROM blocked_dates WHERE admin_id = ? ORDER BY date');
    return stmt.all(adminId);
  },

  createBlockedDate: (blockedDate) => {
    const stmt = db.prepare('INSERT OR IGNORE INTO blocked_dates (id, date, admin_id) VALUES (?, ?, ?)');
    stmt.run(blockedDate.id, blockedDate.date, blockedDate.admin_id);
    return blockedDate;
  },

  deleteBlockedDate: (date, adminId) => {
    const stmt = db.prepare('DELETE FROM blocked_dates WHERE date = ? AND admin_id = ?');
    stmt.run(date, adminId);
  },

  // System settings
  getMaintenanceMode: () => {
    const stmt = db.prepare('SELECT maintenance_mode FROM system_settings WHERE id = 1');
    const result = stmt.get();
    return result ? result.maintenance_mode === 1 : false;
  },

  setMaintenanceMode: (enabled) => {
    const stmt = db.prepare('UPDATE system_settings SET maintenance_mode = ? WHERE id = 1');
    stmt.run(enabled ? 1 : 0);
  },

  logAudit: (userId, userType, action, details, ipAddress) => {
    const stmt = db.prepare('INSERT INTO audit_logs (user_id, user_type, action, details, ip_address) VALUES (?, ?, ?, ?, ?)');
    stmt.run(userId, userType, action, details, ipAddress);
  },

  getAuditLogs: (limit = 100) => {
    const stmt = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?');
    return stmt.all(limit);
  },

  // Get all admins (for master admin)
  getAllAdmins: () => {
    const stmt = db.prepare('SELECT * FROM admin_profiles ORDER BY created_at DESC');
    return stmt.all();
  },
};

module.exports = { dbClient, verifyPassword, generateToken, verifyToken, validatePassword, resetPassword, sendEmailNotification, sendWhatsAppNotification };
