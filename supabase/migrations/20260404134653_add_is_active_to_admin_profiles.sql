/*
  # Add is_active Column to Admin Profiles

  1. Changes
    - Add `is_active` column to admin_profiles table
    - Default value is true for all existing admins
  
  2. Security
    - No changes to RLS policies needed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE admin_profiles ADD COLUMN is_active boolean DEFAULT true NOT NULL;
  END IF;
END $$;
