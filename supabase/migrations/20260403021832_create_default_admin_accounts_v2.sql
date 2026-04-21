/*
  # Create Pre-Configured Admin Accounts

  1. Overview
    - Creates 7 admin accounts (admin01 through admin07)
    - Each account uses Supabase Auth with email/password
    - Temporary password: "TempPass123!" (admins should change after first login)
    - Each admin gets a profile with a default store name

  2. Account Details
    - Email format: admin01@mcleave.local through admin07@mcleave.local
    - Password: TempPass123! (same for all, temporary)
    - Store names: "Store 01" through "Store 07" (can be updated later)
    - Each account is linked to their admin_profiles record

  3. Security Notes
    - Using Supabase's built-in auth.users table
    - Passwords are hashed by Supabase automatically
    - Each admin can only access their own data due to RLS policies
    - Admins should change their password after first login

  4. Post-Setup Instructions
    - Share credentials with each admin
    - Admins should update their store name and password after first login
    - Email format: admin01@mcleave.local, admin02@mcleave.local, etc.
    - Temporary password: TempPass123!
*/

-- Create 7 pre-configured admin accounts
DO $$
DECLARE
  v_user_id uuid;
  v_counter integer;
  v_email text;
  v_store_name text;
  v_encrypted_password text;
BEGIN
  -- Loop to create admin01 through admin07
  FOR v_counter IN 1..7 LOOP
    -- Generate email and store name
    v_email := 'admin' || LPAD(v_counter::text, 2, '0') || '@mcleave.local';
    v_store_name := 'Store ' || LPAD(v_counter::text, 2, '0');
    
    -- Generate a new UUID for this user
    v_user_id := gen_random_uuid();
    
    -- Encrypt the temporary password using Supabase's crypt function
    -- Password: TempPass123!
    v_encrypted_password := crypt('TempPass123!', gen_salt('bf'));
    
    -- Check if user already exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
      -- Insert into auth.users
      INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        aud,
        role
      ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        v_email,
        v_encrypted_password,
        now(), -- Email is pre-confirmed
        now(),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        'authenticated',
        'authenticated'
      );
      
      -- Create corresponding admin profile with store name
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
      ) ON CONFLICT (id) DO NOTHING;
      
      RAISE NOTICE 'Created admin: % / Store: % / ID: %', v_email, v_store_name, v_user_id;
    ELSE
      RAISE NOTICE 'Admin account already exists: %', v_email;
    END IF;
  END LOOP;
  
  -- Output summary
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'ADMIN ACCOUNTS CREATED';
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'Email format: admin01@mcleave.local through admin07@mcleave.local';
  RAISE NOTICE 'Temporary password (all accounts): TempPass123!';
  RAISE NOTICE 'Store names: Store 01 through Store 07';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Admins should change their password after first login!';
  RAISE NOTICE '===============================================';
END $$;
