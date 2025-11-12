-- Migration: Add openai_compatible field to endpoints table
-- This enables OpenAI-style path compatibility (e.g., /v1/chat/completions after endpoint path)

ALTER TABLE endpoints 
ADD COLUMN IF NOT EXISTS openai_compatible BOOLEAN DEFAULT false;

-- Update existing endpoints to not have OpenAI compatibility by default (backward compatible)
UPDATE endpoints 
SET openai_compatible = false 
WHERE openai_compatible IS NULL;

