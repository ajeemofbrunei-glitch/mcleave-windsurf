import { useState, useEffect } from 'react';
import { leaveRequestApi, adminApi, crewApi } from '../../api';

interface StoreActivity {
  store: string;
  pending: number;
  approved: number;
  denied: number;
  total: number;
}

export function ExecutiveAnalytics() {
  const [loading, setLoading] = useState(true);
  const [totalCrew, setTotalCrew] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);
  const [requestsThisMonth, setRequestsThisMonth] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [storeActivity, setStoreActivity] = useState<StoreActivity[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const adminsData = await adminApi.getAllAdmins();
      const allRequests: any[] = [];

      for (const admin of adminsData) {
        const requests = await leaveRequestApi.getLeaveRequestsByAdmin(admin.id);
        allRequests.push(...requests.map(r => ({ ...r, store_location: admin.store_location })));
      }

      setTotalRequests(allRequests.length);

      // Load crew count
      const allCrew: any[] = [];
      for (const admin of adminsData) {
        const crews = await crewApi.getCrewsByAdmin(admin.id);
        allCrew.push(...crews);
      }
      setTotalCrew(allCrew.length);

      const pending = allRequests.filter(r => r.status === 'pending').length;
      setPendingRequests(pending);

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonth = allRequests.filter(r => {
        const date = new Date(r.submitted_at);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      }).length;
      setRequestsThisMonth(thisMonth);

      const activityMap = new Map<string, StoreActivity>();

      for (const req of allRequests) {
        const store = (req as any).store_location || 'Unknown';
        if (!activityMap.has(store)) {
          activityMap.set(store, {
            store,
            pending: 0,
            approved: 0,
            denied: 0,
            total: 0
          });
        }

        const activity = activityMap.get(store)!;
        activity.total++;
        if (req.status === 'pending') activity.pending++;
        if (req.status === 'approved') activity.approved++;
        if (req.status === 'denied') activity.denied++;
      }

      const activityArray = Array.from(activityMap.values()).sort((a, b) => b.total - a.total);
      setStoreActivity(activityArray);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="master-loading">Loading analytics...</div>;
  }

  const maxActivity = Math.max(...storeActivity.map(s => s.total), 1);

  return (
    <div className="executive-analytics">
      <div className="analytics-grid">
        <div className="analytics-card card-primary">
          <div className="card-icon">👥</div>
          <div className="card-content">
            <div className="card-value">{totalCrew}</div>
            <div className="card-label">Active Crew Members</div>
            <div className="card-sublabel">Across all locations</div>
          </div>
        </div>

        <div className="analytics-card card-warning">
          <div className="card-icon">⏳</div>
          <div className="card-content">
            <div className="card-value">{pendingRequests}</div>
            <div className="card-label">Pending Requests</div>
            <div className="card-sublabel">Awaiting approval</div>
          </div>
        </div>

        <div className="analytics-card card-success">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <div className="card-value">{requestsThisMonth}</div>
            <div className="card-label">This Month</div>
            <div className="card-sublabel">Requests processed</div>
          </div>
        </div>

        <div className="analytics-card card-info">
          <div className="card-icon">📈</div>
          <div className="card-content">
            <div className="card-value">{totalRequests}</div>
            <div className="card-label">Total Requests</div>
            <div className="card-sublabel">All time</div>
          </div>
        </div>
      </div>

      <div className="store-activity-section">
        <div className="section-header">
          <h3>Store Activity Heatmap</h3>
          <p>Request volume by location</p>
        </div>

        <div className="heatmap-container">
          {storeActivity.length === 0 ? (
            <div className="no-data">No activity data available</div>
          ) : (
            storeActivity.map(store => {
              const intensity = (store.total / maxActivity) * 100;
              const pendingPercentage = store.total > 0 ? (store.pending / store.total) * 100 : 0;

              return (
                <div key={store.store} className="heatmap-row">
                  <div className="store-name">{store.store}</div>

                  <div className="activity-bar-container">
                    <div
                      className="activity-bar"
                      style={{
                        width: `${intensity}%`,
                        background: pendingPercentage > 50
                          ? 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)'
                          : 'linear-gradient(90deg, #34d399 0%, #10b981 100%)'
                      }}
                    >
                      <span className="activity-count">{store.total}</span>
                    </div>
                  </div>

                  <div className="activity-breakdown">
                    <span className="breakdown-item pending">
                      <span className="breakdown-dot"></span>
                      {store.pending} Pending
                    </span>
                    <span className="breakdown-item approved">
                      <span className="breakdown-dot"></span>
                      {store.approved} Approved
                    </span>
                    <span className="breakdown-item denied">
                      <span className="breakdown-dot"></span>
                      {store.denied} Denied
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="quick-insights">
        <div className="section-header">
          <h3>Quick Insights</h3>
        </div>

        <div className="insights-grid">
          <div className="insight-card">
            <div className="insight-icon">🏆</div>
            <div className="insight-content">
              <div className="insight-label">Most Active Store</div>
              <div className="insight-value">
                {storeActivity[0]?.store || 'N/A'}
              </div>
              <div className="insight-detail">
                {storeActivity[0]?.total || 0} total requests
              </div>
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-icon">⚡</div>
            <div className="insight-content">
              <div className="insight-label">System Throughput</div>
              <div className="insight-value">
                {requestsThisMonth} requests
              </div>
              <div className="insight-detail">
                Processed this month
              </div>
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-icon">🎯</div>
            <div className="insight-content">
              <div className="insight-label">Approval Rate</div>
              <div className="insight-value">
                {totalRequests > 0
                  ? Math.round((storeActivity.reduce((sum, s) => sum + s.approved, 0) / totalRequests) * 100)
                  : 0}%
              </div>
              <div className="insight-detail">
                Overall approval rate
              </div>
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-icon">📍</div>
            <div className="insight-content">
              <div className="insight-label">Active Locations</div>
              <div className="insight-value">
                {storeActivity.length}
              </div>
              <div className="insight-detail">
                Stores with activity
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
