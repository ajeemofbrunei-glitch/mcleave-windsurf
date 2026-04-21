import { useState, useEffect } from 'react';
import { systemApi } from '../api';
import { GodViewRequests } from './MasterPortal/GodViewRequests';
import { UserManagement } from './MasterPortal/UserManagement';
import { ExecutiveAnalytics } from './MasterPortal/ExecutiveAnalytics';
import { SystemMaintenance } from './MasterPortal/SystemMaintenance';
import '../masterportal.css';

type View = 'overview' | 'requests' | 'users' | 'maintenance';

interface MasterDashboardProps {
  onSignOut: () => void;
}

export function MasterDashboard({ onSignOut }: MasterDashboardProps) {
  const [currentView, setCurrentView] = useState<View>('overview');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    loadMaintenanceStatus();
  }, []);

  const loadMaintenanceStatus = async () => {
    try {
      const maintenanceMode = await systemApi.getMaintenanceMode();
      setMaintenanceMode(maintenanceMode);
    } catch (error) {
      console.error('Error loading maintenance status:', error);
    }
  };

  return (
    <div className="master-portal">
      <aside className="master-sidebar">
        <div className="master-logo">
          <div className="master-logo-icon">M</div>
          <div className="master-logo-text">
            <div className="master-logo-title">Master Portal</div>
            <div className="master-logo-subtitle">System Control</div>
          </div>
        </div>

        <nav className="master-nav">
          <button
            className={`master-nav-item ${currentView === 'overview' ? 'active' : ''}`}
            onClick={() => setCurrentView('overview')}
          >
            <span className="master-nav-icon">📊</span>
            <span className="master-nav-label">Overview</span>
          </button>

          <button
            className={`master-nav-item ${currentView === 'requests' ? 'active' : ''}`}
            onClick={() => setCurrentView('requests')}
          >
            <span className="master-nav-icon">🌐</span>
            <span className="master-nav-label">God View</span>
          </button>

          <button
            className={`master-nav-item ${currentView === 'users' ? 'active' : ''}`}
            onClick={() => setCurrentView('users')}
          >
            <span className="master-nav-icon">👥</span>
            <span className="master-nav-label">User Management</span>
          </button>

          <button
            className={`master-nav-item ${currentView === 'maintenance' ? 'active' : ''}`}
            onClick={() => setCurrentView('maintenance')}
          >
            <span className="master-nav-icon">⚙️</span>
            <span className="master-nav-label">System Health</span>
          </button>
        </nav>
      </aside>

      <main className="master-content">
        <header className="master-header">
          <h1 className="master-page-title">
            {currentView === 'overview' && 'Executive Analytics'}
            {currentView === 'requests' && 'Global Request Monitor'}
            {currentView === 'users' && 'User Management Console'}
            {currentView === 'maintenance' && 'System Health & Maintenance'}
          </h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {maintenanceMode && (
              <div className="master-maintenance-badge">
                🔧 Maintenance Mode Active
              </div>
            )}
            <button className="master-signout-btn" onClick={onSignOut}>
              <span>🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        <div className="master-body">
          {currentView === 'overview' && <ExecutiveAnalytics />}
          {currentView === 'requests' && <GodViewRequests />}
          {currentView === 'users' && <UserManagement />}
          {currentView === 'maintenance' && <SystemMaintenance onMaintenanceChange={setMaintenanceMode} />}
        </div>
      </main>
    </div>
  );
}
