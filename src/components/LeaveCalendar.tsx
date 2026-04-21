import { useState, useEffect } from 'react';

interface LeaveRequest {
  id: string;
  leave_type: string;
  date_start: string;
  date_end: string;
  status: string;
  crew_name?: string;
}

interface LeaveCalendarProps {
  requests: LeaveRequest[];
}

export function LeaveCalendar({ requests }: LeaveCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);

  useEffect(() => {
    generateCalendar();
  }, [currentDate]);

  function generateCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startPadding = firstDay.getDay();
    const days: Date[] = [];

    for (let i = startPadding - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    const endPadding = 42 - days.length;
    for (let i = 1; i <= endPadding; i++) {
      days.push(new Date(year, month + 1, i));
    }

    setCalendarDays(days);
  }

  function getLeaveForDate(date: Date): LeaveRequest | null {
    const dateStr = date.toISOString().split('T')[0];
    return requests.find(req => {
      const start = new Date(req.date_start);
      const end = new Date(req.date_end);
      const current = new Date(dateStr);
      return current >= start && current <= end && req.status === 'approved';
    }) || null;
  }

  function prevMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  }

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const STATUS_COLORS = {
    'Off Day': '#3b82f6',
    'Annual Leave': '#22c55e',
    'Morning Shift': '#f59e0b',
    'Afternoon Shift': '#ef4444',
    'Birthday Leave': '#a855f7'
  };

  return (
    <div style={{
      background: 'var(--surface)',
      border: '2px solid var(--border)',
      borderRadius: 18,
      padding: '20px',
      marginBottom: 24
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <h2 style={{
          fontFamily: 'var(--mono)',
          fontSize: 20,
          fontWeight: 800,
          color: 'var(--text)',
          margin: 0
        }}>
          Leave Calendar
        </h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={prevMonth}
            style={{
              background: 'var(--bg)',
              border: '2px solid var(--border)',
              borderRadius: 8,
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600
            }}
          >
            ← Prev
          </button>
          <span style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--text)',
            minWidth: '140px',
            textAlign: 'center'
          }}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button
            onClick={nextMonth}
            style={{
              background: 'var(--bg)',
              border: '2px solid var(--border)',
              borderRadius: 8,
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600
            }}
          >
            Next →
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '8px',
        marginBottom: '8px'
      }}>
        {dayNames.map(day => (
          <div
            key={day}
            style={{
              textAlign: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--muted)',
              padding: '8px 0'
            }}
          >
            {day}
          </div>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '8px'
      }}>
        {calendarDays.map((day, idx) => {
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = day.toDateString() === new Date().toDateString();
          const leave = getLeaveForDate(day);

          return (
            <div
              key={idx}
              style={{
                aspectRatio: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: isToday ? '2px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: 8,
                background: leave
                  ? STATUS_COLORS[leave.leave_type as keyof typeof STATUS_COLORS] || 'var(--accent)'
                  : isCurrentMonth ? 'var(--bg)' : 'transparent',
                color: leave
                  ? '#fff'
                  : isCurrentMonth ? 'var(--text)' : 'var(--muted)',
                opacity: isCurrentMonth ? 1 : 0.4,
                fontSize: 14,
                fontWeight: leave ? 700 : 500,
                cursor: leave ? 'pointer' : 'default',
                position: 'relative',
                padding: '4px'
              }}
              title={leave ? `${leave.leave_type}` : ''}
            >
              <span>{day.getDate()}</span>
              {leave && (
                <span style={{
                  fontSize: 10,
                  marginTop: 2,
                  textAlign: 'center',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '100%'
                }}>
                  {leave.leave_type.split(' ')[0]}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 20,
        padding: '16px',
        background: 'var(--bg)',
        borderRadius: 12,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px'
      }}>
        {Object.entries(STATUS_COLORS).map(([type, color]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              background: color
            }} />
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
