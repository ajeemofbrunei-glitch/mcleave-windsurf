/*
  # Make crew_id nullable in leave_requests

  1. Changes
    - Alter leave_requests table to make crew_id nullable
    - This allows crew members who registered via the new system to submit leave requests
    - The crew_member_id field is the primary identifier now
  
  2. Security
    - No RLS changes
    - Maintains existing foreign key constraints
*/

ALTER TABLE leave_requests 
ALTER COLUMN crew_id DROP NOT NULL;
