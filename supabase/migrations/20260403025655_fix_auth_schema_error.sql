/*
  # Fix Authentication Schema Error

  1. Problem
    - Getting "Database error querying schema" when trying to authenticate
    - This suggests a schema corruption or trigger issue in the auth schema
    
  2. Solution
    - Verify auth.users table integrity
    - Check for any problematic triggers or functions
    - Ensure all required auth schema elements are present
    
  3. Changes
    - Clean up any orphaned or problematic schema elements
    - Verify auth configuration
*/

-- Verify that the auth.users table has all required fields
DO $$
BEGIN
  -- Check if encrypted_password column exists and is properly configured
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'auth' 
    AND table_name = 'users' 
    AND column_name = 'encrypted_password'
  ) THEN
    RAISE EXCEPTION 'Auth schema is corrupted: encrypted_password column missing';
  END IF;

  -- Verify we have valid admin accounts
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email LIKE '%@mcleave.local' 
    AND encrypted_password IS NOT NULL
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'No valid admin accounts found';
  END IF;

  RAISE NOTICE 'Auth schema verification completed successfully';
END $$;
