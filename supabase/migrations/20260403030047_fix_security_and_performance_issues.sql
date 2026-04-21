/*
  # Fix Security and Performance Issues

  1. Performance Optimizations
    - Add missing indexes on foreign key columns to improve query performance
    - These indexes will speed up JOIN operations and foreign key constraint checks
    
  2. Index Management
    - Remove unused index `idx_leave_requests_crew_id` since it's not being utilized
    - Add indexes for admin_id foreign keys that are actually used in queries
    
  3. Important Notes
    - Leaked Password Protection: Cannot be enabled via SQL (Dashboard-only setting)
      This must be configured in Supabase Dashboard under:
      Auth Settings > Security > Enable "Check for compromised passwords"
    
  4. Changes Made
    - Add index for blocked_dates.admin_id foreign key
    - Add index for crews.admin_id foreign key  
    - Add index for leave_requests.admin_id foreign key
    - Remove unused idx_leave_requests_crew_id index
*/

-- ====================================
-- PERFORMANCE: Add missing indexes for foreign keys
-- ====================================

-- Index for blocked_dates.admin_id (improves JOIN and filtering performance)
CREATE INDEX IF NOT EXISTS idx_blocked_dates_admin_id 
  ON blocked_dates(admin_id);

-- Index for crews.admin_id (improves JOIN and filtering performance)
CREATE INDEX IF NOT EXISTS idx_crews_admin_id 
  ON crews(admin_id);

-- Index for leave_requests.admin_id (improves JOIN and filtering performance)
CREATE INDEX IF NOT EXISTS idx_leave_requests_admin_id 
  ON leave_requests(admin_id);

-- ====================================
-- CLEANUP: Remove unused index
-- ====================================

-- This index exists but has not been used according to pg_stat_user_indexes
-- Removing it reduces storage overhead and improves write performance
DROP INDEX IF EXISTS idx_leave_requests_crew_id;
