-- Add token_id column to endpoints table
-- This allows endpoints to be associated with a specific API token for documentation purposes

ALTER TABLE endpoints 
ADD COLUMN IF NOT EXISTS token_id UUID REFERENCES api_tokens(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_endpoints_token_id ON endpoints(token_id);

