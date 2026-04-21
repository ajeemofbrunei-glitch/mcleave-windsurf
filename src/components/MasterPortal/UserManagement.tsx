import { useState, useEffect } from 'react';
import { adminApi, crewApi } from '../../api';

interface AdminProfile {
  id: string;
  email: string;
  store_name: string;
  store_location?: string;
  role?: string;
  is_active?: boolean;
  created_at?: string;
  plan?: string;
}

interface CrewMember {
  id: string;
  email: string;
  name: string;
  username: string;
  phone: string;
  admin_id: string;
  is_active: boolean;
  created_at: string;
}

const STORES = ['GADONG', 'JPDT', 'LDT', 'AIRPORTMALL', 'STDT', 'KUALA BELAIT', 'SERIA'];

export function UserManagement() {
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [adminStoreMap, setAdminStoreMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<{ type: 'admin' | 'crew'; user: AdminProfile | CrewMember } | null>(null);
  const [newStoreLocation, setNewStoreLocation] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'admin' | 'crew'>('all');
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminStore, setNewAdminStore] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);

    try {
      const admins = await adminApi.getAllAdmins();
      setAdmins(admins);
      
      const map = new Map<string, string>();
      admins.forEach(admin => {
        map.set(admin.id, admin.store_location || 'Unknown');
      });
      setAdminStoreMap(map);

      // Load crew members for all admins
      const allCrew: any[] = [];
      for (const admin of admins) {
        const crews = await crewApi.getCrewsByAdmin(admin.id);
        allCrew.push(...crews.map(c => ({ ...c, store_location: admin.store_location })));
      }
      setCrew(allCrew);
    } catch (error) {
      console.error('Error loading users:', error);
    }

    setLoading(false);
  };

  const handleUpdateAdminStore = async (adminId: string) => {
    try {
      await adminApi.updateAdmin(adminId, {
        store_location: newStoreLocation,
        store_name: newStoreLocation
      });
      loadUsers();
      setEditingUser(null);
      setNewStoreLocation('');
    } catch (error) {
      console.error('Error updating admin store:', error);
    }
  };

  const handleUpdateCrewStore = async (_crewId: string) => {
    setToast('Crew store update not available in local mode');
  };

  const handleResetPassword = async (_email: string) => {
    setToast('Password reset not available in local mode');
  };

  const handleToggleAdminStatus = async (adminId: string, currentStatus: boolean) => {
    try {
      await adminApi.updateAdmin(adminId, { is_active: !currentStatus });
      loadUsers();
    } catch (error) {
      console.error('Error toggling admin status:', error);
    }
  };

  const handleToggleCrewStatus = async (crewId: string, currentStatus: boolean) => {
    try {
      await crewApi.updateCrew(crewId, { is_active: !currentStatus });
      loadUsers();
    } catch (error) {
      console.error('Error toggling crew status:', error);
      setToast('Failed to update crew status');
    }
  };

  const _handleDeleteUser = async (type: 'admin' | 'crew', _userId: string) => {
    if (confirm(`Are you sure you want to delete this ${type}?`)) {
      setToast('Delete not available in local mode');
    }
  };

  const handleDeleteAdmin = async (_adminId: string, email: string) => {
    if (!confirm(`Are you sure you want to permanently delete the admin account for ${email}? This action cannot be undone.`)) {
      return;
    }

    setToast('Delete not available in local mode');
  };

  const handleDeleteCrew = async (_crewId: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete the crew account for ${name}? This action cannot be undone.`)) {
      return;
    }

    setToast('Delete not available in local mode');
  };

  const handleUpdatePlan = async (adminId: string, newPlan: string) => {
    try {
      await adminApi.updateAdmin(adminId, { plan: newPlan as 'free' | 'pro' });
      setToast(`Plan updated to ${newPlan === 'pro' ? 'Pro' : 'Free'}`);
      setTimeout(() => setToast(null), 3000);
      loadUsers();
    } catch (error: any) {
      alert('Failed to update plan: ' + error.message);
    }
  };

  const handleCreateAdmin = async () => {
    if (!newAdminEmail || !newAdminPassword || !newAdminStore) {
      setCreateError('Please fill in all fields');
      return;
    }

    setCreating(true);

    try {
      const adminId = `admin-${Date.now()}`;
      await adminApi.createAdmin({
        id: adminId,
        email: newAdminEmail,
        password: newAdminPassword,
        store_name: newAdminStore,
        store_location: newAdminStore,
        role: 'store_admin',
        plan: 'free',
        whatsapp_enabled: false,
        is_active: true
      });

      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminStore('');
      setShowCreateAdmin(false);
      setCreateError('');
      loadUsers();
    } catch (error: any) {
      setCreateError(error.message || 'Failed to create admin');
    }

    setCreating(false);
  };

  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          admin.store_location?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredCrew = crew.filter(member => {
    const matchesSearch = member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          member.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return <div className="master-loading">Loading users...</div>;
  }

  return (
    <div className="user-management-container">
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#10b981',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10000,
          fontWeight: 600,
          fontSize: '14px'
        }}>
          ✅ {toast}
        </div>
      )}
      <div className="user-stats">
        <div className="stat-card">
          <div className="stat-value">{admins.length}</div>
          <div className="stat-label">Store Admins</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{crew.length}</div>
          <div className="stat-label">Total Crew</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{crew.filter(c => c.is_active).length}</div>
          <div className="stat-label">Active Crew</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{STORES.length}</div>
          <div className="stat-label">Store Locations</div>
        </div>
      </div>

      <div className="user-controls">
        <input
          type="text"
          className="search-input"
          placeholder="Search by email or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="filter-tabs">
          <button
            className={filterType === 'all' ? 'active' : ''}
            onClick={() => setFilterType('all')}
          >
            All Users
          </button>
          <button
            className={filterType === 'admin' ? 'active' : ''}
            onClick={() => setFilterType('admin')}
          >
            Admins Only
          </button>
          <button
            className={filterType === 'crew' ? 'active' : ''}
            onClick={() => setFilterType('crew')}
          >
            Crew Only
          </button>
        </div>

        <button
          className="btn-create-admin"
          onClick={() => setShowCreateAdmin(true)}
        >
          ➕ Create Store Admin
        </button>

        <button className="refresh-btn" onClick={loadUsers}>
          🔄 Refresh
        </button>
      </div>

      {(filterType === 'all' || filterType === 'admin') && (
        <div className="user-section">
          <h3>Store Administrators</h3>
          <table className="user-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Store Location</th>
                <th>Role</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmins.map(admin => (
                <tr key={admin.id} className={!admin.is_active ? 'inactive-row' : ''}>
                  <td>{admin.email}</td>
                  <td>
                    <span className="store-badge">{admin.store_location || admin.store_name}</span>
                  </td>
                  <td>
                    <span className={`role-badge ${admin.role}`}>
                      {admin.role === 'master_admin' ? '👑 Master' : '🏪 Store Admin'}
                    </span>
                  </td>
                  <td>
                    {admin.role !== 'master_admin' ? (
                      <select
                        value={admin.plan || 'free'}
                        onChange={(e) => handleUpdatePlan(admin.id, e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          background: admin.plan === 'pro' ? '#fef3c7' : '#f3f4f6',
                          color: admin.plan === 'pro' ? '#92400e' : '#6b7280',
                          fontWeight: 600,
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="free">Free</option>
                        <option value="pro">👑 Pro</option>
                      </select>
                    ) : (
                      <span style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: '#fef3c7',
                        color: '#92400e',
                        fontWeight: 600,
                        fontSize: '12px'
                      }}>
                        👑 Pro
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${admin.is_active !== false ? 'active' : 'inactive'}`}>
                      {admin.is_active !== false ? '✅ Active' : '⛔ Inactive'}
                    </span>
                  </td>
                  <td>{admin.created_at ? new Date(admin.created_at).toLocaleDateString() : 'N/A'}</td>
                  <td className="action-buttons">
                    {admin.role !== 'master_admin' && (
                      <>
                        <button
                          className="btn-edit"
                          onClick={() => {
                            setEditingUser({ type: 'admin', user: admin });
                            setNewStoreLocation(admin.store_location || admin.store_name);
                          }}
                        >
                          Edit Store
                        </button>
                        <button
                          className={admin.is_active !== false ? 'btn-deactivate' : 'btn-activate'}
                          onClick={() => handleToggleAdminStatus(admin.id, admin.is_active ?? true)}
                        >
                          {admin.is_active !== false ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className="btn-reset"
                          onClick={() => handleResetPassword(admin.email)}
                        >
                          Reset Password
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                        >
                          Delete Account
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(filterType === 'all' || filterType === 'crew') && (
        <div className="user-section">
          <h3>Crew Members</h3>
          <table className="user-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Store</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCrew.map(member => (
                <tr key={member.id} className={!member.is_active ? 'inactive-row' : ''}>
                  <td>{member.name}</td>
                  <td>{member.email}</td>
                  <td>{member.phone || '—'}</td>
                  <td>
                    <span className="store-badge">{adminStoreMap.get(member.admin_id) || 'Unknown'}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${member.is_active ? 'active' : 'inactive'}`}>
                      {member.is_active ? '✅ Active' : '⛔ Inactive'}
                    </span>
                  </td>
                  <td>{new Date(member.created_at).toLocaleDateString()}</td>
                  <td className="action-buttons">
                    <button
                      className="btn-edit"
                      onClick={() => {
                        setEditingUser({ type: 'crew', user: member });
                        setNewStoreLocation(adminStoreMap.get(member.admin_id) || '');
                      }}
                    >
                      Reassign Store
                    </button>
                    <button
                      className={member.is_active ? 'btn-deactivate' : 'btn-activate'}
                      onClick={() => handleToggleCrewStatus(member.id, member.is_active)}
                    >
                      {member.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      className="btn-reset"
                      onClick={() => handleResetPassword(member.email)}
                    >
                      Reset Password
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteCrew(member.id, member.name)}
                    >
                      Delete Account
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {editingUser.type === 'admin' ? 'Update Store Location' : 'Reassign Crew Member'}
              </h3>
              <button className="modal-close" onClick={() => setEditingUser(null)}>×</button>
            </div>

            <div className="modal-body">
              <div className="detail-row">
                <label className="detail-label">
                  {editingUser.type === 'admin' ? 'Current Store:' : 'Current Store:'}
                </label>
                <span className="detail-value">
                  {editingUser.type === 'admin'
                    ? (editingUser.user as AdminProfile).store_location
                    : adminStoreMap.get((editingUser.user as CrewMember).admin_id)}
                </span>
              </div>

              <div className="detail-row">
                <label className="detail-label">New Store Location:</label>
                <select
                  className="store-select"
                  value={newStoreLocation}
                  onChange={(e) => setNewStoreLocation(e.target.value)}
                >
                  <option value="">Select Store...</option>
                  {STORES.map(store => (
                    <option key={store} value={store}>{store}</option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button
                  className="btn-save"
                  onClick={() => {
                    if (editingUser.type === 'admin') {
                      handleUpdateAdminStore(editingUser.user.id);
                    } else {
                      handleUpdateCrewStore(editingUser.user.id);
                    }
                  }}
                  disabled={!newStoreLocation}
                >
                  💾 Save Changes
                </button>
                <button className="btn-cancel" onClick={() => setEditingUser(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateAdmin && (
        <div className="modal-overlay" onClick={() => setShowCreateAdmin(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Store Admin Account</h3>
              <button className="modal-close" onClick={() => setShowCreateAdmin(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="detail-row">
                <label className="detail-label">Email Address</label>
                <input
                  type="email"
                  className="admin-note-input"
                  placeholder="admin@store.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                />
              </div>

              <div className="detail-row">
                <label className="detail-label">Password (min. 6 characters)</label>
                <input
                  type="password"
                  className="admin-note-input"
                  placeholder="••••••••"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                />
              </div>

              <div className="detail-row">
                <label className="detail-label">Store Location</label>
                <select
                  className="store-select"
                  value={newAdminStore}
                  onChange={(e) => setNewAdminStore(e.target.value)}
                >
                  <option value="">Select Store...</option>
                  {STORES.map(store => (
                    <option key={store} value={store}>{store}</option>
                  ))}
                </select>
              </div>

              {createError && (
                <div style={{
                  padding: '12px',
                  background: 'rgba(248, 113, 113, 0.2)',
                  border: '1px solid rgba(248, 113, 113, 0.3)',
                  borderRadius: '8px',
                  color: '#f87171',
                  fontSize: '14px',
                  marginTop: '12px'
                }}>
                  {createError}
                </div>
              )}

              <div className="modal-actions">
                <button
                  className="btn-save"
                  onClick={handleCreateAdmin}
                  disabled={creating || !newAdminEmail || !newAdminPassword || !newAdminStore}
                >
                  {creating ? 'Creating...' : '✅ Create Account'}
                </button>
                <button className="btn-cancel" onClick={() => setShowCreateAdmin(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
