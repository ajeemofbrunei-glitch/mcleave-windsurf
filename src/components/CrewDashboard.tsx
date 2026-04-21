import { useState, useEffect } from 'react';
import { leaveRequestApi, crewApi, blockedDateApi } from '../api';
import { useAuth } from '../contexts/AuthContext';

interface CrewMember {
  id: string;
  admin_id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  designation: string;
}

interface LeaveRequest {
  id: string;
  crew_name: string;
  leave_type: string;
  date_start: string;
  date_end: string;
  reason: string;
  status: string;
  submitted_at: string;
}

const LEAVE_TYPES = ["Off Day", "Annual Leave", "Morning Shift", "Afternoon Shift", "Birthday Leave"];

function todayStr() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
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

function Calendar({ blockedDates = [], onRangeChange, selectedStart, selectedEnd }: {
  blockedDates?: string[];
  onRangeChange?: (start: string | null, end: string | null) => void;
  selectedStart?: string;
  selectedEnd?: string;
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
              cursor: blocked ? "not-allowed" : "pointer",
              background: blocked ? "rgba(192,57,43,.15)" : selected ? "var(--accent)" : isToday ? "rgba(255,199,44,.25)" : "transparent",
              color: blocked ? "#c0392b" : selected ? "#fff" : isToday ? "#b45309" : "var(--text)",
              fontWeight: (isToday || selected) ? 700 : 400,
              textDecoration: blocked ? "line-through" : "none",
              transition: "all .12s",
              pointerEvents: blocked ? "none" : "auto"
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

const Arches = ({ size = 32, color = "#FFC72C" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 100 80" fill="none">
    <path d="M10 70 Q10 10 30 10 Q50 10 50 40 Q50 10 70 10 Q90 10 90 70" stroke={color} strokeWidth="14" strokeLinecap="round" fill="none" />
  </svg>
);

export function CrewDashboard({ onLogout, onToast }: {
  onLogout: () => void;
  onToast: (title: string, msg: string, type: string, icon: string) => void;
}) {
  const { user } = useAuth();
  const [crewProfile, setCrewProfile] = useState<CrewMember | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [newRequest, setNewRequest] = useState({
    leave_type: LEAVE_TYPES[0],
    start_date: '',
    end_date: '',
    reason: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    if (!user) return;

    try {
      // Get crew profile by username
      const profile = await crewApi.getCrewByUsername(user.username || '');

      if (profile) {
        setCrewProfile(profile as unknown as CrewMember);

        // Get leave requests for this crew member
        const leaveRequests = await leaveRequestApi.getLeaveRequestsByCrew(user.id);
        setRequests(leaveRequests || []);

        // Get blocked dates for this admin
        const blockedData = await blockedDateApi.getBlockedDatesByAdmin(profile.admin_id || '');
        if (blockedData) {
          setBlockedDates(blockedData.map((b: { date: string }) => b.date));
        }
      }
    } catch (error) {
      console.error('Error loading crew data:', error);
    }

    setLoading(false);
  }

  async function submitLeaveRequest() {
    if (!user || !crewProfile) return;

    if (!newRequest.start_date || !newRequest.end_date || !newRequest.reason.trim()) {
      onToast('Error', 'Please fill in all fields', 'denied', '❌');
      return;
    }

    if (new Date(newRequest.end_date) < new Date(newRequest.start_date)) {
      onToast('Error', 'End date must be after start date', 'denied', '❌');
      return;
    }

    const requestDates: string[] = [];
    const start = new Date(newRequest.start_date);
    const end = new Date(newRequest.end_date);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      requestDates.push(dateStr);
    }

    const hasBlockedDate = requestDates.some(date => blockedDates.includes(date));
    if (hasBlockedDate) {
      onToast('Error', 'Your selected dates include blocked dates', 'denied', '❌');
      return;
    }

    setLoading(true);

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = bruneiTime();

    try {
      await leaveRequestApi.createLeaveRequest({
        id: requestId,
        crew_id: user.id,
        crew_name: crewProfile.name,
        phone: crewProfile.phone || '',
        designation: crewProfile.designation || 'Core Crew',
        leave_type: newRequest.leave_type,
        date_start: newRequest.start_date,
        date_end: newRequest.end_date,
        reason: newRequest.reason,
        status: 'pending',
        submitted_at: now,
        responded_at: null,
        admin_note: '',
        admin_id: crewProfile.admin_id
      });

      setLoading(false);
      onToast('Success', 'Leave request submitted', 'success', '✅');
      setNewRequest({ leave_type: LEAVE_TYPES[0], start_date: '', end_date: '', reason: '' });
      setShowNewRequestForm(false);
      loadData();
    } catch (error: any) {
      setLoading(false);
      onToast('Error', error.message || 'Failed to submit request', 'denied', '❌');
    }
  }

  async function cancelRequest(id: string) {
    if (!confirm('Cancel this leave request?')) return;

    try {
      await leaveRequestApi.deleteLeaveRequest(id);
      onToast('Success', 'Request cancelled', 'success', '✅');
      loadData();
    } catch (error: any) {
      onToast('Error', error.message || 'Failed to cancel request', 'denied', '❌');
    }
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '16px' }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #DA291C 0%, #b71c1c 100%)',
          borderRadius: 20,
          padding: '24px',
          marginBottom: 24,
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Arches size={48} />
            <div style={{ flex: 1, minWidth: '200px' }}>
              <h1 style={{
                fontFamily: 'Impact, var(--mono), sans-serif',
                fontSize: 'clamp(20px, 5vw, 32px)',
                fontWeight: 900,
                margin: 0,
                letterSpacing: 2
              }}>
                Welcome, {crewProfile?.name}
              </h1>
              <p style={{ fontSize: 'clamp(13px, 3vw, 15px)', opacity: 0.9, margin: '8px 0 0 0' }}>
                Manage your leave requests
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: '#fff',
              border: '2px solid rgba(255,255,255,0.3)',
              borderRadius: 12,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--sans)',
              alignSelf: 'flex-start'
            }}
          >
            Logout
          </button>
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '2px solid var(--border)',
          borderRadius: 18,
          padding: '20px',
          marginBottom: 24
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 16
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #DA291C 0%, #b71c1c 100%)',
              borderRadius: 14,
              padding: '20px',
              color: '#fff',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
                {requests.length}
              </div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>Total Requests</div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              borderRadius: 14,
              padding: '20px',
              color: '#fff',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
                {requests.filter(r => r.status === 'pending').length}
              </div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>Pending</div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: 14,
              padding: '20px',
              color: '#fff',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
                {requests.filter(r => r.status === 'approved').length}
              </div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>Approved</div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #c0392b 0%, #992d22 100%)',
              borderRadius: 14,
              padding: '20px',
              color: '#fff',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
                {requests.filter(r => r.status === 'denied').length}
              </div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>Denied</div>
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '2px solid var(--border)',
          borderRadius: 18,
          padding: '20px',
          marginBottom: 24
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{
              fontFamily: 'var(--mono)',
              fontSize: 'clamp(16px, 4vw, 20px)',
              fontWeight: 800,
              color: 'var(--text)',
              margin: 0
            }}>
              My Leave Requests
            </h2>
            <button
              onClick={() => setShowNewRequestForm(!showNewRequestForm)}
              style={{
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'var(--sans)'
              }}
            >
              {showNewRequestForm ? '✕ Cancel' : '+ New Request'}
            </button>
          </div>

          {showNewRequestForm && (
            <div style={{
              background: 'var(--bg)',
              padding: 24,
              borderRadius: 12,
              marginBottom: 24
            }}>
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--muted)',
                    marginBottom: 8
                  }}>
                    Leave Type
                  </label>
                  <select
                    value={newRequest.leave_type}
                    onChange={e => setNewRequest({ ...newRequest, leave_type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid var(--border)',
                      borderRadius: 10,
                      fontSize: 15,
                      fontFamily: 'var(--sans)',
                      outline: 'none'
                    }}
                  >
                    {LEAVE_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--muted)',
                    marginBottom: 8
                  }}>
                    Select Date Range
                  </label>
                  <Calendar
                    blockedDates={blockedDates}
                    selectedStart={newRequest.start_date}
                    selectedEnd={newRequest.end_date}
                    onRangeChange={(start, end) => {
                      setNewRequest({ ...newRequest, start_date: start || '', end_date: end || '' });
                    }}
                  />
                </div>

                {blockedDates.length > 0 && (
                  <div style={{
                    background: '#fee2e2',
                    border: '1px solid #fca5a5',
                    borderRadius: 10,
                    padding: '12px 16px',
                    fontSize: 13,
                    color: '#991b1b'
                  }}>
                    <strong>🚫 Note:</strong> Dates marked in red are blocked by management and cannot be selected.
                  </div>
                )}

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--muted)',
                    marginBottom: 8
                  }}>
                    Reason
                  </label>
                  <textarea
                    value={newRequest.reason}
                    onChange={e => setNewRequest({ ...newRequest, reason: e.target.value })}
                    placeholder="Why do you need this leave?"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid var(--border)',
                      borderRadius: 10,
                      fontSize: 15,
                      fontFamily: 'var(--sans)',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <button
                  onClick={submitLeaveRequest}
                  disabled={loading}
                  style={{
                    background: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '12px 24px',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    fontFamily: 'var(--sans)'
                  }}
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          )}

          {requests.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <p style={{ color: 'var(--muted)', margin: 0 }}>
                No leave requests yet. Submit your first request above.
              </p>
            </div>
          ) : (
            <>
              <div className="desktop-table" style={{ overflowX: 'auto', display: 'none' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      <th style={{ padding: 16, textAlign: 'left', fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>TYPE</th>
                      <th style={{ padding: 16, textAlign: 'left', fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>DATES</th>
                      <th style={{ padding: 16, textAlign: 'left', fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>REASON</th>
                      <th style={{ padding: 16, textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>STATUS</th>
                      <th style={{ padding: 16, textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map(req => {
                      const cfg = STATUS_CFG[req.status as keyof typeof STATUS_CFG];
                      return (
                        <tr key={req.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: 16, fontWeight: 600 }}>{req.leave_type}</td>
                          <td style={{ padding: 16, color: 'var(--muted)' }}>
                            {fmt(req.date_start)} - {fmt(req.date_end)}
                          </td>
                          <td style={{ padding: 16, color: 'var(--muted)' }}>{req.reason}</td>
                          <td style={{ padding: 16, textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 700,
                              background: cfg.bg,
                              color: cfg.color
                            }}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </td>
                          <td style={{ padding: 16, textAlign: 'right' }}>
                            {req.status === 'pending' && (
                              <button
                                onClick={() => cancelRequest(req.id)}
                                style={{
                                  background: '#fee2e2',
                                  border: 'none',
                                  borderRadius: 8,
                                  padding: '6px 12px',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  color: '#991b1b'
                                }}
                              >
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mobile-cards">
                {requests.map(req => {
                  const cfg = STATUS_CFG[req.status as keyof typeof STATUS_CFG];
                  return (
                    <div key={req.id} style={{
                      background: 'var(--bg)',
                      border: '2px solid var(--border)',
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 12
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontWeight: 700, fontSize: 16 }}>{req.leave_type}</span>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 700,
                          background: cfg.bg,
                          color: cfg.color
                        }}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>
                        📅 {fmt(req.date_start)} - {fmt(req.date_end)}
                      </div>
                      <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 12 }}>
                        💬 {req.reason}
                      </div>
                      {req.status === 'pending' && (
                        <button
                          onClick={() => cancelRequest(req.id)}
                          style={{
                            background: '#fee2e2',
                            border: 'none',
                            borderRadius: 8,
                            padding: '8px 16px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            color: '#991b1b',
                            width: '100%'
                          }}
                        >
                          Cancel Request
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
