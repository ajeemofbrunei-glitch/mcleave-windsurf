/*
  # Add WhatsApp Enabled Column to Admin Profiles

  1. Changes
    - Add `whatsapp_enabled` column to `admin_profiles` table
    - Default value is false (OFF for all admins by default)
    - Boolean type for simple ON/OFF toggle
  
  2. Security
    - No RLS changes needed
    - Existing policies remain intact
    - Only admins can update their own whatsapp_enabled setting
*/

-- Add whatsapp_enabled column to admin_profiles
ALTER TABLE admin_profiles 
ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean DEFAULT false;