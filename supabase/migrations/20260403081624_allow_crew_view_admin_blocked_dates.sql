/*
  # Allow Crew to View Admin Blocked Dates

  1. Changes
    - Add policy for crew members to view blocked dates from their admin
    - Crew members can only see blocked dates where the admin_id matches their crew_members.admin_id
  
  2. Security
    - Crew members can only read blocked dates, not modify them
    - They can only see blocked dates from their own store/admin
*/

CREATE POLICY "Crew can view their admin's blocked dates"
  ON blocked_dates
  FOR SELECT
  TO authenticated
  USING (
    admin_id IN (
      SELECT admin_id 
      FROM crew_members 
      WHERE id = auth.uid()
    )
  );
