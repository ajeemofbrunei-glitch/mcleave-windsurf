/*
  # Fix RLS Performance and Security Issues

  1. Performance Optimizations
    - Replace auth.uid() with (select auth.uid()) in all RLS policies
    - This prevents re-evaluation of auth functions for each row
    - Significantly improves query performance at scale

  2. Index Cleanup
    - Remove unused indexes that add overhead without benefit
    - Keep only indexes that are actively used by queries

  3. Function Security
    - Fix search_path for is_master_admin function to be immutable
    - Prevents potential SQL injection vulnerabilities

  4. Policy Consolidation
    - Multiple permissive policies are intentional for role-based access
    - No changes needed as they provide proper access control
*/

-- Drop all existing policies that need performance fixes
DROP POLICY IF EXISTS "Admins can view crews with master bypass" ON crews;
DROP POLICY IF EXISTS "Admins can update their leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Admins can view leave requests with master bypass" ON leave_requests;
DROP POLICY IF EXISTS "Crew can update their pending requests" ON leave_requests;
DROP POLICY IF EXISTS "Master admin can update all leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Admins can view blocked dates with master bypass" ON blocked_dates;
DROP POLICY IF EXISTS "Crew can view their admin's blocked dates" ON blocked_dates;
DROP POLICY IF EXISTS "Master admin can update all admin profiles" ON admin_profiles;
DROP POLICY IF EXISTS "Admins can view crew members with master bypass" ON crew_members;
DROP POLICY IF EXISTS "Master admin can update all crew members" ON crew_members;
DROP POLICY IF EXISTS "Master admin can update system settings" ON system_settings;

-- Recreate policies with optimized auth function calls
CREATE POLICY "Admins can view crews with master bypass"
  ON crews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = (SELECT auth.uid())
      AND (admin_id = crews.admin_id OR role = 'master_admin')
    )
  );

CREATE POLICY "Admins can update their leave requests"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = (SELECT auth.uid())
      AND admin_id = leave_requests.admin_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = (SELECT auth.uid())
      AND admin_id = leave_requests.admin_id
    )
  );

CREATE POLICY "Admins can view leave requests with master bypass"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = (SELECT auth.uid())
      AND (admin_id = leave_requests.admin_id OR role = 'master_admin')
    )
  );

CREATE POLICY "Crew can update their pending requests"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (
    crew_member_id IN (
      SELECT id FROM crew_members WHERE id = (SELECT auth.uid())
    )
    AND status = 'pending'
  )
  WITH CHECK (
    crew_member_id IN (
      SELECT id FROM crew_members WHERE id = (SELECT auth.uid())
    )
    AND status = 'pending'
  );

CREATE POLICY "Master admin can update all leave requests"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'master_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'master_admin'
    )
  );

CREATE POLICY "Admins can view blocked dates with master bypass"
  ON blocked_dates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = (SELECT auth.uid())
      AND (admin_id = blocked_dates.admin_id OR role = 'master_admin')
    )
  );

CREATE POLICY "Crew can view their admin's blocked dates"
  ON blocked_dates FOR SELECT
  TO authenticated
  USING (
    admin_id IN (
      SELECT admin_id FROM crew_members WHERE id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Master admin can update all admin profiles"
  ON admin_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles admin_profiles_1
      WHERE admin_profiles_1.id = (SELECT auth.uid())
      AND admin_profiles_1.role = 'master_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles admin_profiles_1
      WHERE admin_profiles_1.id = (SELECT auth.uid())
      AND admin_profiles_1.role = 'master_admin'
    )
  );

CREATE POLICY "Admins can view crew members with master bypass"
  ON crew_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = (SELECT auth.uid())
      AND (admin_id = crew_members.admin_id OR role = 'master_admin')
    )
  );

CREATE POLICY "Master admin can update all crew members"
  ON crew_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'master_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'master_admin'
    )
  );

CREATE POLICY "Master admin can update system settings"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'master_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'master_admin'
    )
  );

-- Remove unused indexes
DROP INDEX IF EXISTS idx_blocked_dates_admin_id;
DROP INDEX IF EXISTS idx_crews_admin_id;
DROP INDEX IF EXISTS idx_leave_requests_admin_id;
DROP INDEX IF EXISTS idx_crews_user_id;
DROP INDEX IF EXISTS idx_leave_requests_crew_member_id;
DROP INDEX IF EXISTS idx_leave_requests_crew_id;
DROP INDEX IF EXISTS idx_admin_profiles_role;
DROP INDEX IF EXISTS idx_admin_profiles_store_location;

-- Fix is_master_admin function with immutable search_path
DROP FUNCTION IF EXISTS is_master_admin();

CREATE OR REPLACE FUNCTION is_master_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE id = auth.uid()
    AND role = 'master_admin'
    AND is_active = true
  );
$$;