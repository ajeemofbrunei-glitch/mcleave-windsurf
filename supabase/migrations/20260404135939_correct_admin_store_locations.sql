/*
  # Correct Admin Store Locations

  1. Changes
    - Update all admin accounts (admin01-admin07) with exact correct store locations
    - Map each admin to their respective store location:
      - admin01@mcleave.local → GADONG
      - admin02@mcleave.local → JPDT
      - admin03@mcleave.local → LDT
      - admin04@mcleave.local → AIRPORTMALL
      - admin05@mcleave.local → STDT
      - admin06@mcleave.local → KUALA BELAIT
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
  SET store_location = 'LDT', store_name = 'LDT', is_active = true
  WHERE email = 'admin03@mcleave.local';

  UPDATE admin_profiles 
  SET store_location = 'AIRPORTMALL', store_name = 'AIRPORTMALL', is_active = true
  WHERE email = 'admin04@mcleave.local';

  UPDATE admin_profiles 
  SET store_location = 'STDT', store_name = 'STDT', is_active = true
  WHERE email = 'admin05@mcleave.local';

  UPDATE admin_profiles 
  SET store_location = 'KUALA BELAIT', store_name = 'KUALA BELAIT', is_active = true
  WHERE email = 'admin06@mcleave.local';

  UPDATE admin_profiles 
  SET store_location = 'SERIA', store_name = 'SERIA', is_active = true
  WHERE email = 'admin07@mcleave.local';
END $$;
