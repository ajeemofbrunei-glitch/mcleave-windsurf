/*
  # Create Master Admin Account

  ## Overview
  Creates a master admin account for accessing the Master Portal with the email
  'masterportal@mcleave.local' and sets up the necessary profile.

  ## Changes
  1. Creates auth user for master admin
  2. Creates admin profile with 'master_admin' role
  3. Ensures proper configuration for Master Portal access

  ## Important Notes
  - Email: masterportal@mcleave.local
  - Password: You'll need to set this via Supabase Auth
  - Role: master_admin (full system access)
*/

-- This migration creates the master admin profile structure
-- You'll need to create the actual auth user via Supabase dashboard or using the signUp function

-- First, check if master admin profile already exists, if not prepare for it
-- Note: The auth.users insert requires using Supabase Auth API or Dashboard

-- Update any existing admin with the master email to be master_admin
UPDATE admin_profiles 
SET role = 'master_admin',
    store_location = 'MASTER',
    store_name = 'Master Portal'
WHERE email = 'masterportal@mcleave.local';

-- If no profile exists yet, it will be created when the user first signs up
-- through the registration flow with the email masterportal@mcleave.local
