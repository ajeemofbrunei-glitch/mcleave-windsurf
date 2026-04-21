/*
  # Fix Admin Account Identities

  1. Problem
    - Admin accounts were created in auth.users but missing auth.identities records
    - Supabase requires identity records for email/password authentication to work
    - This prevents login even though passwords are correct

  2. Solution
    - Add identity records for all admin accounts (admin01-admin07)
    - Link identities to existing user records
    - Use email provider for authentication
    - Include required provider_id field

  3. Changes
    - Insert records into auth.identities for each admin account
    - Ensures email/password login works correctly
*/

DO $$
DECLARE
  v_user record;
  v_identity_id uuid;
BEGIN
  -- Loop through all admin accounts
  FOR v_user IN 
    SELECT id, email 
    FROM auth.users 
    WHERE email LIKE '%@mcleave.local'
  LOOP
    -- Check if identity already exists
    IF NOT EXISTS (
      SELECT 1 FROM auth.identities 
      WHERE user_id = v_user.id AND provider = 'email'
    ) THEN
      -- Generate identity ID
      v_identity_id := gen_random_uuid();
      
      -- Create identity record
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
        v_user.id,
        jsonb_build_object(
          'sub', v_user.id::text,
          'email', v_user.email,
          'email_verified', true,
          'provider_id', v_identity_id::text
        ),
        'email',
        v_identity_id::text,
        now(),
        now(),
        now()
      );
      
      RAISE NOTICE 'Created identity for: %', v_user.email;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Admin identities fixed successfully';
END $$;
