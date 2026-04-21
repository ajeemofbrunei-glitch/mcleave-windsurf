import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface Crew {
  id: string;
  name: string;
  username: string;
  phone: string;
  designation: string;
  joined_at: string;
  annual_leave_balance?: number;
  leave_year?: number;
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
  year?: number;
  created_at?: string;
}

export interface BlockedDate {
  id?: string;
  date: string;
  created_at?: string;
}

export interface AdminCredentials {
  id: number;
  username: string;
  password: string;
  updated_at?: string;
}

export interface AdminProfile {
  id: string;
  email: string;
  store_name: string;
  store_location?: string;
  role?: 'store_admin' | 'master_admin';
  plan?: 'free' | 'pro';
  whatsapp_enabled?: boolean;
  created_at?: string;
}
