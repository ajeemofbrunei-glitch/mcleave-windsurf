import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminSettings } from './components/AdminSettings';
import { CrewLogin } from './components/CrewLogin';
import { CrewDashboard } from './components/CrewDashboard';
import { CrewManagement } from './components/CrewManagement';
import { MasterDashboard } from './components/MasterDashboard';
import { adminApi, leaveRequestApi, blockedDateApi, systemApi, type LeaveRequest, type AdminProfile } from './api';
import { getDesignationColor } from './utils/designationColors';
import { sendWhatsAppNotification } from './utils/whatsapp';
import './App.css';

interface Toast {
  id: number;
  title: string;
  msg: string;
  type: string;
  icon: string;
}

const STATUS_CFG = {
  pending: { label: "Pending", color: "#b45309", bg: "#fef3c7", icon: "⏳" },
  approved: { label: "Approved", color: "#166534", bg: "#dcfce7", icon: "✅" },
  denied: { label: "Denied", color: "#c0392b", bg: "#fee2e2", icon: "❌" },
};

function fmt(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function todayStr() { return new Date().toISOString().slice(0, 10); }
function daysCount(s: string, e: string) {
  if (!s || !e) return 0;
  const ms = new Date(e).getTime() - new Date(s).getTime();
  return ms >= 0 ? Math.round(ms / 86400000) + 1 : 0;
}
function bruneiTime() {
  const now = new Date();
  const bruneiOffset = 8 * 60;
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const bruneiDate = new Date(utcTime + (bruneiOffset * 60000));
  return bruneiDate.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(',', '');
}

const Arches = ({ size = 32, color = "#FFC72C" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 100 80" fill="none">
    <path d="M10 70 Q10 10 30 10 Q50 10 50 40 Q50 10 70 10 Q90 10 90 70" stroke={color} strokeWidth="14" strokeLinecap="round" fill="none" />
  </svg>
);

function Toasts({ list }: { list: Toast[] }) {
  const colors: Record<string, string> = { success: "#166534", denied: "#c0392b", warning: "#92400e", info: "#c0392b" };
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none" }}>
      {list.map(t => (
        <div key={t.id} style={{
          background: colors[t.type] || colors.info, color: "#fff", borderRadius: 14, padding: "14px 20px",
          fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,.25)",
          maxWidth: 320, display: "flex", alignItems: "flex-start", gap: 12, animation: "toastIn .3s ease"
        }}>
          <span style={{ fontSize: 20 }}>{t.icon}</span>
          <div><div style={{ fontWeight: 700, marginBottom: 2 }}>{t.title}</div>
            <div style={{ fontWeight: 400, fontSize: 12, opacity: .9 }}>{t.msg}</div></div>
        </div>
      ))}
    </div>
  );
}

