import { useState, useEffect } from 'react';
import { systemApi } from '../../api';

interface ReportSummary {
  totalAdmins: number;
  totalCrews: number;
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  deniedRequests: number;
}

interface StoreReport {
  store: string;
  location: string;
  total: number;
  pending: number;
  approved: number;
  denied: number;
  totalCrews?: number;
  activeCrews?: number;
}

interface ReportData {
  summary: ReportSummary;
  requestsByStore: StoreReport[];
  crewByStore: StoreReport[];
  generatedAt: string;
}

export function Reports() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      const data = await systemApi.getReports();
      setReportData(data);
      setError(null);
    } catch (err: any) {
      setError('Failed to load report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData) return;

    let csv = 'System Report\n\n';

    // Summary
    csv += 'Summary\n';
    csv += 'Total Admins,' + reportData.summary.totalAdmins + '\n';
    csv += 'Total Crews,' + reportData.summary.totalCrews + '\n';
    csv += 'Total Requests,' + reportData.summary.totalRequests + '\n';
    csv += 'Pending Requests,' + reportData.summary.pendingRequests + '\n';
    csv += 'Approved Requests,' + reportData.summary.approvedRequests + '\n';
    csv += 'Denied Requests,' + reportData.summary.deniedRequests + '\n\n';

    // Requests by Store
    csv += 'Requests by Store\n';
    csv += 'Store,Location,Total,Pending,Approved,Denied\n';
    reportData.requestsByStore.forEach(store => {
      csv += `${store.store},${store.location || 'N/A'},${store.total},${store.pending},${store.approved},${store.denied}\n`;
    });

    // Crew by Store
    csv += '\nCrew by Store\n';
    csv += 'Store,Location,Total Crews,Active Crews\n';
    reportData.crewByStore.forEach(store => {
      csv += `${store.store},${store.location || 'N/A'},${store.totalCrews || 0},${store.activeCrews || 0}\n`;
    });

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcleave-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: 18, color: 'var(--muted)' }}>Loading report...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ color: '#ef4444' }}>{error}</div>
        <button
          onClick={loadReport}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!reportData) return null;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: 'var(--text)' }}>
            System Reports
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: 14, color: 'var(--muted)' }}>
            Generated: {new Date(reportData.generatedAt).toLocaleString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={loadReport}
            style={{
              padding: '10px 20px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500
            }}
          >
            🔄 Refresh
          </button>
          <button
            onClick={exportToCSV}
            style={{
              padding: '10px 20px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500
            }}
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: '8px' }}>Total Admins</div>
          <div style={{ fontSize: 32, fontWeight: 600, color: 'var(--text)' }}>{reportData.summary.totalAdmins}</div>
        </div>
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: '8px' }}>Total Crews</div>
          <div style={{ fontSize: 32, fontWeight: 600, color: 'var(--text)' }}>{reportData.summary.totalCrews}</div>
        </div>
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: '8px' }}>Total Requests</div>
          <div style={{ fontSize: 32, fontWeight: 600, color: 'var(--text)' }}>{reportData.summary.totalRequests}</div>
        </div>
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: '8px' }}>Pending</div>
          <div style={{ fontSize: 32, fontWeight: 600, color: '#f59e0b' }}>{reportData.summary.pendingRequests}</div>
        </div>
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: '8px' }}>Approved</div>
          <div style={{ fontSize: 32, fontWeight: 600, color: '#10b981' }}>{reportData.summary.approvedRequests}</div>
        </div>
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: '8px' }}>Denied</div>
          <div style={{ fontSize: 32, fontWeight: 600, color: '#ef4444' }}>{reportData.summary.deniedRequests}</div>
        </div>
      </div>

      {/* Requests by Store Table */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
          Leave Requests by Store
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>Store</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>Location</th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>Total</th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>Pending</th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>Approved</th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>Denied</th>
            </tr>
          </thead>
          <tbody>
            {reportData.requestsByStore.map((store, index) => (
              <tr key={index} style={{ borderBottom: index < reportData.requestsByStore.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <td style={{ padding: '12px', color: 'var(--text)' }}>{store.store}</td>
                <td style={{ padding: '12px', color: 'var(--muted)' }}>{store.location || 'N/A'}</td>
                <td style={{ padding: '12px', textAlign: 'right', color: 'var(--text)' }}>{store.total}</td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#f59e0b' }}>{store.pending}</td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#10b981' }}>{store.approved}</td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#ef4444' }}>{store.denied}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Crew by Store Table */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
          Crew Members by Store
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>Store</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>Location</th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>Total Crews</th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>Active Crews</th>
            </tr>
          </thead>
          <tbody>
            {reportData.crewByStore.map((store, index) => (
              <tr key={index} style={{ borderBottom: index < reportData.crewByStore.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <td style={{ padding: '12px', color: 'var(--text)' }}>{store.store}</td>
                <td style={{ padding: '12px', color: 'var(--muted)' }}>{store.location || 'N/A'}</td>
                <td style={{ padding: '12px', textAlign: 'right', color: 'var(--text)' }}>{store.totalCrews || 0}</td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#10b981' }}>{store.activeCrews || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
