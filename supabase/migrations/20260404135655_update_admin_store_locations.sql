/*
  # Update Admin Store Locations

  1. Changes
    - Update all admin accounts (admin01-admin07) with correct store locations
    - Ensure all admins have is_active set to true by default
    - Map each admin to their respective store location:
      - admin01@mcleave.local → GADONG
      - admin02@mcleave.local → JPDT
      - admin03@mcleave.local → KIULAP (LDT)
      - admin04@mcleave.local → AIRPORT
      - admin05@mcleave.local → MULAUT (STDT)
      - admin06@mcleave.local → DELIMA (KUALA BELAIT)
      - admin07@mcleave.local → SERIA

  2. Security
    - No changes to RLS policies
    - All admins remain active and manageable
*/

DO $$
BEGIN
  UPDATE admin_profiles 
  SET store_location = 'GADONG', store_name = 'GADONG', is_active = true
  WHERE email = 'admin01@mcleave.local';

  UPDATE admin_profiles 
  SET store_location = 'JPDT', store_name = 'JPDT', is_active = true
  WHERE email = 'admin02@mcleave.local';

  UPDATE admin_profiles 
  SET store_location = 'KIULAP', store_name = 'KIULAP', is_active = true
  WHERE email = 'admin03@mcleave.local';

  UPDATE admin_profiles 
  SET store_location = 'AIRPORT', store_name = 'AIRPORT', is_active = true
  WHERE email = 'admin04@mcleave.local';

  UPDATE admin_profiles 
  SET store_location = 'MULAUT', store_name = 'MULAUT', is_active = true
  WHERE email = 'admin05@mcleave.local';

  UPDATE admin_profiles 
  SET store_location = 'DELIMA', store_name = 'DELIMA', is_active = true
  WHERE email = 'admin06@mcleave.local';

  UPDATE admin_profiles 
  SET store_location = 'SERIA', store_name = 'SERIA', is_active = true
  WHERE email = 'admin07@mcleave.local';
END $$;
