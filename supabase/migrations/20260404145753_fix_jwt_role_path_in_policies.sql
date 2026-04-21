/*
  # Fix JWT Role Path in RLS Policies

  1. Problem
    - RLS policies check `auth.jwt() ->> 'role'` 
    - But role is stored in `raw_app_meta_data` which becomes `app_metadata` in JWT
    - Correct path is `auth.jwt() -> 'app_metadata' ->> 'role'`

  2. Solution
    - Drop and recreate all policies that check role
    - Use correct JWT path: `(auth.jwt() -> 'app_metadata' ->> 'role')`

  3. Security
    - Maintains same security level
    - Only fixes the path to access role correctly
*/

-- Drop existing master admin policies
DROP POLICY IF EXISTS "Master admin can view all admin profiles" ON admin_profiles;
DROP POLICY IF EXISTS "Master admin can update all admin profiles" ON admin_profiles;
DROP POLICY IF EXISTS "Admins can view crew members with master bypass" ON crew_members;
DROP POLICY IF EXISTS "Master admin can update all crew members" ON crew_members;
DROP POLICY IF EXISTS "Admins can view leave requests with master bypass" ON leave_requests;
DROP POLICY IF EXISTS "Master admin can update all leave requests" ON leave_requests;

-- Recreate policies with correct JWT path
CREATE POLICY "Master admin can view all admin profiles"
  ON admin_profiles FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'master_admin');

CREATE POLICY "Master admin can update all admin profiles"
  ON admin_profiles FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'master_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'master_admin');

CREATE POLICY "Admins can view crew members with master bypass"
  ON crew_members FOR SELECT
  TO authenticated
  USING (
    (admin_id = auth.uid()) OR 
    (id = auth.uid()) OR 
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'master_admin')
  );

CREATE POLICY "Master admin can update all crew members"
  ON crew_members FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'master_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'master_admin');

CREATE POLICY "Admins can view leave requests with master bypass"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (
    (admin_id = auth.uid()) OR 
    (crew_member_id = auth.uid()) OR 
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'master_admin')
  );

CREATE POLICY "Master admin can update all leave requests"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'master_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'master_admin');
