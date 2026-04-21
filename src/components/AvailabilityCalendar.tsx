import { useState } from 'react';
import type { LeaveRequest, Crew } from '../supabase';

interface AvailabilityCalendarProps {
  crews: Crew[];
  requests: LeaveRequest[];
}

export function AvailabilityCalendar({ requests }: AvailabilityCalendarProps) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const monthLabel = new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long' });

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  }

  function getOnLeave(day: number): LeaveRequest[] {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return requests.filter(r => {
      return r.status === 'approved' && r.date_start <= dateStr && r.date_end >= dateStr;
    });
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="form-card" style={{ maxWidth: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div className="form-title">📅 Crew Availability Calendar</div>
          <div className="form-sub">See who's on leave each day</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={prevMonth}
            style={{
              background: 'var(--surface)',
              border: '1.5px solid var(--border)',
              borderRadius: 8,
              padding: '6px 14px',
              cursor: 'pointer',
              color: 'var(--text)',
              fontSize: 16,
            }}
          >
            ‹
          </button>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--accent)',
              minWidth: 140,
              textAlign: 'center',
            }}
          >
            {monthLabel} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            style={{
              background: 'var(--surface)',
              border: '1.5px solid var(--border)',
              borderRadius: 8,
              padding: '6px 14px',
              cursor: 'pointer',
              color: 'var(--text)',
              fontSize: 16,
            }}
          >
            ›
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div
            key={day}
            style={{
              textAlign: 'center',
              fontSize: 10,
              color: 'var(--muted)',
              fontFamily: 'var(--mono)',
              fontWeight: 700,
              padding: '6px 0',
            }}
          >
            {day}
          </div>
        ))}

        {cells.map((day, i) => {
          if (!day)
            return (
              <div
                key={`empty-${i}`}
                style={{
                  background: 'transparent',
                  minHeight: 70,
                }}
              />
            );

          const onLeave = getOnLeave(day);
          const isToday =
            day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();

          return (
            <div
              key={day}
              style={{
                background: isToday ? 'var(--accent-light)' : 'var(--card)',
                border: `1.5px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 10,
                padding: 8,
                minHeight: 70,
                position: 'relative',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: isToday ? 700 : 600,
                  color: isToday ? 'var(--accent)' : 'var(--text)',
                  marginBottom: 4,
                }}
              >
                {day}
              </div>
              {onLeave.length > 0 && (
                <div
                  style={{
                    fontSize: 9,
                    color: 'var(--muted)',
                    lineHeight: 1.3,
                  }}
                >
                  {onLeave.slice(0, 2).map(r => (
                    <div
                      key={r.id}
                      style={{
                        background: 'rgba(192, 57, 43, 0.1)',
                        borderRadius: 4,
                        padding: '2px 4px',
                        marginBottom: 2,
                        fontSize: 8,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={r.crew_name}
                    >
                      {r.crew_name}
                    </div>
                  ))}
                  {onLeave.length > 2 && (
                    <div style={{ fontSize: 8, color: 'var(--accent)', fontWeight: 700 }}>
                      +{onLeave.length - 2} more
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
        {requests.filter(r => r.status === 'approved').length} total approved leaves
      </div>
    </div>
  );
}
