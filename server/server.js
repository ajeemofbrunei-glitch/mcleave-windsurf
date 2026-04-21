const express = require('express');
const cors = require('cors');
const path = require('path');
const { dbClient, verifyPassword, generateToken, verifyToken, validatePassword, sendEmailNotification, sendWhatsAppNotification } = require('./database');

// Rate limiting
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: { error: 'Too many login attempts, please try again later.' }
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(limiter);
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = process.env.DIST_PATH || path.join(__dirname, '../../dist');
  app.use(express.static(distPath));
  
  // Serve index.html at root
  app.get('/', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Root route - API info
app.get('/api', (req, res) => {
  res.json({ message: 'McLeave Backend API', version: '1.0.0', endpoints: { health: '/api/health', auth: '/api/auth', crews: '/api/crews', 'leave-requests': '/api/leave-requests', 'blocked-dates': '/api/blocked-dates', admin: '/api/admin', system: '/api/system' } });
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Auth endpoints
app.post('/api/auth/signin', authLimiter, async (req, res) => {
  const { email, password, type } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;

  try {
    if (type === 'admin') {
      const admin = dbClient.getAdminByEmail(email);
      if (!admin) {
        dbClient.logAudit(null, 'admin', 'LOGIN_FAILED', `Email: ${email}`, ipAddress);
        return res.status(401).json({ error: 'Admin not found' });
      }

      if (admin.is_active === false || admin.is_active === 0) {
        dbClient.logAudit(admin.id, 'admin', 'LOGIN_BLOCKED', 'Account deactivated', ipAddress);
        return res.status(403).json({ error: 'Account is deactivated. Please contact the administrator.' });
      }

      const isValid = await verifyPassword(password, admin.password);
      if (!isValid) {
        dbClient.logAudit(admin.id, 'admin', 'LOGIN_FAILED', `Email: ${email}`, ipAddress);
        return res.status(401).json({ error: 'Invalid password' });
      }

      dbClient.logAudit(admin.id, 'admin', 'LOGIN_SUCCESS', `Email: ${email}`, ipAddress);
      const token = generateToken(admin.id, admin.role || 'store_admin');
      res.json({ token, user: { id: admin.id, email: admin.email, role: admin.role || 'store_admin' } });
    } else {
      const crew = dbClient.getCrewByUsername(email);
      if (!crew) {
        dbClient.logAudit(null, 'crew', 'LOGIN_FAILED', `Username: ${email}`, ipAddress);
        return res.status(401).json({ error: 'Crew not found' });
      }

      const isValid = await verifyPassword(password, crew.password);
      if (!isValid) {
        dbClient.logAudit(crew.id, 'crew', 'LOGIN_FAILED', `Username: ${email}`, ipAddress);
        return res.status(401).json({ error: 'Invalid password' });
      }

      dbClient.logAudit(crew.id, 'crew', 'LOGIN_SUCCESS', `Username: ${email}`, ipAddress);
      const token = generateToken(crew.id, 'crew');
      res.json({ token, user: { id: crew.id, username: crew.username, role: 'crew' } });
    }
  } catch (error) {
    console.error('Sign in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  const { email, password, storeName, type } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;

  try {
    // Validate password complexity
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: 'Password does not meet requirements', details: passwordValidation.errors });
    }

    if (type === 'admin') {
      const id = `admin-${Date.now()}`;
      const admin = await dbClient.createAdmin({
        id,
        email,
        password,
        store_name: storeName,
        role: 'store_admin',
        plan: 'free',
        whatsapp_enabled: false,
        is_active: true,
      });

      dbClient.logAudit(id, 'admin', 'ADMIN_CREATED', `Email: ${email}, Store: ${storeName}`, ipAddress);
      const token = generateToken(admin.id, admin.role || 'store_admin');
      res.json({ token, user: { id: admin.id, email: admin.email, role: admin.role || 'store_admin' } });
    } else {
      // Crew signup would be handled through the admin panel
      res.status(400).json({ error: 'Crew signup not available through this endpoint' });
    }
  } catch (error) {
    console.error('Sign up error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoints
app.get('/api/admin/profiles', async (req, res) => {
  try {
    const admins = dbClient.getAllAdmins();
    res.json(admins);
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/admin/profiles/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await dbClient.updateAdmin(id, req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/reset-password', authenticateToken, async (req, res) => {
  try {
    const { userId, newPassword, currentPassword } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Get user info from token
    const user = req.user;

    // Verify current password for self-reset
    if (user.userId === userId) {
      const admin = dbClient.getAdminById(userId);
      if (!admin) {
        return res.status(404).json({ error: 'Admin not found' });
      }
      const isValid = await verifyPassword(currentPassword, admin.password);
      if (!isValid) {
        dbClient.logAudit(userId, 'admin', 'PASSWORD_RESET_FAILED', 'Invalid current password', ipAddress);
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    await dbClient.resetPassword(userId, newPassword);
    dbClient.logAudit(userId, 'admin', 'PASSWORD_RESET_SUCCESS', `Reset by ${user.userId === userId ? 'self' : 'admin'}`, ipAddress);
    res.json({ success: true });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(400).json({ error: error.message || 'Failed to reset password' });
  }
});

// Crew endpoints
app.get('/api/crews', async (req, res) => {
  try {
    const { adminId } = req.query;
    const crews = dbClient.getCrewsByAdmin(adminId);
    res.json(crews);
  } catch (error) {
    console.error('Error fetching crews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/crews', authenticateToken, async (req, res) => {
  try {
    const crew = await dbClient.createCrew(req.body);
    res.json(crew);
  } catch (error) {
    console.error('Error creating crew:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/crews/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await dbClient.updateCrew(id, req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating crew:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/crews/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    dbClient.deleteCrew(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting crew:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Leave request endpoints
app.get('/api/leave-requests', async (req, res) => {
  try {
    const { adminId, crewId } = req.query;
    let requests;
    if (adminId) {
      requests = dbClient.getLeaveRequestsByAdmin(adminId);
    } else if (crewId) {
      requests = dbClient.getLeaveRequestsByCrew(crewId);
    } else {
      requests = [];
    }
    res.json(requests);
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/leave-requests', authenticateToken, (req, res) => {
  try {
    const request = dbClient.createLeaveRequest(req.body);

    // Send email notification to admin
    const admin = dbClient.getAdminById(request.admin_id);
    if (admin) {
      const emailHtml = `
        <h2>New Leave Request</h2>
        <p>A new leave request has been submitted:</p>
        <ul>
          <li><strong>Crew:</strong> ${request.crew_name}</li>
          <li><strong>Leave Type:</strong> ${request.leave_type}</li>
          <li><strong>From:</strong> ${request.date_start}</li>
          <li><strong>To:</strong> ${request.date_end}</li>
          <li><strong>Reason:</strong> ${request.reason}</li>
        </ul>
        <p>Please log in to the McLeave system to review this request.</p>
      `;
      sendEmailNotification(admin.email, 'New Leave Request - McLeave', emailHtml);
    }

    res.json(request);
  } catch (error) {
    console.error('Error creating leave request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/leave-requests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Get the request before updating to send notification
    const requests = db.getLeaveRequestsByAdmin(updates.admin_id);
    const request = requests.find(r => r.id === id);

    await dbClient.updateLeaveRequest(id, req.body);

    // Send email notification to crew member
    if (request && updates.status && (updates.status === 'approved' || updates.status === 'denied')) {
      const crew = db.getCrewByUsername(request.crew_name);
      if (crew) {
        const statusText = updates.status === 'approved' ? 'Approved' : 'Denied';
        const emailHtml = `
          <h2>Leave Request ${statusText}</h2>
          <p>Your leave request has been ${statusText.toLowerCase()}:</p>
          <ul>
            <li><strong>Leave Type:</strong> ${request.leave_type}</li>
            <li><strong>From:</strong> ${request.date_start}</li>
            <li><strong>To:</strong> ${request.date_end}</li>
            <li><strong>Admin Note:</strong> ${updates.admin_note || 'No note provided'}</li>
          </ul>
          <p>Thank you for using the McLeave system.</p>
        `;
        sendEmailNotification(crew.email, `Leave Request ${statusText} - McLeave`, emailHtml);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating leave request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/leave-requests/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    dbClient.deleteLeaveRequest(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting leave request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Blocked dates endpoints
app.get('/api/blocked-dates', authenticateToken, (req, res) => {
  try {
    const { adminId } = req.query;
    const blockedDates = dbClient.getBlockedDatesByAdmin(adminId);
    res.json(blockedDates);
  } catch (error) {
    console.error('Error fetching blocked dates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/blocked-dates', authenticateToken, (req, res) => {
  try {
    const blockedDate = dbClient.createBlockedDate(req.body);
    res.json(blockedDate);
  } catch (error) {
    console.error('Error creating blocked date:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/blocked-dates', authenticateToken, (req, res) => {
  try {
    const { date, adminId } = req.query;
    dbClient.deleteBlockedDate(date, adminId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting blocked date:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// System settings endpoints
app.get('/api/system/maintenance-mode', (req, res) => {
  try {
    const maintenanceMode = dbClient.getMaintenanceMode();
    res.json({ maintenanceMode });
  } catch (error) {
    console.error('Error fetching maintenance mode:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/system/maintenance-mode', (req, res) => {
  try {
    const { enabled } = req.body;
    dbClient.setMaintenanceMode(enabled);
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting maintenance mode:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Per-store maintenance mode endpoints
app.get('/api/admin/:id/maintenance-mode', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const admin = dbClient.getAdminById(id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    res.json({ maintenanceMode: admin.maintenance_mode === 1 || admin.maintenance_mode === true });
  } catch (error) {
    console.error('Error fetching store maintenance mode:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/admin/:id/maintenance-mode', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    dbClient.updateAdmin(id, { maintenance_mode: enabled ? 1 : 0 });
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting store maintenance mode:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// System reports endpoint
app.get('/api/reports', authenticateToken, (req, res) => {
  try {
    console.log('Generating reports...');
    const admins = dbClient.getAllAdmins();
    console.log('Admins:', admins.length);

    const crews = db.prepare('SELECT * FROM crews').all();
    console.log('Crews:', crews.length);

    const leaveRequests = db.prepare('SELECT * FROM leave_requests').all();
    console.log('Leave requests:', leaveRequests.length);

    const totalAdmins = admins.length;
    const totalCrews = crews.length;
    const totalRequests = leaveRequests.length;

    const pendingRequests = leaveRequests.filter(r => r.status === 'pending').length;
    const approvedRequests = leaveRequests.filter(r => r.status === 'approved').length;
    const deniedRequests = leaveRequests.filter(r => r.status === 'denied').length;

    const requestsByStore = admins.map(admin => {
      const storeRequests = leaveRequests.filter(r => r.admin_id === admin.id);
      return {
        store: admin.store_name,
        location: admin.store_location,
        total: storeRequests.length,
        pending: storeRequests.filter(r => r.status === 'pending').length,
        approved: storeRequests.filter(r => r.status === 'approved').length,
        denied: storeRequests.filter(r => r.status === 'denied').length
      };
    });

    const crewByStore = admins.map(admin => {
      const storeCrews = crews.filter(c => c.admin_id === admin.id);
      return {
        store: admin.store_name,
        location: admin.store_location,
        totalCrews: storeCrews.length,
        activeCrews: storeCrews.filter(c => c.is_active === 1).length
      };
    });

    console.log('Report generated successfully');
    res.json({
      summary: {
        totalAdmins,
        totalCrews,
        totalRequests,
        pendingRequests,
        approvedRequests,
        deniedRequests
      },
      requestsByStore,
      crewByStore,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Initialize default admin account
async function initDefaultAdmin() {
  try {
    const existingAdmin = dbClient.getAdminByEmail('admin@test.com');
    if (!existingAdmin) {
      await dbClient.createAdmin({
        id: 'admin-default-001',
        email: 'admin@test.com',
        password: 'admin123',
        store_name: 'Test Store',
        store_location: 'Test Location',
        role: 'store_admin',
        plan: 'free',
        whatsapp_enabled: false,
        is_active: true,
      });
      console.log('✅ Default admin account created:');
      console.log('   Email: admin@test.com');
      console.log('   Password: admin123');
    } else {
      console.log('ℹ️  Default admin account already exists');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
}

// SPA fallback route (must be last)
if (process.env.NODE_ENV === 'production') {
  const distPath = process.env.DIST_PATH || path.join(__dirname, '../../dist');
  app.get(/.*/, (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  initDefaultAdmin();
});
