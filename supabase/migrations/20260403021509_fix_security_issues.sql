/*
  # Fix Security and Performance Issues

  1. Security Fixes
    - Remove ALL insecure "Public can *" policies that bypass RLS
    - These policies allow unrestricted access and completely defeat row-level security
    - Only admin-scoped policies with proper auth checks will remain

  2. Performance Optimizations
    - Add indexes for all foreign key columns (admin_id)
    - Optimize RLS policies to use (select auth.uid()) instead of auth.uid()
    - This prevents re-evaluation for each row and improves query performance

  3. Cleanup
    - Remove unused indexes from old schema (store_id columns that no longer exist)
    - Remove admin_credentials table indexes (legacy table)

  ## CRITICAL SECURITY NOTES
  - The "Public can *" policies were allowing ANYONE to read/modify/delete ANY data
  - This migration removes those dangerous policies
  - Only authenticated admins can access their own data now
*/

-- ================================================================
-- STEP 1: DROP ALL INSECURE PUBLIC POLICIES
-- ================================================================

-- Drop insecure policies on admin_credentials
DROP POLICY IF EXISTS "Public can update admin_credentials" ON admin_credentials;
DROP POLICY IF EXISTS "Public can read admin_credentials" ON admin_credentials;

-- Drop insecure policies on blocked_dates
DROP POLICY IF EXISTS "Public can delete blocked_dates" ON blocked_dates;
DROP POLICY IF EXISTS "Public can insert blocked_dates" ON blocked_dates;
DROP POLICY IF EXISTS "Public can read blocked_dates" ON blocked_dates;

-- Drop insecure policies on crews
DROP POLICY IF EXISTS "Public can delete crews" ON crews;
DROP POLICY IF EXISTS "Public can insert crews" ON crews;
DROP POLICY IF EXISTS "Public can update crews" ON crews;
DROP POLICY IF EXISTS "Public can read crews" ON crews;

-- Drop insecure policies on leave_requests
DROP POLICY IF EXISTS "Public can delete leave_requests" ON leave_requests;
DROP POLICY IF EXISTS "Public can insert leave_requests" ON leave_requests;
DROP POLICY IF EXISTS "Public can update leave_requests" ON leave_requests;
DROP POLICY IF EXISTS "Public can read leave_requests" ON leave_requests;

-- ================================================================
-- STEP 2: ADD INDEXES FOR FOREIGN KEYS (Performance)
-- ================================================================

-- Index for blocked_dates.admin_id foreign key
CREATE INDEX IF NOT EXISTS idx_blocked_dates_admin_id 
  ON blocked_dates(admin_id);

-- Index for crews.admin_id foreign key
CREATE INDEX IF NOT EXISTS idx_crews_admin_id 
  ON crews(admin_id);

-- Index for leave_requests.admin_id foreign key
CREATE INDEX IF NOT EXISTS idx_leave_requests_admin_id 
  ON leave_requests(admin_id);

-- ================================================================
-- STEP 3: OPTIMIZE RLS POLICIES (Performance)
-- ================================================================

-- Drop existing admin policies to recreate with optimized syntax
DROP POLICY IF EXISTS "Admins can view own profile" ON admin_profiles;
DROP POLICY IF EXISTS "Admins can insert own profile" ON admin_profiles;
DROP POLICY IF EXISTS "Admins can update own profile" ON admin_profiles;

DROP POLICY IF EXISTS "Admins can view own crews" ON crews;
DROP POLICY IF EXISTS "Admins can insert own crews" ON crews;
DROP POLICY IF EXISTS "Admins can update own crews" ON crews;
DROP POLICY IF EXISTS "Admins can delete own crews" ON crews;

DROP POLICY IF EXISTS "Admins can view own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Admins can insert own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Admins can update own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Admins can delete own leave requests" ON leave_requests;

DROP POLICY IF EXISTS "Admins can view own blocked dates" ON blocked_dates;
DROP POLICY IF EXISTS "Admins can insert own blocked dates" ON blocked_dates;
DROP POLICY IF EXISTS "Admins can delete own blocked dates" ON blocked_dates;

-- Recreate admin_profiles policies with optimized auth check
CREATE POLICY "Admins can view own profile"
  ON admin_profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "Admins can insert own profile"
  ON admin_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Admins can update own profile"
  ON admin_profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- Recreate crews policies with optimized auth check
CREATE POLICY "Admins can view own crews"
  ON crews FOR SELECT
  TO authenticated
  USING (admin_id = (select auth.uid()));

CREATE POLICY "Admins can insert own crews"
  ON crews FOR INSERT
  TO authenticated
  WITH CHECK (admin_id = (select auth.uid()));

CREATE POLICY "Admins can update own crews"
  ON crews FOR UPDATE
  TO authenticated
  USING (admin_id = (select auth.uid()))
  WITH CHECK (admin_id = (select auth.uid()));

CREATE POLICY "Admins can delete own crews"
  ON crews FOR DELETE
  TO authenticated
  USING (admin_id = (select auth.uid()));

-- Recreate leave_requests policies with optimized auth check
CREATE POLICY "Admins can view own leave requests"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (admin_id = (select auth.uid()));

CREATE POLICY "Admins can insert own leave requests"
  ON leave_requests FOR INSERT
  TO authenticated
  WITH CHECK (admin_id = (select auth.uid()));

CREATE POLICY "Admins can update own leave requests"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (admin_id = (select auth.uid()))
  WITH CHECK (admin_id = (select auth.uid()));

CREATE POLICY "Admins can delete own leave requests"
  ON leave_requests FOR DELETE
  TO authenticated
  USING (admin_id = (select auth.uid()));

-- Recreate blocked_dates policies with optimized auth check
CREATE POLICY "Admins can view own blocked dates"
  ON blocked_dates FOR SELECT
  TO authenticated
  USING (admin_id = (select auth.uid()));

CREATE POLICY "Admins can insert own blocked dates"
  ON blocked_dates FOR INSERT
  TO authenticated
  WITH CHECK (admin_id = (select auth.uid()));

CREATE POLICY "Admins can delete own blocked dates"
  ON blocked_dates FOR DELETE
  TO authenticated
  USING (admin_id = (select auth.uid()));

-- ================================================================
-- STEP 4: CLEANUP UNUSED INDEXES
-- ================================================================

-- Remove unused indexes from old schema (store_id columns don't exist anymore)
DROP INDEX IF EXISTS idx_crews_store_id;
DROP INDEX IF EXISTS idx_leave_requests_store_id;
DROP INDEX IF EXISTS idx_blocked_dates_store_id;

-- Remove unused index from legacy admin_credentials table
DROP INDEX IF EXISTS idx_admin_credentials_username;

-- Remove unused indexes that are not being used
DROP INDEX IF EXISTS idx_leave_requests_crew_id;
DROP INDEX IF EXISTS idx_leave_requests_status;
DROP INDEX IF EXISTS idx_blocked_dates_date;
