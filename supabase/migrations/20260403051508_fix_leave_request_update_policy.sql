/*
  # Fix Leave Request Update Policy

  1. Changes
    - Separate admin and crew update logic more clearly
    - Admins can update any request in their store (no status restriction)
    - Crew can only update their own requests while still pending
    - Crew cannot change the status field itself
  
  2. Security
    - Maintains proper isolation between admins and crew
    - Prevents crew from modifying approved/denied requests
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can update leave requests" ON public.leave_requests;

-- Create new policy with clearer logic
CREATE POLICY "Admins and crew can update leave requests"
  ON public.leave_requests
  FOR UPDATE
  TO authenticated
  USING (
    -- Admins can update requests in their store
    admin_id = (select auth.uid())
    OR
    -- Crew can update their own pending requests
    (crew_member_id = (select auth.uid()) AND status = 'pending')
  )
  WITH CHECK (
    -- Admins can update to any status/field
    admin_id = (select auth.uid())
    OR
    -- Crew can only update if still pending (prevents status change)
    (crew_member_id = (select auth.uid()) AND status = 'pending')
  );
