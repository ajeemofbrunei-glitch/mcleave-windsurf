/*
  # Create Master Admin Account Using Proper Auth

  1. Changes
    - Creates master admin account using auth.users table properly
    - Ensures proper password hashing and identity creation
    - Creates corresponding admin_profiles entry
  
  2. Security
    - Uses proper Supabase auth mechanisms
    - Password is securely hashed
*/

DO $$
DECLARE
  master_user_id uuid;
BEGIN
  -- Create the auth user with proper password hashing
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    last_sign_in_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'masterportal@mcleave.local',
    crypt('Master@123', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    now(),
    now(),
    '{}',
    '{}',
    false,
    NULL
  )
  RETURNING id INTO master_user_id;

  -- Create the identity record
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    master_user_id,
    jsonb_build_object(
      'sub', master_user_id::text,
      'email', 'masterportal@mcleave.local'
    ),
    'email',
    master_user_id::text,
    NULL,
    now(),
    now()
  );

  -- Create the admin profile
  INSERT INTO admin_profiles (
    id,
    email,
    store_name,
    store_location,
    role
  ) VALUES (
    master_user_id,
    'masterportal@mcleave.local',
    'Master Portal',
    'MASTER',
    'master_admin'
  );

END $$;
