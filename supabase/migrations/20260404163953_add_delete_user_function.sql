/*
  # Add delete user function

  1. New Functions
    - `delete_user(user_id uuid)` - Allows master admin to delete user accounts
      - Deletes from crew_members or admin_profiles table
      - Deletes from auth.users table
      - Can only be called by master_admin role

  2. Security
    - Function uses security definer to allow deletion from auth schema
    - Only master_admin role can execute this function
*/

CREATE OR REPLACE FUNCTION delete_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the caller is a master admin
  IF NOT EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE id = auth.uid()
    AND role = 'master_admin'
  ) THEN
    RAISE EXCEPTION 'Only master admins can delete users';
  END IF;

  -- Delete from crew_members if exists
  DELETE FROM crew_members WHERE id = user_id;
  
  -- Delete from admin_profiles if exists (but not master_admin)
  DELETE FROM admin_profiles WHERE id = user_id AND role != 'master_admin';
  
  -- Delete from auth.users
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;