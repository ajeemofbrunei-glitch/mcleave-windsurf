/*
  # Fix Leave Request Update Policy for Admin Status Changes

  1. Problem
    - Current UPDATE policy prevents admins from changing status to 'approved' or 'denied'
    - The WITH_CHECK clause requires status='pending' for crew members, but this blocks admins too

  2. Solution
    - Drop the existing restrictive update policy
    - Create separate policies for admins and crew members
    - Admin policy: allows updating any field for their requests
    - Crew policy: allows updating only pending requests (for crew members)

  3. Security
    - Admins can only update requests where admin_id matches their user ID
    - Crew members can only update their own pending requests
    - All policies check authentication
*/

DO $$ 
BEGIN
  -- Drop the old update policy
  DROP POLICY IF EXISTS "Admins and crew can update leave requests" ON leave_requests;

  -- Create admin update policy (no restrictions on status changes)
  CREATE POLICY "Admins can update their leave requests"
    ON leave_requests
    FOR UPDATE
    TO authenticated
    USING (admin_id = auth.uid())
    WITH CHECK (admin_id = auth.uid());

  -- Create crew update policy (only pending requests)
  CREATE POLICY "Crew can update their pending requests"
    ON leave_requests
    FOR UPDATE
    TO authenticated
    USING (crew_member_id = auth.uid() AND status = 'pending')
    WITH CHECK (crew_member_id = auth.uid() AND status = 'pending');

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error updating policies: %', SQLERRM;
END $$;
