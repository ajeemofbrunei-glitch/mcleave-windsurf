/*
  # Add Admin Isolation System

  1. New Tables
    - `admin_profiles`
      - `id` (uuid, references auth.users)
      - `email` (text)
      - `store_name` (text) - e.g., "Store 1", "Store 2"
      - `created_at` (timestamptz)

  2. Changes to Existing Tables
    - Add `admin_id` (uuid) to:
      - `crews` - links each crew member to their admin
      - `leave_requests` - links each request to their admin
      - `blocked_dates` - links each blocked date to their admin

  3. Security
    - Enable RLS on `admin_profiles`
    - Update RLS policies on all tables to filter by `admin_id`
    - Each admin can ONLY see/manage their own data
    - Complete data isolation between admins

  4. Important Notes
    - 7 different admins can use the system
    - Each admin's data is completely separate
    - Admin01's crews will NEVER appear to Admin02
    - All security enforced at database level via RLS
*/

-- Create admin_profiles table
CREATE TABLE IF NOT EXISTS admin_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  store_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can only see their own profile
CREATE POLICY "Admins can view own profile"
  ON admin_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can insert own profile"
  ON admin_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update own profile"
  ON admin_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add admin_id to crews table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crews' AND column_name = 'admin_id'
  ) THEN
    ALTER TABLE crews ADD COLUMN admin_id uuid REFERENCES admin_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add admin_id to leave_requests table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leave_requests' AND column_name = 'admin_id'
  ) THEN
    ALTER TABLE leave_requests ADD COLUMN admin_id uuid REFERENCES admin_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add admin_id to blocked_dates table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blocked_dates' AND column_name = 'admin_id'
  ) THEN
    ALTER TABLE blocked_dates ADD COLUMN admin_id uuid REFERENCES admin_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view crews" ON crews;
DROP POLICY IF EXISTS "Anyone can insert crews" ON crews;
DROP POLICY IF EXISTS "Anyone can update crews" ON crews;
DROP POLICY IF EXISTS "Anyone can delete crews" ON crews;

DROP POLICY IF EXISTS "Anyone can view leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Anyone can insert leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Anyone can update leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Anyone can delete leave requests" ON leave_requests;

DROP POLICY IF EXISTS "Anyone can view blocked dates" ON blocked_dates;
DROP POLICY IF EXISTS "Anyone can insert blocked dates" ON blocked_dates;
DROP POLICY IF EXISTS "Anyone can delete blocked dates" ON blocked_dates;

-- New RLS policies for crews - admin can only see their own crews
CREATE POLICY "Admins can view own crews"
  ON crews FOR SELECT
  TO authenticated
  USING (admin_id = auth.uid());

CREATE POLICY "Admins can insert own crews"
  ON crews FOR INSERT
  TO authenticated
  WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Admins can update own crews"
  ON crews FOR UPDATE
  TO authenticated
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Admins can delete own crews"
  ON crews FOR DELETE
  TO authenticated
  USING (admin_id = auth.uid());

-- New RLS policies for leave_requests - admin can only see their own requests
CREATE POLICY "Admins can view own leave requests"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (admin_id = auth.uid());

CREATE POLICY "Admins can insert own leave requests"
  ON leave_requests FOR INSERT
  TO authenticated
  WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Admins can update own leave requests"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Admins can delete own leave requests"
  ON leave_requests FOR DELETE
  TO authenticated
  USING (admin_id = auth.uid());

-- New RLS policies for blocked_dates - admin can only see their own blocked dates
CREATE POLICY "Admins can view own blocked dates"
  ON blocked_dates FOR SELECT
  TO authenticated
  USING (admin_id = auth.uid());

CREATE POLICY "Admins can insert own blocked dates"
  ON blocked_dates FOR INSERT
  TO authenticated
  WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Admins can delete own blocked dates"
  ON blocked_dates FOR DELETE
  TO authenticated
  USING (admin_id = auth.uid());