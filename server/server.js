const express = require('express');
const cors = require('cors');
const path = require('path');
const { dbClient, verifyPassword, generateToken, verifyToken } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
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
app.post('/api/auth/signin', async (req, res) => {
  const { email, password, type } = req.body;

  try {
    if (type === 'admin') {
      const admin = dbClient.getAdminByEmail(email);
      if (!admin) {
        return res.status(401).json({ error: 'Admin not found' });
      }

      const isValid = await verifyPassword(password, admin.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      const token = generateToken(admin.id, admin.role || 'store_admin');
      res.json({ token, user: { id: admin.id, email: admin.email, role: admin.role || 'store_admin' } });
    } else {
      const crew = dbClient.getCrewByUsername(email);
      if (!crew) {
        return res.status(401).json({ error: 'Crew not found' });
      }

      const isValid = await verifyPassword(password, crew.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid password' });
      }

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

  try {
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
    res.json(request);
  } catch (error) {
    console.error('Error creating leave request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/leave-requests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await dbClient.updateLeaveRequest(id, req.body);
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
