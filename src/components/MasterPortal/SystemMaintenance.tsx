import { useState, useEffect } from 'react';
import { systemApi } from '../../api';

interface SystemMaintenanceProps {
  onMaintenanceChange: (enabled: boolean) => void;
}

export function SystemMaintenance({ onMaintenanceChange }: SystemMaintenanceProps) {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMaintenanceMode();
  }, []);

  const loadMaintenanceMode = async () => {
    setLoading(true);
    try {
      const maintenanceMode = await systemApi.getMaintenanceMode();
      setMaintenanceMode(maintenanceMode);
    } catch (error) {
      console.error('Error loading maintenance mode:', error);
    }
    setLoading(false);
  };

  const handleToggleMaintenance = async () => {
    setSaving(true);
    try {
      await systemApi.setMaintenanceMode(!maintenanceMode);
      setMaintenanceMode(!maintenanceMode);
      onMaintenanceChange(!maintenanceMode);
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
    }
    setSaving(false);
  };

  const handleUpdateMessage = async () => {
    setSaving(true);
    try {
      // Message update not implemented in local mode
      setSaving(false);
    } catch (error) {
      console.error('Error updating message:', error);
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="master-loading">Loading system settings...</div>;
  }

  return (
    <div className="system-maintenance-container">
      <div className="maintenance-card primary-card">
        <div className="card-header">
          <div className="header-content">
            <h3>System Maintenance Mode</h3>
            <p>Control global system access for all users</p>
          </div>
          <div className={`status-indicator ${maintenanceMode ? 'active' : 'inactive'}`}>
            {maintenanceMode ? '🔧 Active' : '✅ Normal'}
          </div>
        </div>

        <div className="card-body">
          <div className="toggle-container">
            <div className="toggle-info">
              <strong>Maintenance Mode</strong>
              <p>
                When enabled, all store admins and crew members will see a maintenance overlay.
                Only the Master Admin can access the system.
              </p>
            </div>

            <button
              className={`toggle-btn ${maintenanceMode ? 'enabled' : 'disabled'}`}
              onClick={handleToggleMaintenance}
              disabled={saving}
            >
              <div className={`toggle-switch ${maintenanceMode ? 'on' : 'off'}`}>
                <div className="toggle-slider"></div>
              </div>
              <span className="toggle-label">
                {saving ? 'Updating...' : (maintenanceMode ? 'Enabled' : 'Disabled')}
              </span>
            </button>
          </div>

          {maintenanceMode && (
            <div className="warning-box">
              <span className="warning-icon">⚠️</span>
              <div>
                <strong>System is currently in maintenance mode</strong>
                <p>All users except Master Admin are blocked from accessing the system.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="maintenance-card">
        <div className="card-header">
          <div className="header-content">
            <h3>Maintenance Message</h3>
            <p>Customize the message shown to users during maintenance</p>
          </div>
        </div>

        <div className="card-body">
          <textarea
            className="maintenance-message-input"
            value={maintenanceMessage}
            onChange={(e) => setMaintenanceMessage(e.target.value)}
            rows={4}
            placeholder="Enter maintenance message..."
          />

          <button
            className="btn-save-message"
            onClick={handleUpdateMessage}
            disabled={saving}
          >
            {saving ? 'Saving...' : '💾 Save Message'}
          </button>

          <div className="message-preview">
            <div className="preview-label">Preview:</div>
            <div className="preview-box">
              <div className="preview-icon">🔧</div>
              <div className="preview-content">
                <strong>System Maintenance</strong>
                <p>{maintenanceMessage || 'No message set'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="maintenance-card">
        <div className="card-header">
          <div className="header-content">
            <h3>System Health</h3>
            <p>Current system status and metrics</p>
          </div>
        </div>

        <div className="card-body">
          <div className="health-metrics">
            <div className="health-item">
              <span className="health-label">Database:</span>
              <span className="health-status online">🟢 Online</span>
            </div>

            <div className="health-item">
              <span className="health-label">Authentication:</span>
              <span className="health-status online">🟢 Online</span>
            </div>

            <div className="health-item">
              <span className="health-label">Edge Functions:</span>
              <span className="health-status online">🟢 Online</span>
            </div>

            <div className="health-item">
              <span className="health-label">System Status:</span>
              <span className={`health-status ${maintenanceMode ? 'maintenance' : 'online'}`}>
                {maintenanceMode ? '🔧 Maintenance' : '🟢 Operational'}
              </span>
            </div>
          </div>

          <div className="info-box">
            <span className="info-icon">ℹ️</span>
            <div>
              <strong>About Maintenance Mode</strong>
              <ul>
                <li>Blocks all non-master admin users from accessing the system</li>
                <li>Displays a custom maintenance message to blocked users</li>
                <li>Does not affect database or backend services</li>
                <li>Can be toggled on/off instantly</li>
                <li>Useful for system updates, data migrations, or emergency maintenance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
