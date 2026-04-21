/*
  # Add Master Admin View All Profiles Policy

  1. Changes
    - Add SELECT policy for master admin to view all admin profiles
    - This allows the User Management console to display all admins

  2. Security
    - Only master_admin role can view all profiles
    - Regular admins can still only view their own profile
*/

-- Add policy for master admin to view all admin profiles
CREATE POLICY "Master admin can view all admin profiles"
  ON admin_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles admin_profiles_1
      WHERE admin_profiles_1.id = (SELECT auth.uid())
      AND admin_profiles_1.role = 'master_admin'
    )
  );