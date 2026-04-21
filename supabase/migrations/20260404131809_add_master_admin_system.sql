/*
  # Add Master Admin System

  ## Overview
  This migration creates a Super Admin (Master Portal) layer that can oversee all 7 store locations
  and manage the entire system infrastructure. The master admin has god-level access to view and
  manage all data across all stores.

  ## New Tables

  ### 1. `system_settings`
  Global system settings for maintenance mode and other system-wide configurations
  - `id` (integer, primary key) - Always 1 (singleton)
  - `maintenance_mode` (boolean) - Whether system is in maintenance mode
  - `maintenance_message` (text) - Message to display during maintenance
  - `updated_at` (timestamptz) - Last update timestamp

  ## Changes to Existing Tables

  ### `admin_profiles`
  - Add `role` (text) - Either 'store_admin' or 'master_admin'
  - Add `store_location` (text) - Store identifier (e.g., 'GADONG', 'JPDT', etc.)
  - Default existing admins to 'store_admin' role

  ## Security

  ### Row Level Security (RLS)
  - Master admin can view ALL data across ALL stores
  - Master admin can update user profiles and reassign stores
  - Store admins continue to see only their own store data
  - System settings can only be modified by master admin

  ## Important Notes
  - Master admin email: masterportal@mcleave.local
  - Master admin bypasses all store_location filters
  - 7 stores: GADONG, JPDT, KIULAP, MULAUT, SERIA, AIRPORT, DELIMA
  - Complete system oversight for the master account
*/

-- Create system_settings table (singleton)
CREATE TABLE IF NOT EXISTS system_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  maintenance_mode boolean DEFAULT false,
  maintenance_message text DEFAULT 'System is currently undergoing maintenance. Please check back later.',
  updated_at timestamptz DEFAULT now()
);

-- Insert default system settings
INSERT INTO system_settings (id, maintenance_mode)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Add role and store_location to admin_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE admin_profiles ADD COLUMN role text DEFAULT 'store_admin';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_profiles' AND column_name = 'store_location'
  ) THEN
    ALTER TABLE admin_profiles ADD COLUMN store_location text;
  END IF;
END $$;

-- Update existing admins to have store_location based on store_name
UPDATE admin_profiles SET store_location = store_name WHERE store_location IS NULL;

-- RLS: Anyone can read system settings
CREATE POLICY "Anyone can view system settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

-- RLS: Only master admin can update system settings
CREATE POLICY "Master admin can update system settings"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid() AND role = 'master_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid() AND role = 'master_admin'
    )
  );

-- Drop existing RLS policies that filter by admin_id to recreate them with master admin bypass
DROP POLICY IF EXISTS "Admins can view own crews" ON crews;
DROP POLICY IF EXISTS "Admins can view their crew" ON crew_members;
DROP POLICY IF EXISTS "Admins can view their store's leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Admins can view own blocked dates" ON blocked_dates;

-- New RLS policies for crews - master admin can see ALL, store admins see only their own
CREATE POLICY "Admins can view crews with master bypass"
  ON crews FOR SELECT
  TO authenticated
  USING (
    admin_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid() AND role = 'master_admin'
    )
  );

-- New RLS policies for crew_members - master admin can see ALL, store admins see only their own
CREATE POLICY "Admins can view crew members with master bypass"
  ON crew_members FOR SELECT
  TO authenticated
  USING (
    admin_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid() AND role = 'master_admin'
    )
  );

-- New RLS policies for leave_requests - master admin can see ALL, store admins see only their own
CREATE POLICY "Admins can view leave requests with master bypass"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (
    admin_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid() AND role = 'master_admin'
    )
  );

-- Master admin can update ANY leave request
CREATE POLICY "Master admin can update all leave requests"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid() AND role = 'master_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid() AND role = 'master_admin'
    )
  );

-- Master admin can update ANY crew member (for reassigning stores)
CREATE POLICY "Master admin can update all crew members"
  ON crew_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid() AND role = 'master_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid() AND role = 'master_admin'
    )
  );

-- Master admin can update ANY admin profile (for reassigning stores)
CREATE POLICY "Master admin can update all admin profiles"
  ON admin_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid() AND role = 'master_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid() AND role = 'master_admin'
    )
  );

-- New RLS policies for blocked_dates - master admin can see ALL, store admins see only their own
CREATE POLICY "Admins can view blocked dates with master bypass"
  ON blocked_dates FOR SELECT
  TO authenticated
  USING (
    admin_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid() AND role = 'master_admin'
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_admin_profiles_role ON admin_profiles(role);
CREATE INDEX IF NOT EXISTS idx_admin_profiles_store_location ON admin_profiles(store_location);

-- Create function to check if user is master admin
CREATE OR REPLACE FUNCTION is_master_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE id = auth.uid() AND role = 'master_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
