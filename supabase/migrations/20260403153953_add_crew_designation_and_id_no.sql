/*
  # Add Designation and ID Number to Crew Members

  1. Changes
    - Add `designation` column to crew_members table with the following options:
      - Crew Trainer
      - Core Crew
      - Part Time Crew
      - Barista
      - GEL
      - MDS
      - VIP
    - Add `id_no` column for employee ID number
    - Update existing crew_members with default designation
  
  2. Security
    - No RLS changes needed (inherits existing policies)
*/

-- Add designation and id_no columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crew_members' AND column_name = 'designation'
  ) THEN
    ALTER TABLE crew_members ADD COLUMN designation text DEFAULT 'Core Crew';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crew_members' AND column_name = 'id_no'
  ) THEN
    ALTER TABLE crew_members ADD COLUMN id_no text DEFAULT '';
  END IF;
END $$;

-- Update leave_requests table to include designation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leave_requests' AND column_name = 'designation'
  ) THEN
    ALTER TABLE leave_requests ADD COLUMN designation text DEFAULT 'Core Crew';
  END IF;
END $$;
