/*
  # Add Plan Column to Admin Profiles

  1. Changes
    - Add `plan` column to `admin_profiles` table
    - Default value is 'free'
    - Allows values: 'free' or 'pro'
  
  2. Security
    - No RLS changes needed
    - Existing policies remain intact
*/

-- Add plan column to admin_profiles
ALTER TABLE admin_profiles 
ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free';

-- Add check constraint to ensure only valid plan values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'admin_profiles' AND constraint_name = 'admin_profiles_plan_check'
  ) THEN
    ALTER TABLE admin_profiles 
    ADD CONSTRAINT admin_profiles_plan_check 
    CHECK (plan IN ('free', 'pro'));
  END IF;
END $$;