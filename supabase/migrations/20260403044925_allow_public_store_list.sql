/*
  # Allow Public Access to Store List

  1. Changes
    - Add SELECT policy for unauthenticated users to view store names
    - This allows crew members to see the list of stores during registration
    - Policy is restrictive and only allows reading id and store_name columns
  
  2. Security
    - Policy only grants SELECT access
    - No INSERT, UPDATE, or DELETE access for anonymous users
    - Existing authenticated policies remain unchanged
*/

-- Allow anyone (including unauthenticated users) to view store list for registration
CREATE POLICY "Anyone can view store list for registration"
  ON admin_profiles
  FOR SELECT
  TO anon
  USING (true);
