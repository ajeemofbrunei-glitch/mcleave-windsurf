/*
  # Allow Crew Self-Registration

  1. Changes
    - Update crew_members RLS policies to allow self-registration
    - Crew members can insert their own profile during registration
    - admin_id will be set during registration based on store selection
  
  2. Security
    - Crew can only create their own profile (where id = auth.uid())
    - Crew must set is_active to false (pending approval)
    - All other existing policies remain unchanged
*/

-- Drop and recreate the insert policy to allow self-registration
DROP POLICY IF EXISTS "Admins can create crew" ON crew_members;
DROP POLICY IF EXISTS "Crew can self-register" ON crew_members;

-- Admins can insert crew members (existing functionality)
CREATE POLICY "Admins can create crew"
  ON crew_members FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_id IN (
      SELECT id FROM admin_profiles WHERE id = auth.uid()
    )
  );

-- Crew members can self-register (new functionality)
CREATE POLICY "Crew can self-register"
  ON crew_members FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid() AND
    is_active = false
  );
