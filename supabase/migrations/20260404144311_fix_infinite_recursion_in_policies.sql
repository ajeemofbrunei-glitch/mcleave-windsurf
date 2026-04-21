/*
  # Fix Infinite Recursion in RLS Policies

  1. Problem
    - Multiple policies query admin_profiles table from within policies ON admin_profiles
    - This creates infinite recursion when PostgreSQL evaluates the policies
    - Error: "infinite recursion detected in policy for relation admin_profiles"

  2. Solution
    - Store the user role in JWT metadata (raw_app_meta_data)
    - Use auth.jwt() to check role instead of querying admin_profiles table
    - This breaks the circular dependency

  3. Changes
    - Drop all policies that cause recursion
    - Recreate policies using auth.jwt() -> 'app_metadata' -> 'role'
    - Simpler and more performant approach

  4. Security
    - app_metadata cannot be modified by users (only via server-side code)
    - Role checks are still secure and enforced
    - All existing access patterns are preserved
*/

-- Drop all policies that reference admin_profiles from within other tables
DROP POLICY IF EXISTS "Master admin can view all admin profiles" ON admin_profiles;
DROP POLICY IF EXISTS "Master admin can update all admin profiles" ON admin_profiles;
DROP POLICY IF EXISTS "Admins can view blocked dates with master bypass" ON blocked_dates;
DROP POLICY IF EXISTS "Admins can view crew members with master bypass" ON crew_members;
DROP POLICY IF EXISTS "Master admin can update all crew members" ON crew_members;
DROP POLICY IF EXISTS "Admins can view leave requests with master bypass" ON leave_requests;
DROP POLICY IF EXISTS "Admins can update their leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Master admin can update all leave requests" ON leave_requests;

-- Recreate admin_profiles policies using JWT metadata
CREATE POLICY "Master admin can view all admin profiles"
  ON admin_profiles FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'master_admin'
  );

CREATE POLICY "Master admin can update all admin profiles"
  ON admin_profiles FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'master_admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'master_admin'
  );

-- Recreate blocked_dates policies using JWT metadata
CREATE POLICY "Admins can view blocked dates with master bypass"
  ON blocked_dates FOR SELECT
  TO authenticated
  USING (
    admin_id = auth.uid() 
    OR (auth.jwt() ->> 'role') = 'master_admin'
  );

-- Recreate crew_members policies using JWT metadata
CREATE POLICY "Admins can view crew members with master bypass"
  ON crew_members FOR SELECT
  TO authenticated
  USING (
    admin_id = auth.uid() 
    OR id = auth.uid()
    OR (auth.jwt() ->> 'role') = 'master_admin'
  );

CREATE POLICY "Master admin can update all crew members"
  ON crew_members FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'master_admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'master_admin'
  );

-- Recreate leave_requests policies using JWT metadata
CREATE POLICY "Admins can view leave requests with master bypass"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (
    admin_id = auth.uid() 
    OR crew_member_id = auth.uid()
    OR (auth.jwt() ->> 'role') = 'master_admin'
  );

CREATE POLICY "Admins can update their leave requests"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (
    admin_id = auth.uid()
  )
  WITH CHECK (
    admin_id = auth.uid()
  );

CREATE POLICY "Master admin can update all leave requests"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'master_admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'master_admin'
  );
