/*
  # Fix Security and Performance Issues

  1. Performance Optimizations
    - Add missing index on `leave_requests.crew_id` (foreign key without covering index)
    - Remove unused indexes that were added for admin_id columns but never used

  2. Security Enhancements
    - Add restrictive RLS policies for `admin_credentials` table
    - Since this is a legacy table (system now uses admin_profiles + auth.users), 
      we'll lock it down completely to prevent any access

  3. Important Notes
    - Auth DB connection strategy: Cannot be changed via SQL (Dashboard setting only)
    - Leaked password protection: Cannot be changed via SQL (Dashboard setting only)
    - These settings need to be configured in Supabase Dashboard under:
      * Database Settings > Connection Pooling > Switch to percentage-based
      * Auth Settings > Security > Enable "Check for compromised passwords"
*/

-- ====================================
-- PERFORMANCE: Add missing index
-- ====================================

-- Add index for leave_requests.crew_id foreign key (improves JOIN performance)
CREATE INDEX IF NOT EXISTS idx_leave_requests_crew_id 
  ON leave_requests(crew_id);

-- ====================================
-- CLEANUP: Remove unused indexes
-- ====================================

-- These indexes on admin_id columns exist but are not being used
-- Removing them reduces storage and improves write performance
DROP INDEX IF EXISTS idx_blocked_dates_admin_id;
DROP INDEX IF EXISTS idx_crews_admin_id;
DROP INDEX IF EXISTS idx_leave_requests_admin_id;

-- ====================================
-- SECURITY: Lock down admin_credentials
-- ====================================

-- The admin_credentials table is legacy and should not be accessible
-- Modern system uses admin_profiles (linked to auth.users) instead
-- Adding restrictive policies to prevent any access

-- Drop any existing policies
DROP POLICY IF EXISTS "Admins can read own credentials" ON admin_credentials;
DROP POLICY IF EXISTS "No access to admin credentials" ON admin_credentials;

-- Create a highly restrictive policy that denies all access
-- This effectively locks the table while keeping RLS enabled
CREATE POLICY "No access to admin credentials"
  ON admin_credentials
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Also deny access to anonymous users
CREATE POLICY "No anonymous access to admin credentials"
  ON admin_credentials
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);
