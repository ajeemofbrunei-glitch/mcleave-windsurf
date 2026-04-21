import { useState, useEffect } from 'react';
import { leaveRequestApi, crewApi, blockedDateApi, adminApi } from '../api';
import { useAuth } from '../contexts/AuthContext';

interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  deniedRequests: number;
  totalCrews: number;
  blockedDates: number;
  todayRequests: number;
}

const Arches = ({ size = 32, color = "#FFC72C" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 100 80" fill="none">
    <path d="M10 70 Q10 10 30 10 Q50 10 50 40 Q50 10 70 10 Q90 10 90 70" stroke={color} strokeWidth="14" strokeLinecap="round" fill="none" />
  </svg>
);

export function AdminDashboard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    deniedRequests: 0,
    totalCrews: 0,
    blockedDates: 0,
    todayRequests: 0
  });
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    if (!user) return;

    try {
      // Check if this admin's maintenance mode is enabled
      const adminMaintenanceMode = await adminApi.getMaintenanceMode(user.id);
      console.log('Maintenance mode for admin', user.id, ':', adminMaintenanceMode);
      setMaintenanceMode(adminMaintenanceMode);

      if (adminMaintenanceMode) {
        setLoading(false);
        return;
      }

      const requests = await leaveRequestApi.getLeaveRequestsByAdmin(user.id);
      const crews = await crewApi.getCrewsByAdmin(user.id);
      const blocked = await blockedDateApi.getBlockedDatesByAdmin(user.id);

      const today = new Date().toISOString().split('T')[0];

      setStats({
        totalRequests: requests?.length || 0,
        pendingRequests: requests?.filter(r => r.status === 'pending').length || 0,
        approvedRequests: requests?.filter(r => r.status === 'approved').length || 0,
        deniedRequests: requests?.filter(r => r.status === 'denied').length || 0,
        totalCrews: crews?.length || 0,
        blockedDates: blocked?.length || 0,
        todayRequests: requests?.filter(r => r.submitted_at?.startsWith(today)).length || 0
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)'
      }}>
        <div style={{ fontSize: 18, color: 'var(--muted)' }}>Loading...</div>
      </div>
    );
  }

  if (maintenanceMode) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        flexDirection: 'column',
        gap: 20
      }}>
        <div style={{ fontSize: 64 }}>🔧</div>
        <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)' }}>Maintenance Mode</div>
        <div style={{ fontSize: 16, color: 'var(--muted)', textAlign: 'center', maxWidth: 400 }}>
          Your store is currently under maintenance. Please contact the Master Administrator for more information.
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeUp .3s ease' }}>
      <div style={{
        background: 'linear-gradient(135deg, #DA291C 0%, #b71c1c 100%)',
        borderRadius: 20,
        padding: 40,
        marginBottom: 30,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(218, 41, 28, 0.3)'
      }}>
        <div style={{
          position: 'absolute',
          top: -20,
          right: -20,
          opacity: 0.1,
          transform: 'rotate(15deg)'
        }}>
          <Arches size={200} color="#FFC72C" />
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 20
          }}>
            <Arches size={56} color="#FFC72C" />
            <div>
              <h1 style={{
                fontFamily: 'Impact, var(--mono), sans-serif',
                fontSize: 36,
                fontWeight: 900,
                color: '#fff',
                margin: 0,
                letterSpacing: 2
              }}>
                McLeave Admin Portal
              </h1>
              <p style={{
                fontSize: 16,
                color: 'rgba(255, 255, 255, 0.85)',
                margin: 0,
                fontStyle: 'italic'
              }}>
                Manage your crew's leave requests with ease
              </p>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
            marginTop: 24
          }}>
            <QuickStatCard
              icon="📋"
              label="Total Requests"
              value={stats.totalRequests}
              color="#FFC72C"
            />
            <QuickStatCard
              icon="⏳"
              label="Pending"
              value={stats.pendingRequests}
              color="#f59e0b"
              onClick={() => onNavigate('requests')}
            />
            <QuickStatCard
              icon="✅"
              label="Approved"
              value={stats.approvedRequests}
              color="#10b981"
            />
            <QuickStatCard
              icon="👥"
              label="Total Crew"
              value={stats.totalCrews}
              color="#8b5cf6"
              onClick={() => onNavigate('crews')}
            />
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20,
        marginBottom: 30
      }}>
        <ActionCard
          icon="📋"
          title="Manage Requests"
          description="Review and respond to leave requests from your crew"
          actionText="View Requests"
          onClick={() => onNavigate('requests')}
          badge={stats.pendingRequests > 0 ? `${stats.pendingRequests} pending` : undefined}
        />
        <ActionCard
          icon="🚫"
          title="Block Dates"
          description="Manage dates when leave requests are not allowed"
          actionText="Manage Dates"
          onClick={() => onNavigate('blocked')}
        />
        <ActionCard
          icon="👥"
          title="Crew Database"
          description="View and manage all crew members in your store"
          actionText="View Crew"
          onClick={() => onNavigate('crews')}
        />
        <ActionCard
          icon="⚙️"
          title="Settings"
          description="Update your admin credentials and preferences"
          actionText="Open Settings"
          onClick={() => onNavigate('settings')}
        />
      </div>

      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        padding: 30,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🍔</div>
        <h2 style={{
          fontFamily: 'var(--mono)',
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--accent)',
          margin: '0 0 8px 0'
        }}>
          I'm Lovin' It!
        </h2>
        <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.6 }}>
          Your McLeave system is running smoothly. Click on any card above to get started.
        </p>
      </div>
    </div>
  );
}

function QuickStatCard({ icon, label, value, color, onClick }: {
  icon: string;
  label: string;
  value: number;
  color: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: 14,
        padding: '16px 20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        ...(onClick && {
          ':hover': {
            transform: 'translateY(-2px)',
            background: 'rgba(255, 255, 255, 0.25)'
          }
        })
      }}
    >
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{
        fontSize: 28,
        fontWeight: 800,
        fontFamily: 'var(--mono)',
        color: color,
        marginBottom: 4
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.75)',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 1
      }}>
        {label}
      </div>
    </div>
  );
}

function ActionCard({ icon, title, description, actionText, onClick, badge }: {
  icon: string;
  title: string;
  description: string;
  actionText: string;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '2px solid var(--border)',
        borderRadius: 18,
        padding: 28,
        cursor: 'pointer',
        transition: 'all 0.25s',
        position: 'relative',
        textAlign: 'left'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)';
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(218, 41, 28, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {badge && (
        <div style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: '#FFC72C',
          color: '#DA291C',
          padding: '4px 12px',
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 700,
          fontFamily: 'var(--mono)'
        }}>
          {badge}
        </div>
      )}

      <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
      <h3 style={{
        fontFamily: 'var(--mono)',
        fontSize: 18,
        fontWeight: 800,
        color: 'var(--text)',
        margin: '0 0 8px 0'
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: 14,
        color: 'var(--muted)',
        lineHeight: 1.6,
        margin: '0 0 20px 0'
      }}>
        {description}
      </p>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        color: 'var(--accent)',
        fontSize: 14,
        fontWeight: 700,
        fontFamily: 'var(--sans)'
      }}>
        {actionText}
        <span style={{ fontSize: 18 }}>→</span>
      </div>
    </div>
  );
}
