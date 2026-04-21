/*
  # Fix Admin Update Policy for Leave Requests

  1. Changes
    - Fix UPDATE policy to allow admins to change status from pending to approved/denied
    - Remove the restrictive WITH CHECK clause that was preventing status changes
    - Keep crew members restricted to only updating their own pending requests
  
  2. Security
    - Admins can update any field on their store's leave requests
    - Crew members can only update their own pending requests and cannot change status
*/

-- Drop and recreate the UPDATE policy for leave_requests
DROP POLICY IF EXISTS "Users can update leave requests" ON public.leave_requests;

CREATE POLICY "Users can update leave requests"
  ON public.leave_requests
  FOR UPDATE
  TO authenticated
  USING (
    admin_id = (select auth.uid()) OR
    (crew_member_id = (select auth.uid()) AND status = 'pending')
  )
  WITH CHECK (
    admin_id = (select auth.uid()) OR
    (crew_member_id = (select auth.uid()) AND status = 'pending')
  );
