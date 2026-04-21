/*
  # Add Crew Accounts System

  1. New Tables
    - `crew_members`
      - `id` (uuid, primary key) - References auth.users
      - `admin_id` (uuid) - References admin who created this crew member
      - `full_name` (text) - Crew member's full name
      - `phone` (text) - Contact phone number
      - `email` (text) - Login email
      - `is_active` (boolean) - Whether account is active
      - `created_at` (timestamptz) - When account was created
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `crew_members` table
    - Admins can view and manage crew members they created
    - Crew members can view only their own profile
    - Add foreign key constraints for data integrity

  3. Changes to Existing Tables
    - Add `admin_id` column to `leave_requests` to link to store owner
    - Add `crew_member_id` column to `leave_requests` to link to crew member
    - Update RLS policies to ensure crew can only see their own requests
    - Update RLS policies to ensure admins can only see requests from their crew

  4. Important Notes
    - Crew members are authenticated users in auth.users
    - Each crew member is linked to exactly one admin (store owner)
    - Admins can create multiple crew members
    - Leave requests are isolated by store (via admin_id)
*/

-- Create crew_members table
CREATE TABLE IF NOT EXISTS crew_members (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES admin_profiles(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  email text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Crew can view own profile" ON crew_members;
DROP POLICY IF EXISTS "Admins can view their crew" ON crew_members;
DROP POLICY IF EXISTS "Admins can create crew" ON crew_members;
DROP POLICY IF EXISTS "Admins can update their crew" ON crew_members;
DROP POLICY IF EXISTS "Admins can delete their crew" ON crew_members;

-- Crew members can view their own profile
CREATE POLICY "Crew can view own profile"
  ON crew_members FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Admins can view their crew members
CREATE POLICY "Admins can view their crew"
  ON crew_members FOR SELECT
  TO authenticated
  USING (
    admin_id IN (
      SELECT id FROM admin_profiles WHERE id = auth.uid()
    )
  );

-- Admins can insert crew members
CREATE POLICY "Admins can create crew"
  ON crew_members FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_id IN (
      SELECT id FROM admin_profiles WHERE id = auth.uid()
    )
  );

-- Admins can update their crew members
CREATE POLICY "Admins can update their crew"
  ON crew_members FOR UPDATE
  TO authenticated
  USING (
    admin_id IN (
      SELECT id FROM admin_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    admin_id IN (
      SELECT id FROM admin_profiles WHERE id = auth.uid()
    )
  );

-- Admins can delete their crew members
CREATE POLICY "Admins can delete their crew"
  ON crew_members FOR DELETE
  TO authenticated
  USING (
    admin_id IN (
      SELECT id FROM admin_profiles WHERE id = auth.uid()
    )
  );

-- Add columns to leave_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leave_requests' AND column_name = 'admin_id'
  ) THEN
    ALTER TABLE leave_requests ADD COLUMN admin_id uuid REFERENCES admin_profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leave_requests' AND column_name = 'crew_member_id'
  ) THEN
    ALTER TABLE leave_requests ADD COLUMN crew_member_id uuid REFERENCES crew_members(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Drop old policies on leave_requests
DROP POLICY IF EXISTS "Admins can view all leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Admins can insert leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Admins can update leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Admins can delete leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Admins can view their store's leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Crew can view own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Admins can insert leave requests for their store" ON leave_requests;
DROP POLICY IF EXISTS "Crew can insert own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Admins can update their store's leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Crew can update own pending leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Admins can delete their store's leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Crew can delete own pending leave requests" ON leave_requests;

-- New policies for leave_requests with store isolation
CREATE POLICY "Admins can view their store's leave requests"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (
    admin_id IN (
      SELECT id FROM admin_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Crew can view own leave requests"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (
    crew_member_id IN (
      SELECT id FROM crew_members WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert leave requests for their store"
  ON leave_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_id IN (
      SELECT id FROM admin_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Crew can insert own leave requests"
  ON leave_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    crew_member_id IN (
      SELECT id FROM crew_members WHERE id = auth.uid()
    ) AND
    admin_id IN (
      SELECT admin_id FROM crew_members WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can update their store's leave requests"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (
    admin_id IN (
      SELECT id FROM admin_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    admin_id IN (
      SELECT id FROM admin_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Crew can update own pending leave requests"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (
    crew_member_id IN (
      SELECT id FROM crew_members WHERE id = auth.uid()
    ) AND
    status = 'pending'
  )
  WITH CHECK (
    crew_member_id IN (
      SELECT id FROM crew_members WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete their store's leave requests"
  ON leave_requests FOR DELETE
  TO authenticated
  USING (
    admin_id IN (
      SELECT id FROM admin_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Crew can delete own pending leave requests"
  ON leave_requests FOR DELETE
  TO authenticated
  USING (
    crew_member_id IN (
      SELECT id FROM crew_members WHERE id = auth.uid()
    ) AND
    status = 'pending'
  );

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_crew_members_admin_id ON crew_members(admin_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_admin_id ON leave_requests(admin_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_crew_member_id ON leave_requests(crew_member_id);

-- Add function to automatically set updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for crew_members
DROP TRIGGER IF EXISTS update_crew_members_updated_at ON crew_members;
CREATE TRIGGER update_crew_members_updated_at
  BEFORE UPDATE ON crew_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
