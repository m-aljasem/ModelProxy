-- Migration: Add requires_auth field to endpoints table
-- This allows endpoints to be used without API token authentication

ALTER TABLE endpoints 
ADD COLUMN IF NOT EXISTS requires_auth BOOLEAN DEFAULT true;

-- Update existing endpoints to require auth by default (backward compatible)
UPDATE endpoints 
SET requires_auth = true 
WHERE requires_auth IS NULL;

