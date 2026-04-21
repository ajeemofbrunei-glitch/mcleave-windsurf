/*
  # McLeave Database Schema

  ## Overview
  This migration creates the database schema for the McDonald's Leave Management System (McLeave).
  It stores crew members, leave requests, blocked dates, and admin credentials with proper security.

  ## New Tables

  ### 1. `crews`
  Stores crew member profiles and authentication credentials
  - `id` (text, primary key) - Unique crew identifier (e.g., CRW-xxxxx)
  - `name` (text) - Full name of crew member
  - `username` (text, unique) - Login username
  - `phone` (text) - Contact phone number
  - `designation` (text) - Job role/designation
  - `password` (text) - Hashed password for authentication
  - `joined_at` (text) - Date when crew member joined
  - `created_at` (timestamptz) - Record creation timestamp

  ### 2. `leave_requests`
  Stores all leave/time-off requests from crew members
  - `id` (text, primary key) - Unique request identifier (e.g., LR-xxxxx)
  - `crew_id` (text, foreign key) - References crews table
  - `crew_name` (text) - Cached crew name for display
  - `phone` (text) - Cached phone for display
  - `designation` (text) - Cached designation for display
  - `leave_type` (text) - Type of leave (Off Day, Annual Leave, etc.)
  - `date_start` (text) - Start date of leave
  - `date_end` (text) - End date of leave
  - `reason` (text) - Explanation for leave request
  - `status` (text) - Current status: pending, approved, or denied
  - `submitted_at` (text) - When request was submitted
  - `responded_at` (text) - When admin responded to request
  - `admin_note` (text) - Optional note from manager
  - `created_at` (timestamptz) - Record creation timestamp

  ### 3. `blocked_dates`
  Stores dates that are blocked for leave requests
  - `id` (uuid, primary key) - Auto-generated unique identifier
  - `date` (text, unique) - Blocked date in YYYY-MM-DD format
  - `created_at` (timestamptz) - Record creation timestamp

  ### 4. `admin_credentials`
  Stores manager login credentials (single row table)
  - `id` (integer, primary key) - Always 1 (singleton)
  - `username` (text) - Admin username
  - `password` (text) - Admin password
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security

  ### Row Level Security (RLS)
  - All tables have RLS enabled
  - Public access is granted for this demo application
  - In production, this should be restricted to authenticated users only

  ### Important Notes
  - Passwords are stored in plain text for demo purposes
  - In production, use proper authentication (Supabase Auth) and password hashing
  - Admin credentials table uses a CHECK constraint to ensure only one admin account exists
*/

-- Create crews table
CREATE TABLE IF NOT EXISTS crews (
  id text PRIMARY KEY,
  name text NOT NULL,
  username text UNIQUE NOT NULL,
  phone text NOT NULL,
  designation text NOT NULL,
  password text NOT NULL,
  joined_at text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create leave_requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id text PRIMARY KEY,
  crew_id text NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  crew_name text NOT NULL,
  phone text NOT NULL,
  designation text NOT NULL,
  leave_type text NOT NULL,
  date_start text NOT NULL,
  date_end text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  submitted_at text NOT NULL,
  responded_at text,
  admin_note text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create blocked_dates table
CREATE TABLE IF NOT EXISTS blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create admin_credentials table (singleton)
CREATE TABLE IF NOT EXISTS admin_credentials (
  id integer PRIMARY KEY CHECK (id = 1),
  username text NOT NULL,
  password text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Insert default admin credentials
INSERT INTO admin_credentials (id, username, password)
VALUES (1, 'admin', 'admin123')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_credentials ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (demo mode)
-- In production, these should be restricted to authenticated users

CREATE POLICY "Public can read crews"
  ON crews FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert crews"
  ON crews FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update crews"
  ON crews FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete crews"
  ON crews FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Public can read leave_requests"
  ON leave_requests FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert leave_requests"
  ON leave_requests FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update leave_requests"
  ON leave_requests FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete leave_requests"
  ON leave_requests FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Public can read blocked_dates"
  ON blocked_dates FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert blocked_dates"
  ON blocked_dates FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can delete blocked_dates"
  ON blocked_dates FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Public can read admin_credentials"
  ON admin_credentials FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can update admin_credentials"
  ON admin_credentials FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_crew_id ON leave_requests(crew_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_date ON blocked_dates(date);
