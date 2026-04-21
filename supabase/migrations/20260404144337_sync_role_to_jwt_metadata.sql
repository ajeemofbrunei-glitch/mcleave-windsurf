/*
  # Sync Role to JWT Metadata

  1. Purpose
    - Automatically sync user role from admin_profiles/crew_members to JWT metadata
    - This allows RLS policies to check role without querying admin_profiles (avoiding recursion)

  2. Implementation
    - Create function to update auth.users.raw_app_meta_data with role
    - Add triggers on admin_profiles and crew_members to call this function
    - Backfill existing users with their roles

  3. Security
    - Function is SECURITY DEFINER (runs with creator privileges)
    - Only updates the 'role' field in app_metadata
    - app_metadata cannot be modified by users directly
*/

-- Function to update user's role in JWT metadata
CREATE OR REPLACE FUNCTION sync_user_role_to_jwt()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the user's app_metadata with their role
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Function to set crew role in JWT metadata
CREATE OR REPLACE FUNCTION sync_crew_role_to_jwt()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the user's app_metadata with crew role
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', 'crew')
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS sync_admin_role_to_jwt ON admin_profiles;
DROP TRIGGER IF EXISTS sync_crew_role_to_jwt ON crew_members;

-- Create trigger for admin_profiles
CREATE TRIGGER sync_admin_role_to_jwt
  AFTER INSERT OR UPDATE OF role ON admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role_to_jwt();

-- Create trigger for crew_members
CREATE TRIGGER sync_crew_role_to_jwt
  AFTER INSERT ON crew_members
  FOR EACH ROW
  EXECUTE FUNCTION sync_crew_role_to_jwt();

-- Backfill existing admin users
DO $$
DECLARE
  admin_record RECORD;
BEGIN
  FOR admin_record IN SELECT id, role FROM admin_profiles
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', admin_record.role)
    WHERE id = admin_record.id;
  END LOOP;
END $$;

-- Backfill existing crew users
DO $$
DECLARE
  crew_record RECORD;
BEGIN
  FOR crew_record IN SELECT id FROM crew_members
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', 'crew')
    WHERE id = crew_record.id;
  END LOOP;
END $$;
