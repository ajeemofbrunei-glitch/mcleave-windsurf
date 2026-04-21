import type { LeaveRequest, Crew } from '../supabase';

export function exportRequestsToCSV(requests: LeaveRequest[], filename = 'leave_requests.csv') {
  const headers = [
    'Request ID',
    'Crew Name',
    'Designation',
    'Phone',
    'Leave Type',
    'Start Date',
    'End Date',
    'Days',
    'Reason',
    'Status',
    'Submitted At',
    'Responded At',
    'Admin Note'
  ];

  const rows = requests.map(r => {
    const days = calculateDays(r.date_start, r.date_end);
    return [
      r.id,
      r.crew_name,
      r.designation,
      r.phone,
      r.leave_type,
      r.date_start,
      r.date_end,
      days.toString(),
      `"${r.reason.replace(/"/g, '""')}"`,
      r.status,
      r.submitted_at,
      r.responded_at || '',
      `"${(r.admin_note || '').replace(/"/g, '""')}"`
    ];
  });

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  downloadCSV(csv, filename);
}

export function exportCrewToCSV(crews: Crew[], requests: LeaveRequest[], filename = 'crew_database.csv') {
  const headers = [
    'Employee ID',
    'Name',
    'Username',
    'Designation',
    'Phone',
    'Joined Date',
    'Annual Leave Balance',
    'Total Requests',
    'Approved Requests',
    'Denied Requests',
    'Pending Requests'
  ];

  const rows = crews.map(c => {
    const crewRequests = requests.filter(r => r.crew_id === c.id);
    return [
      c.id,
      c.name,
      c.username,
      c.designation,
      c.phone,
      c.joined_at,
      (c.annual_leave_balance || 14).toString(),
      crewRequests.length.toString(),
      crewRequests.filter(r => r.status === 'approved').length.toString(),
      crewRequests.filter(r => r.status === 'denied').length.toString(),
      crewRequests.filter(r => r.status === 'pending').length.toString()
    ];
  });

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  downloadCSV(csv, filename);
}

function calculateDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return ms >= 0 ? Math.round(ms / 86400000) + 1 : 0;
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