function Calendar({ blockedDates = [], onRangeChange, selectedStart, selectedEnd, pickMode = false, onToggleBlock }: {
  blockedDates?: string[];
  onRangeChange?: (start: string | null, end: string | null) => void;
  selectedStart?: string;
  selectedEnd?: string;
  pickMode?: boolean;
  onToggleBlock?: (date: string) => void;
}) {
  const now = new Date();
  const [vy, setVy] = useState(now.getFullYear());
  const [vm, setVm] = useState(now.getMonth());
  const [rStart, setRStart] = useState(selectedStart || null);
  const [rEnd, setREnd] = useState(selectedEnd || null);

  const days = new Date(vy, vm + 1, 0).getDate();
  const firstDay = new Date(vy, vm, 1).getDay();
  const label = new Date(vy, vm).toLocaleString("default", { month: "long" });

  function toStr(d: number) { return `${vy}-${String(vm + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }
  function prev() { if (vm === 0) { setVm(11); setVy(y => y - 1); } else setVm(m => m - 1); }
  function next() { if (vm === 11) { setVm(0); setVy(y => y + 1); } else setVm(m => m + 1); }

  function clickDay(d: number) {
    const s = toStr(d);
    if (pickMode) { onToggleBlock && onToggleBlock(s); return; }
    if (blockedDates.includes(s)) return;
    if (!rStart || (rStart && rEnd)) { setRStart(s); setREnd(null); onRangeChange && onRangeChange(s, null); }
    else {
      const [a, b] = s < rStart ? [s, rStart] : [rStart, s];
      setRStart(a); setREnd(b); onRangeChange && onRangeChange(a, b);
    }
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const nb = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 12px", color: "var(--text)", cursor: "pointer", fontSize: 15 };
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 16, userSelect: "none" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button onClick={prev} style={nb}>‹</button>
        <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent)", letterSpacing: 2, fontWeight: 700 }}>{label} {vy}</span>
        <button onClick={next} style={nb}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 4 }}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 10, color: "var(--muted)", fontFamily: "var(--mono)", padding: "3px 0" }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={"e" + i} />;
          const s = toStr(d);
          const blocked = blockedDates.includes(s);
          const isToday = s === todayStr();
          const inRange = rStart && rEnd && s >= rStart && s <= rEnd;
          const selected = s === rStart || s === rEnd || inRange;
          return (
            <div key={s} onClick={() => clickDay(d)} style={{
              textAlign: "center", padding: "7px 2px", borderRadius: 7, fontSize: 13,
              cursor: blocked && !pickMode ? "not-allowed" : "pointer",
              background: blocked ? "rgba(192,57,43,.15)" : selected ? "var(--accent)" : isToday ? "rgba(255,199,44,.25)" : "transparent",
              color: blocked ? "#c0392b" : selected ? "#fff" : isToday ? "#b45309" : "var(--text)",
              fontWeight: (isToday || selected) ? 700 : 400,
              textDecoration: blocked && !pickMode ? "line-through" : "none",
              transition: "all .12s",
              outline: pickMode && blocked ? "2px solid #c0392b" : "none",
            }}>{d}</div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
        {[["rgba(192,57,43,.4)", "Blocked"], ["var(--accent)", "Selected"], ["rgba(255,199,44,.5)", "Today"]].map(([bg, lbl]) => (
          <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--muted)" }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: bg }} />{lbl}
          </div>
        ))}
      </div>
    </div>
  );
}

function AppContent() {
  const { user, userRole, loading: authLoading, signOut } = useAuth();
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [userType, setUserType] = useState<'admin' | 'crew' | null>(null);
  const [loginType, setLoginType] = useState<'admin' | 'crew'>('admin');
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [blockedDates, setBlocked] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [tab, setTab] = useState<'dashboard' | 'requests' | 'blocked' | 'crews' | 'settings'>('dashboard');
  const [filterS, setFilterS] = useState<'all' | 'pending' | 'approved' | 'denied'>('all');
  const [detail, setDetail] = useState<LeaveRequest | null>(null);
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    checkMaintenanceMode();
  }, []);

  const checkMaintenanceMode = async () => {
    try {
      const maintenanceMode = await systemApi.getMaintenanceMode();
      setMaintenanceMode(maintenanceMode);
    } catch (error) {
      console.error('Error checking maintenance mode:', error);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoaded(true);
      setUserType(null);
      return;
    }

    (async () => {
      try {
        const adminData = await adminApi.getProfileByEmail(user.email || '');

        if (adminData) {
          setAdminProfile(adminData);
          setUserType('admin');

          const reqData = await leaveRequestApi.getLeaveRequestsByAdmin(user.id);
          const blockedData = await blockedDateApi.getBlockedDatesByAdmin(user.id);

          setRequests(reqData);
          setBlocked(blockedData.map(b => b.date));
        } else {
          setUserType('crew');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setUserType('crew');
      }

      setLoaded(true);
    })();
  }, [user]);

  function toast(title: string, msg: string, type = "info", icon = "🔔") {
    const id = Date.now();
    setToasts(t => [...t, { id, title, msg, type, icon }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200);
  }

  async function logout() {
    await signOut();
    setAdminProfile(null);
    setUserType(null);
    setRequests([]);
    setBlocked([]);
  }

  const filtered = requests
    .filter(r => filterS === "all" || r.status === filterS)
    .filter(r => !search || r.crew_name.toLowerCase().includes(search.toLowerCase()) || r.leave_type.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.submitted_at > a.submitted_at ? 1 : -1);

  const stats: Record<string, number> = {
    total: requests.length,
    pending: requests.filter(r => r.status === "pending").length,
    approved: requests.filter(r => r.status === "approved").length,
    denied: requests.filter(r => r.status === "denied").length,
  };

  async function respond(id: string, status: 'pending' | 'approved' | 'denied') {
    const req = requests.find(r => r.id === id);
    if (!req || !user) return;

    const updated: LeaveRequest = { ...req, status, responded_at: bruneiTime(), admin_note: note };

    try {
      await leaveRequestApi.updateLeaveRequest(id, {
        status,
        responded_at: updated.responded_at,
        admin_note: note
      });

      // Open WhatsApp with pre-filled message if crew has phone
      if (req.phone) {
        const icon = status === 'approved' ? '✅' : '❌';
        const message = `${icon} *McLeave Leave Request ${status.toUpperCase()}*

Hi ${req.crew_name},

Your leave request has been ${status.toUpperCase()}.

📋 *Details:*
• Type: ${req.leave_type}
• Dates: ${req.date_start} to ${req.date_end}
${note ? `\n📝 *Note:* ${note}` : ''}

---
🍟 McDonald's McLeave System`;
        const formattedPhone = req.phone.replace(/[^0-9]/g, '');
        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

        // Open WhatsApp in new tab
        window.open(whatsappUrl, '_blank');

        toast("WhatsApp Opened", `WhatsApp opened for ${req.crew_name}`, "success", "📱");
      }

      setRequests(p => p.map(r => r.id === id ? updated : r));
      const icons = { approved: "✅", denied: "❌", pending: "⏳" };
      const types = { approved: "success", denied: "denied", pending: "warning" };
      toast(STATUS_CFG[status].label, `${req.crew_name}'s request has been ${status}.`, types[status], icons[status]);
      setNote(""); setDetail(null);
    } catch (error) {
      console.error('Error updating request:', error);
      toast("Update Failed", "Failed to update request status", "denied", "❌");
    }
  }

  async function deleteRequest(id: string) {
    if (!user || !confirm('Are you sure you want to delete this request? This action cannot be undone.')) return;

    try {
      await leaveRequestApi.deleteLeaveRequest(id);
      setRequests(p => p.filter(r => r.id !== id));
      setDetail(null);
      toast("Request deleted", "The leave request has been removed.", "success", "🗑️");
    } catch (error) {
      console.error('Error deleting request:', error);
      toast("Delete Failed", "Failed to delete request", "denied", "❌");
    }
  }

  async function toggleBlock(date: string) {
    if (!user) return;

    try {
      if (blockedDates.includes(date)) {
        await blockedDateApi.deleteBlockedDate(date, user.id);
        setBlocked(p => p.filter(d => d !== date));
      } else {
        await blockedDateApi.createBlockedDate({
          id: `block-${Date.now()}`,
          date,
          admin_id: user.id
        });
        setBlocked(p => [...p, date].sort());
      }
    } catch (error) {
      console.error('Error toggling blocked date:', error);
    }
  }


  if (authLoading || !loaded) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#DA291C" }}>
        <Arches size={60} color="#FFC72C" />
        <div style={{ color: "#FFC72C", fontFamily: "Impact,sans-serif", fontSize: 18, marginTop: 16, letterSpacing: 3 }}>LOADING…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Toasts list={toasts} />
        <div style={{
          position: 'fixed',
          top: 20,
          left: 20,
          display: 'flex',
          gap: 8,
          zIndex: 1000
        }}>
          <button
            onClick={() => setLoginType('admin')}
            style={{
              background: loginType === 'admin' ? 'var(--accent)' : 'rgba(255,255,255,0.9)',
              color: loginType === 'admin' ? '#fff' : 'var(--text)',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--sans)'
            }}
          >
            Admin
          </button>
          <button
            onClick={() => setLoginType('crew')}
            style={{
              background: loginType === 'crew' ? 'var(--accent)' : 'rgba(255,255,255,0.9)',
              color: loginType === 'crew' ? '#fff' : 'var(--text)',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--sans)'
            }}
          >
            Crew
          </button>
        </div>
        {loginType === 'crew' ? (
          <CrewLogin onSuccess={() => setLoaded(false)} />
        ) : (
          <AdminLogin />
        )}
      </>
    );
  }

  if (userRole === 'master_admin') {
    return <MasterDashboard onSignOut={signOut} />;
  }

  if (maintenanceMode && user) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1625 0%, #2d1b3d 100%)',
        color: '#ffffff',
        textAlign: 'center',
        padding: '40px'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔧</div>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '16px', color: '#d4af37' }}>
          System Maintenance
        </h1>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', maxWidth: '500px', marginBottom: '32px' }}>
          System is currently undergoing maintenance. Please check back later.
        </p>
        <button
          onClick={signOut}
          style={{
            padding: '12px 24px',
            background: 'rgba(192, 57, 43, 0.2)',
            border: '1px solid rgba(192, 57, 43, 0.3)',
            borderRadius: '8px',
            color: '#ff6b6b',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Sign Out
        </button>
      </div>
    );
  }

  // Prioritize userRole from auth context over userType from API
  const effectiveRole = userRole || userType;

  if (effectiveRole === 'crew') {
    return (
      <>
        <Toasts list={toasts} />
        <CrewDashboard onLogout={logout} onToast={toast} />
      </>
    );
  }

  if (effectiveRole === 'store_admin' || effectiveRole === 'admin') {
    return (
    <>
      <Toasts list={toasts} />
      <div className="app">
        <header className="header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Arches size={28} color="#FFC72C" />
            <div className="logo">McLeave<span>™</span> <span style={{ fontSize: 10, opacity: .5, letterSpacing: 1 }}>{adminProfile?.store_name || 'MANAGER'}</span></div>
            <span style={{
              padding: '4px 10px',
              borderRadius: '6px',
              background: (adminProfile?.plan || 'free') === 'pro' ? '#fef3c7' : '#f3f4f6',
              color: (adminProfile?.plan || 'free') === 'pro' ? '#92400e' : '#6b7280',
              fontWeight: 700,
              fontSize: '11px',
              letterSpacing: '0.5px'
            }}>
              {(adminProfile?.plan || 'free') === 'pro' ? '👑 Pro Plan' : 'Free Plan'}
            </span>
            <span style={{
              padding: '4px 10px',
              borderRadius: '6px',
              background: (adminProfile?.whatsapp_enabled && (adminProfile?.plan || 'free') === 'pro') ? '#d1fae5' : '#f3f4f6',
              color: (adminProfile?.whatsapp_enabled && (adminProfile?.plan || 'free') === 'pro') ? '#10b981' : '#9ca3af',
              fontWeight: 600,
              fontSize: '11px',
              letterSpacing: '0.5px'
            }}>
              📱 WhatsApp: {(adminProfile?.whatsapp_enabled && (adminProfile?.plan || 'free') === 'pro') ? 'ON' : 'OFF'}
            </span>
          </div>
          <nav className="nav">
            <button className={`nav-btn ${tab === "dashboard" ? "active" : ""}`} onClick={() => setTab("dashboard")}>🏠 Dashboard</button>
            <button className={`nav-btn ${tab === "requests" ? "active" : ""}`} onClick={() => setTab("requests")}>
              📋 Requests {stats.pending > 0 && <span className="badge-dot">{stats.pending}</span>}
            </button>
            <button className={`nav-btn ${tab === "blocked" ? "active" : ""}`} onClick={() => setTab("blocked")}>🚫 Block Dates</button>
            <button className={`nav-btn ${tab === "crews" ? "active" : ""}`} onClick={() => setTab("crews")}>👥 Crew Management</button>
            <button className={`nav-btn ${tab === "settings" ? "active" : ""}`} onClick={() => setTab("settings")}>⚙️ Settings</button>
          </nav>
          <button onClick={logout} className="logout-btn">Sign Out</button>
        </header>

        <main className="main">
          {tab === "dashboard" && (
            <AdminDashboard onNavigate={(newTab) => setTab(newTab as any)} />
          )}

          {tab === "requests" && (
            <>
              <button
                onClick={() => setTab("dashboard")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--surface)",
                  border: "1.5px solid var(--border)",
                  borderRadius: 10,
                  padding: "10px 16px",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text)",
                  marginBottom: 20,
                  fontFamily: "var(--sans)",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.background = "var(--accent)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "var(--surface)";
                  e.currentTarget.style.color = "var(--text)";
                }}
              >
                <span style={{ fontSize: 16 }}>←</span> Back to Home
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
                {(([["total", "Total", "var(--accent)"], ["pending", "Pending", "#b45309"], ["approved", "Approved", "#166534"], ["denied", "Denied", "#c0392b"]]) as [string, string, string][]).map(([k, l, c]) => (
                  <div key={k} className="stat-card"><div className="stat-label">{l}</div><div className="stat-num" style={{ color: c }}>{stats[k]}</div></div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                <input className="search-input" placeholder="Search crew or leave type…" value={search} onChange={e => setSearch(e.target.value)} />
                {(["all", "pending", "approved", "denied"] as const).map(s => (
                  <button key={s} className={`filter-btn ${filterS === s ? "active" : ""}`} onClick={() => setFilterS(s)}>
                    {s === "all" ? "All" : STATUS_CFG[s as keyof typeof STATUS_CFG].icon + " " + STATUS_CFG[s as keyof typeof STATUS_CFG].label}
                  </button>
                ))}
              </div>
              {filtered.length === 0
                ? <div className="empty"><div className="empty-icon">🍔</div><div className="empty-title">No requests found</div></div>
                : <div className="cards">{filtered.map(r => (
                  <div key={r.id} className="req-card" onClick={() => { setDetail(r); setNote(r.admin_note || ""); }} style={{ "--sc": STATUS_CFG[r.status].color } as React.CSSProperties}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div className="crew-avatar" style={{ width: 40, height: 40, fontSize: 15 }}>{r.crew_name[0].toUpperCase()}</div>
                      <div>
                        <div className="req-title">{r.crew_name}</div>
                        <div className="req-meta" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            ...getDesignationColor(r.designation || 'Core Crew')
                          }}>
                            {r.designation || 'Core Crew'}
                          </span>
                          <span>·</span>
                          <span>{r.leave_type}</span>
                        </div>
                        <div className="req-sub">📅 {fmt(r.date_start)} → {fmt(r.date_end)} · {daysCount(r.date_start, r.date_end)}d</div>
                      </div>
                    </div>
                    <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                      <div className="status-chip" style={{ background: STATUS_CFG[r.status].bg, color: STATUS_CFG[r.status].color }}>
                        {STATUS_CFG[r.status].icon} {STATUS_CFG[r.status].label}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>{r.id}</div>
                    </div>
                  </div>
                ))}</div>
              }
            </>
          )}

          {tab === "blocked" && (
            <>
              <button
                onClick={() => setTab("dashboard")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--surface)",
                  border: "1.5px solid var(--border)",
                  borderRadius: 10,
                  padding: "10px 16px",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text)",
                  marginBottom: 20,
                  fontFamily: "var(--sans)",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.background = "var(--accent)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "var(--surface)";
                  e.currentTarget.style.color = "var(--text)";
                }}
              >
                <span style={{ fontSize: 16 }}>←</span> Back to Home
              </button>
              {(adminProfile?.plan || 'free') === 'free' ? (
                <div className="form-card" style={{ maxWidth: 600, textAlign: 'center', padding: 60 }}>
                  <div style={{ fontSize: 64, marginBottom: 20 }}>🔒</div>
                  <div className="form-title">Pro Feature Locked</div>
                  <div className="form-sub" style={{ maxWidth: 400, margin: '20px auto' }}>
                    This is a Pro feature. Upgrade to Pro for $50 setup + $10/month to unlock.
                  </div>
                  <div style={{
                    background: '#fef3c7',
                    border: '1px solid #fbbf24',
                    borderRadius: 12,
                    padding: 20,
                    maxWidth: 400,
                    margin: '30px auto',
                    textAlign: 'left'
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 12, color: '#92400e' }}>Pro Features Include:</div>
                    <div style={{ fontSize: 14, color: '#92400e', lineHeight: 1.8 }}>
                      ✅ Blocked Dates Management<br />
                      ✅ WhatsApp Notifications
                    </div>
                    <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #fbbf24' }}>
                      <div style={{ fontSize: 12, color: '#92400e', marginBottom: 8 }}>
                        <strong>Setup Fee:</strong> $50 (one-time)
                      </div>
                      <div style={{ fontSize: 12, color: '#92400e' }}>
                        <strong>Monthly:</strong> $10/month
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 20 }}>
                    Contact your administrator to upgrade.
                  </div>
                </div>
              ) : (
                <div className="form-card" style={{ maxWidth: 600 }}>
                  <div className="form-title">🚫 Blocked Dates</div>
                  <div className="form-sub">Click a date to block or unblock it. Crew cannot select blocked dates.</div>
                  <Calendar blockedDates={blockedDates} pickMode onToggleBlock={toggleBlock} />
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Blocked ({blockedDates.length})</div>
                    {blockedDates.length === 0
                      ? <div style={{ color: "var(--muted)", fontSize: 14, fontStyle: "italic" }}>No dates blocked.</div>
                      : <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {blockedDates.map(d => (
                          <div key={d} style={{ display: "flex", alignItems: "center", gap: 6, background: "#fee2e2", border: "1px solid rgba(192,57,43,.3)", borderRadius: 8, padding: "5px 12px", fontFamily: "var(--mono)", fontSize: 12, color: "#c0392b" }}>
                            🚫 {fmt(d)}
                            <button onClick={() => toggleBlock(d)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c0392b", fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
                          </div>
                        ))}
                      </div>
                    }
                  </div>
                </div>
              )}
            </>
          )}

          {tab === "crews" && (
            <CrewManagement onToast={toast} />
          )}

          {tab === "settings" && (
            <>
              <button
                onClick={() => setTab("dashboard")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--surface)",
                  border: "1.5px solid var(--border)",
                  borderRadius: 10,
                  padding: "10px 16px",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text)",
                  marginBottom: 20,
                  fontFamily: "var(--sans)",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.background = "var(--accent)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "var(--surface)";
                  e.currentTarget.style.color = "var(--text)";
                }}
              >
                <span style={{ fontSize: 16 }}>←</span> Back to Home
              </button>
              <AdminSettings onToast={toast} />
            </>
          )}
        </main>

        <footer style={{
          borderTop: '1px solid var(--border)',
          background: 'white',
          padding: '12px 28px',
          textAlign: 'right',
          fontSize: 10,
          color: '#ccc',
          fontFamily: 'var(--mono)'
        }}>
          @ajeemroslan
        </footer>

        {detail && (
          <div className="overlay" onClick={() => setDetail(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 17, fontWeight: 800 }}>{detail.crew_name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{detail.id} · {detail.submitted_at}</div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div className="status-chip" style={{ background: STATUS_CFG[detail.status].bg, color: STATUS_CFG[detail.status].color }}>
                    {STATUS_CFG[detail.status].icon} {STATUS_CFG[detail.status].label}
                  </div>
                  {detail.status === 'approved' && detail.phone && (adminProfile?.plan || 'free') === 'pro' && (adminProfile?.whatsapp_enabled) && (
                    <div style={{
                      fontSize: 11,
                      color: '#10b981',
                      background: '#d1fae5',
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      ✅ WhatsApp Sent
                    </div>
                  )}
                  <button className="close-btn" onClick={() => setDetail(null)}>×</button>
                </div>
              </div>
              <div className="detail-grid">
                <div className="ditem">
                  <div className="dlbl">Designation</div>
                  <div className="dval">
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      ...getDesignationColor(detail.designation || 'Core Crew')
                    }}>
                      {detail.designation || 'Core Crew'}
                    </span>
                  </div>
                </div>
                <div className="ditem"><div className="dlbl">Phone</div><div className="dval">{detail.phone}</div></div>
                <div className="ditem"><div className="dlbl">Request Type</div><div className="dval">{detail.leave_type}</div></div>
                <div className="ditem"><div className="dlbl">Duration</div><div className="dval">{fmt(detail.date_start)} → {fmt(detail.date_end)} ({daysCount(detail.date_start, detail.date_end)}d)</div></div>
                <div className="ditem" style={{ gridColumn: "1/-1" }}><div className="dlbl">Reason</div><div className="dval" style={{ fontWeight: 400, lineHeight: 1.6 }}>{detail.reason}</div></div>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18, marginTop: 4 }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Manager Response</div>
                <textarea className="respond-note" placeholder="Optional note to crew member…" value={note} onChange={e => setNote(e.target.value)} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
                  <button
                    className={`r-btn r-approve ${detail.status === "approved" ? "r-active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); respond(detail.id, "approved"); }}
                  >
                    ✅ Approve
                  </button>
                  <button
                    className={`r-btn r-deny ${detail.status === "denied" ? "r-active-d" : ""}`}
                    onClick={(e) => { e.stopPropagation(); respond(detail.id, "denied"); }}
                  >
                    ❌ Deny
                  </button>
                  <button
                    className={`r-btn r-pend ${detail.status === "pending" ? "r-active-p" : ""}`}
                    onClick={(e) => { e.stopPropagation(); respond(detail.id, "pending"); }}
                  >
                    ⏳ Pending
                  </button>
                </div>
                {detail.status !== 'pending' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteRequest(detail.id); }}
                    style={{width:"100%",marginTop:12,padding:"11px",background:"#dc2626",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}
                  >
                    <span style={{fontSize:16}}>🗑️</span> Delete Request
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
    );
  }

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
