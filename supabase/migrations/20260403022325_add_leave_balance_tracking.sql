/*
  # Add Leave Balance Tracking System

  1. New Columns
    - Add `annual_leave_balance` to `crews` table (default 14 days per year)
    - Add `off_days_taken` to track off days used
    - Add `year` to leave_requests to track which year the leave belongs to
  
  2. Changes
    - Crews will have annual leave balance tracking
    - System will deduct from balance when requests are approved
    - Each crew starts with 14 annual leave days per year (Malaysian standard)
  
  3. Important Notes
    - Off days and shift swaps don't count against annual leave
    - Only "Annual Leave" and "Birthday Leave" types deduct from balance
    - Balance resets annually
*/

-- Add leave balance columns to crews table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crews' AND column_name = 'annual_leave_balance'
  ) THEN
    ALTER TABLE crews ADD COLUMN annual_leave_balance integer DEFAULT 14;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crews' AND column_name = 'leave_year'
  ) THEN
    ALTER TABLE crews ADD COLUMN leave_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);
  END IF;
END $$;

-- Add year tracking to leave requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leave_requests' AND column_name = 'year'
  ) THEN
    ALTER TABLE leave_requests ADD COLUMN year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);
  END IF;
END $$;

-- Update existing leave requests with year from date_start
UPDATE leave_requests
SET year = EXTRACT(YEAR FROM date_start::date)
WHERE year IS NULL OR year = EXTRACT(YEAR FROM CURRENT_DATE);