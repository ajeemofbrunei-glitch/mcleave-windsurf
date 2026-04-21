import type { LeaveRequest } from '../supabase';

interface AnalyticsProps {
  requests: LeaveRequest[];
}

export function AnalyticsDashboard({ requests }: AnalyticsProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthRequests = requests.filter(r => {
      const date = new Date(r.date_start);
      return date.getFullYear() === currentYear && date.getMonth() === i;
    });
    return {
      month: new Date(currentYear, i).toLocaleString('default', { month: 'short' }),
      total: monthRequests.length,
      approved: monthRequests.filter(r => r.status === 'approved').length,
      denied: monthRequests.filter(r => r.status === 'denied').length,
      pending: monthRequests.filter(r => r.status === 'pending').length,
    };
  });

  const leaveTypeData = requests.reduce((acc, r) => {
    acc[r.leave_type] = (acc[r.leave_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const maxMonthlyTotal = Math.max(...monthlyData.map(m => m.total), 1);

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="form-card">
        <div className="form-title">📊 Monthly Leave Requests ({currentYear})</div>
        <div className="form-sub">Visual breakdown of leave requests by month</div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 200, marginTop: 20 }}>
          {monthlyData.map((data, i) => {
            const height = (data.total / maxMonthlyTotal) * 160;
            const isCurrent = i === currentMonth;

            return (
              <div
                key={data.month}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--accent)',
                    marginBottom: 2,
                  }}
                >
                  {data.total}
                </div>
                <div
                  style={{
                    width: '100%',
                    height: height || 2,
                    background: isCurrent
                      ? 'linear-gradient(180deg, var(--gold) 0%, var(--accent) 100%)'
                      : 'linear-gradient(180deg, var(--accent-light) 0%, var(--accent) 100%)',
                    borderRadius: '6px 6px 0 0',
                    transition: 'all 0.3s',
                    cursor: 'pointer',
                    border: isCurrent ? '2px solid var(--gold)' : 'none',
                  }}
                  title={`${data.month}: ${data.total} requests (${data.approved} approved, ${data.denied} denied, ${data.pending} pending)`}
                />
                <div
                  style={{
                    fontSize: 9,
                    fontFamily: 'var(--mono)',
                    color: isCurrent ? 'var(--accent)' : 'var(--muted)',
                    fontWeight: isCurrent ? 700 : 400,
                    textTransform: 'uppercase',
                  }}
                >
                  {data.month}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 20, justifyContent: 'center' }}>
          {[
            ['#166534', 'Approved'],
            ['#c0392b', 'Denied'],
            ['#b45309', 'Pending'],
          ].map(([color, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: color }} />
              <span style={{ color: 'var(--muted)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="form-card">
        <div className="form-title">📋 Leave Type Distribution</div>
        <div className="form-sub">Breakdown by leave type</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 16 }}>
          {Object.entries(leaveTypeData)
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => (
              <div
                key={type}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '14px 16px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--mono)' }}>
                  {count}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{type}</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
