/*
  # Recreate Admin Accounts with Proper Auth Methods

  1. Problem
    - Admin accounts may have been created incorrectly
    - Need to use Supabase's proper auth.users insertion methods
    
  2. Solution
    - Delete existing problematic admin accounts
    - Recreate them using the correct Supabase auth pattern
    - Ensure all required fields are properly set
    
  3. Changes
    - Remove old admin accounts from auth.users, auth.identities, and admin_profiles
    - Create new admin accounts with proper bcrypt hashed passwords
    - Link everything correctly
*/

-- First, clean up existing admin accounts
DELETE FROM auth.identities WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@mcleave.local'
);

DELETE FROM admin_profiles WHERE email LIKE '%@mcleave.local';

DELETE FROM auth.users WHERE email LIKE '%@mcleave.local';

-- Now create admin accounts properly
-- Password: TempPass123! (bcrypt hashed)
DO $$
DECLARE
  v_user_id uuid;
  v_identity_id uuid;
  v_email text;
  v_store_name text;
  v_encrypted_password text;
  v_counter int;
BEGIN
  -- Bcrypt hash for 'TempPass123!' with cost 10
  v_encrypted_password := crypt('TempPass123!', gen_salt('bf'));
  
  FOR v_counter IN 1..7 LOOP
    v_user_id := gen_random_uuid();
    v_identity_id := gen_random_uuid();
    v_email := 'admin' || lpad(v_counter::text, 2, '0') || '@mcleave.local';
    v_store_name := 'Store ' || lpad(v_counter::text, 2, '0');
    
    -- Insert into auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      v_email,
      v_encrypted_password,
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      'authenticated',
      'authenticated',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
    
    -- Insert into auth.identities
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
      v_identity_id,
      v_user_id,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', v_email,
        'email_verified', true,
        'provider_id', v_identity_id::text
      ),
      'email',
      v_identity_id::text,
      now(),
      now(),
      now()
    );
    
    -- Insert into admin_profiles
    INSERT INTO admin_profiles (
      id,
      email,
      store_name,
      created_at
    ) VALUES (
      v_user_id,
      v_email,
      v_store_name,
      now()
    );
    
    RAISE NOTICE 'Created admin account: %', v_email;
  END LOOP;
  
  RAISE NOTICE 'All admin accounts created successfully';
END $$;
