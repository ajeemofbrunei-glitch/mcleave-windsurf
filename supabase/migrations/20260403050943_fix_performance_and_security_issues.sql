/*
  # Fix Performance and Security Issues

  1. Performance Optimizations
    - Add missing index on leave_requests.crew_id foreign key
    - Optimize all RLS policies to use (select auth.uid()) instead of auth.uid()
    - This prevents re-evaluation of auth functions for each row
  
  2. Policy Cleanup
    - Remove duplicate and conflicting RLS policies
    - Consolidate multiple permissive policies into single policies per action
    - Keep only the essential policies for proper access control
  
  3. Function Security
    - Set secure search_path for update_updated_at_column function
  
  4. Notes
    - Unused indexes are kept as they may be used in the future as data grows
    - Multiple permissive policies consolidated for better performance
*/

-- Add missing index on foreign key
CREATE INDEX IF NOT EXISTS idx_leave_requests_crew_id ON public.leave_requests(crew_id);

-- Fix search_path for function
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers
DROP TRIGGER IF EXISTS update_crews_updated_at ON public.crews;
CREATE TRIGGER update_crews_updated_at
  BEFORE UPDATE ON public.crews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON public.leave_requests;
CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crew_members_updated_at ON public.crew_members;
CREATE TRIGGER update_crew_members_updated_at
  BEFORE UPDATE ON public.crew_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Drop all existing RLS policies to recreate them optimized
DROP POLICY IF EXISTS "Admins can view own crews" ON public.crews;
DROP POLICY IF EXISTS "Crew can view own profile" ON public.crews;
DROP POLICY IF EXISTS "Admins can insert own crews" ON public.crews;
DROP POLICY IF EXISTS "Admins can update own crews" ON public.crews;
DROP POLICY IF EXISTS "Crew can update own limited fields" ON public.crews;
DROP POLICY IF EXISTS "Admins can delete own crews" ON public.crews;

DROP POLICY IF EXISTS "Admins can view own store leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Admins can update own store leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Crew can update own pending requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Admins can delete own store leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Crew can delete own pending requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Admins can view their store's leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Crew can view own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Admins can insert leave requests for their store" ON public.leave_requests;
DROP POLICY IF EXISTS "Crew can insert own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Admins can update their store's leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Crew can update own pending leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Admins can delete their store's leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Crew can delete own pending leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Admins can view own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Admins can insert own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Admins can update own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Admins can delete own leave requests" ON public.leave_requests;

DROP POLICY IF EXISTS "Crew can view own profile" ON public.crew_members;
DROP POLICY IF EXISTS "Admins can view their crew" ON public.crew_members;
DROP POLICY IF EXISTS "Admins can update their crew" ON public.crew_members;
DROP POLICY IF EXISTS "Admins can delete their crew" ON public.crew_members;
DROP POLICY IF EXISTS "Admins can create crew" ON public.crew_members;
DROP POLICY IF EXISTS "Crew can self-register" ON public.crew_members;

-- Create optimized RLS policies for crews table
CREATE POLICY "Users can view crews"
  ON public.crews
  FOR SELECT
  TO authenticated
  USING (
    admin_id = (select auth.uid()) OR 
    user_id = (select auth.uid())
  );

CREATE POLICY "Admins can insert crews"
  ON public.crews
  FOR INSERT
  TO authenticated
  WITH CHECK (admin_id = (select auth.uid()));

CREATE POLICY "Users can update crews"
  ON public.crews
  FOR UPDATE
  TO authenticated
  USING (
    admin_id = (select auth.uid()) OR 
    (user_id = (select auth.uid()) AND admin_id IS NULL)
  )
  WITH CHECK (
    admin_id = (select auth.uid()) OR 
    (user_id = (select auth.uid()) AND admin_id IS NULL)
  );

CREATE POLICY "Admins can delete crews"
  ON public.crews
  FOR DELETE
  TO authenticated
  USING (admin_id = (select auth.uid()));

-- Create optimized RLS policies for leave_requests table
CREATE POLICY "Users can view leave requests"
  ON public.leave_requests
  FOR SELECT
  TO authenticated
  USING (
    admin_id = (select auth.uid()) OR 
    crew_member_id = (select auth.uid())
  );

CREATE POLICY "Users can insert leave requests"
  ON public.leave_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_id = (select auth.uid()) OR
    crew_member_id = (select auth.uid())
  );

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

CREATE POLICY "Users can delete leave requests"
  ON public.leave_requests
  FOR DELETE
  TO authenticated
  USING (
    admin_id = (select auth.uid()) OR
    (crew_member_id = (select auth.uid()) AND status = 'pending')
  );

-- Create optimized RLS policies for crew_members table
CREATE POLICY "Users can view crew members"
  ON public.crew_members
  FOR SELECT
  TO authenticated
  USING (
    admin_id = (select auth.uid()) OR 
    id = (select auth.uid())
  );

CREATE POLICY "Users can insert crew members"
  ON public.crew_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_id = (select auth.uid()) OR 
    id = (select auth.uid())
  );

CREATE POLICY "Admins can update crew members"
  ON public.crew_members
  FOR UPDATE
  TO authenticated
  USING (admin_id = (select auth.uid()))
  WITH CHECK (admin_id = (select auth.uid()));

CREATE POLICY "Admins can delete crew members"
  ON public.crew_members
  FOR DELETE
  TO authenticated
  USING (admin_id = (select auth.uid()));
