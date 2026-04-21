import { useState, useEffect } from 'react';
import { leaveRequestApi, adminApi } from '../../api';

interface LeaveRequest {
  id: string;
  crew_name: string;
  phone: string;
  designation: string;
  leave_type: string;
  date_start: string;
  date_end: string;
  reason: string;
  status: string;
  submitted_at: string;
  responded_at: string | null;
  admin_note: string;
  admin_id: string;
}

interface AdminProfile {
  id: string;
  store_location: string;
}

const STORES = ['ALL', 'GADONG', 'JPDT', 'KIULAP', 'MULAUT', 'SERIA', 'AIRPORT', 'DELIMA'];

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#b45309', bg: '#fef3c7', icon: '⏳' },
  approved: { label: 'Approved', color: '#166534', bg: '#dcfce7', icon: '✅' },
  denied: { label: 'Denied', color: '#c0392b', bg: '#fee2e2', icon: '❌' },
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function GodViewRequests() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [storeFilter, setStoreFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    try {
      const adminsData = await adminApi.getAllAdmins();
      const allRequests: any[] = [];

      for (const admin of adminsData) {
        const requests = await leaveRequestApi.getLeaveRequestsByAdmin(admin.id);
        allRequests.push(...requests.map(r => ({ ...r, store_location: admin.store_location })));
      }

      setRequests(allRequests);
    } catch (error) {
      console.error('Error loading requests:', error);
    }

    setLoading(false);
  };

  const handleApprove = async (request: LeaveRequest) => {
    try {
      await leaveRequestApi.updateLeaveRequest(request.id, {
        status: 'approved',
        responded_at: new Date().toISOString(),
        admin_note: adminNote || 'Approved by Master Admin'
      });
      loadData();
      setSelectedRequest(null);
      setAdminNote('');
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleDeny = async (request: LeaveRequest) => {
    try {
      await leaveRequestApi.updateLeaveRequest(request.id, {
        status: 'denied',
        responded_at: new Date().toISOString(),
        admin_note: adminNote || 'Denied by Master Admin'
      });
      loadData();
      setSelectedRequest(null);
      setAdminNote('');
    } catch (error) {
      console.error('Error denying request:', error);
    }
  };

  const filteredRequests = requests.filter(req => {
    const storeLocation = (req as any).store_location || 'Unknown';
    const matchesStore = storeFilter === 'ALL' || storeLocation === storeFilter;
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    return matchesStore && matchesStatus;
  });

  const stats = {
    total: filteredRequests.length,
    pending: filteredRequests.filter(r => r.status === 'pending').length,
    approved: filteredRequests.filter(r => r.status === 'approved').length,
    denied: filteredRequests.filter(r => r.status === 'denied').length,
  };

  if (loading) {
    return <div className="master-loading">Loading global data...</div>;
  }

  return (
    <div className="god-view-container">
      <div className="god-view-stats">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Requests</div>
        </div>
        <div className="stat-card stat-pending">
          <div className="stat-value">{stats.pending}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card stat-approved">
          <div className="stat-value">{stats.approved}</div>
          <div className="stat-label">Approved</div>
        </div>
        <div className="stat-card stat-denied">
          <div className="stat-value">{stats.denied}</div>
          <div className="stat-label">Denied</div>
        </div>
      </div>

      <div className="god-view-filters">
        <div className="filter-group">
          <label>Store Location:</label>
          <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}>
            {STORES.map(store => (
              <option key={store} value={store}>{store}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
          </select>
        </div>

        <button className="refresh-btn" onClick={loadData}>
          🔄 Refresh
        </button>
      </div>

      <div className="god-view-table-container">
        <table className="god-view-table">
          <thead>
            <tr>
              <th>Store</th>
              <th>Crew Name</th>
              <th>Designation</th>
              <th>Leave Type</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>
                  No requests found
                </td>
              </tr>
            ) : (
              filteredRequests.map(req => {
                const storeLocation = (req as any).store_location || 'Unknown';
                const statusCfg = STATUS_CONFIG[req.status as keyof typeof STATUS_CONFIG];

                return (
                  <tr key={req.id}>
                    <td>
                      <span className="store-badge">{storeLocation}</span>
                    </td>
                    <td>{req.crew_name}</td>
                    <td>{req.designation}</td>
                    <td>{req.leave_type}</td>
                    <td>{formatDate(req.date_start)}</td>
                    <td>{formatDate(req.date_end)}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          color: statusCfg.color,
                          backgroundColor: statusCfg.bg
                        }}
                      >
                        {statusCfg.icon} {statusCfg.label}
                      </span>
                    </td>
                    <td>{formatDate(req.submitted_at)}</td>
                    <td>
                      <button
                        className="action-btn-small"
                        onClick={() => setSelectedRequest(req)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request Details</h3>
              <button className="modal-close" onClick={() => setSelectedRequest(null)}>×</button>
            </div>

            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">Store:</span>
                <span className="detail-value">{(selectedRequest as any).store_location || 'Unknown'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Crew Name:</span>
                <span className="detail-value">{selectedRequest.crew_name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Phone:</span>
                <span className="detail-value">{selectedRequest.phone}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Designation:</span>
                <span className="detail-value">{selectedRequest.designation}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Leave Type:</span>
                <span className="detail-value">{selectedRequest.leave_type}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Period:</span>
                <span className="detail-value">
                  {formatDate(selectedRequest.date_start)} - {formatDate(selectedRequest.date_end)}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Reason:</span>
                <span className="detail-value">{selectedRequest.reason}</span>
              </div>

              {selectedRequest.status === 'pending' && (
                <>
                  <div className="detail-row">
                    <label className="detail-label">Admin Note:</label>
                    <textarea
                      className="admin-note-input"
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Optional note..."
                      rows={3}
                    />
                  </div>

                  <div className="modal-actions">
                    <button className="btn-approve" onClick={() => handleApprove(selectedRequest)}>
                      ✅ Approve
                    </button>
                    <button className="btn-deny" onClick={() => handleDeny(selectedRequest)}>
                      ❌ Deny
                    </button>
                  </div>
                </>
              )}

              {selectedRequest.status !== 'pending' && (
                <div className="detail-row">
                  <span className="detail-label">Admin Note:</span>
                  <span className="detail-value">{selectedRequest.admin_note || 'No note'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
