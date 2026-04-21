const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Helper function to get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

// Helper function to make API calls with auth
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add custom headers from options
  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

// Interfaces
export interface Crew {
  id: string;
  name: string;
  username: string;
  phone: string;
  designation: string;
  password?: string;
  joined_at: string;
  annual_leave_balance?: number;
  leave_year?: number;
  admin_id?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface LeaveRequest {
  id: string;
  crew_id: string;
  crew_name: string;
  phone: string;
  designation: string;
  leave_type: string;
  date_start: string;
  date_end: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  submitted_at: string;
  responded_at: string | null;
  admin_note: string;
  admin_id?: string;
  year?: number;
  created_at?: string;
}

export interface BlockedDate {
  id: string;
  date: string;
  admin_id: string;
  created_at?: string;
}

export interface AdminProfile {
  id: string;
  email: string;
  password?: string;
  store_name: string;
  store_location?: string;
  role?: 'store_admin' | 'master_admin';
  plan?: 'free' | 'pro';
  whatsapp_enabled?: boolean;
  is_active?: boolean;
  created_at?: string;
}

export interface User {
  id: string;
  email?: string;
  username?: string;
  role: string;
}

// Auth API
export const authApi = {
  signIn: async (email: string, password: string, type: 'admin' | 'crew') => {
    return apiCall('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password, type }),
    });
  },

  signUp: async (email: string, password: string, storeName: string, type: 'admin') => {
    return apiCall('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, storeName, type }),
    });
  },
};

// Admin API
export const adminApi = {
  getProfileByEmail: async (email: string): Promise<AdminProfile | null> => {
    try {
      const admins = await apiCall('/admin/profiles');
      return admins.find((a: AdminProfile) => a.email === email) || null;
    } catch {
      return null;
    }
  },

  createAdmin: async (admin: Omit<AdminProfile, 'created_at'>): Promise<AdminProfile> => {
    return apiCall('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ ...admin, type: 'admin' }),
    });
  },

  updateAdmin: async (id: string, updates: Partial<AdminProfile>): Promise<void> => {
    await apiCall(`/admin/profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  getAllAdmins: async (): Promise<AdminProfile[]> => {
    return apiCall('/admin/profiles');
  },

  getMaintenanceMode: async (id: string): Promise<boolean> => {
    const data = await apiCall(`/admin/${id}/maintenance-mode`);
    return data.maintenanceMode;
  },

  setMaintenanceMode: async (id: string, enabled: boolean): Promise<void> => {
    await apiCall(`/admin/${id}/maintenance-mode`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    });
  },

  resetPassword: async (userId: string, newPassword: string, currentPassword?: string): Promise<void> => {
    await apiCall('/admin/reset-password', {
      method: 'POST',
      body: JSON.stringify({ userId, newPassword, currentPassword }),
    });
  },
};

// Crew API
export const crewApi = {
  getCrewByUsername: async (username: string): Promise<Crew | null> => {
    try {
      const crews = await apiCall('/crews');
      return crews.find((c: Crew) => c.username === username) || null;
    } catch {
      return null;
    }
  },

  createCrew: async (crew: Omit<Crew, 'created_at'>): Promise<Crew> => {
    return apiCall('/crews', {
      method: 'POST',
      body: JSON.stringify(crew),
    });
  },

  getCrewsByAdmin: async (adminId: string): Promise<Crew[]> => {
    return apiCall(`/crews?adminId=${adminId}`);
  },

  updateCrew: async (id: string, updates: Partial<Crew>): Promise<void> => {
    await apiCall(`/crews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  deleteCrew: async (id: string): Promise<void> => {
    await apiCall(`/crews/${id}`, {
      method: 'DELETE',
    });
  },
};

// Leave Request API
export const leaveRequestApi = {
  getLeaveRequestsByAdmin: async (adminId: string): Promise<LeaveRequest[]> => {
    return apiCall(`/leave-requests?adminId=${adminId}`);
  },

  getLeaveRequestsByCrew: async (crewId: string): Promise<LeaveRequest[]> => {
    return apiCall(`/leave-requests?crewId=${crewId}`);
  },

  createLeaveRequest: async (request: Omit<LeaveRequest, 'created_at'>): Promise<LeaveRequest> => {
    return apiCall('/leave-requests', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  updateLeaveRequest: async (id: string, updates: Partial<LeaveRequest>): Promise<void> => {
    await apiCall(`/leave-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  deleteLeaveRequest: async (id: string): Promise<void> => {
    await apiCall(`/leave-requests/${id}`, {
      method: 'DELETE',
    });
  },
};

// Blocked Dates API
export const blockedDateApi = {
  getBlockedDatesByAdmin: async (adminId: string): Promise<BlockedDate[]> => {
    return apiCall(`/blocked-dates?adminId=${adminId}`);
  },

  createBlockedDate: async (blockedDate: Omit<BlockedDate, 'created_at'>): Promise<BlockedDate> => {
    return apiCall('/blocked-dates', {
      method: 'POST',
      body: JSON.stringify(blockedDate),
    });
  },

  deleteBlockedDate: async (date: string, adminId: string): Promise<void> => {
    await apiCall(`/blocked-dates?date=${date}&adminId=${adminId}`, {
      method: 'DELETE',
    });
  },
};

// System Settings API
export const systemApi = {
  getMaintenanceMode: async (): Promise<boolean> => {
    const data = await apiCall('/system/maintenance-mode');
    return data.maintenanceMode;
  },

  setMaintenanceMode: async (enabled: boolean): Promise<void> => {
    await apiCall('/system/maintenance-mode', {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    });
  },

  getReports: async (): Promise<any> => {
    return apiCall('/reports');
  },
};
