-- Create models table
-- This allows users to pre-define models for each provider

CREATE TABLE IF NOT EXISTS models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  model_identifier VARCHAR(255) NOT NULL, -- The actual model identifier (e.g., 'gpt-4', 'claude-3-opus')
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider_id, model_identifier) -- Ensure unique model per provider
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_models_provider_id ON models(provider_id);
CREATE INDEX IF NOT EXISTS idx_models_is_active ON models(is_active);

-- Add trigger for updated_at
CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE models ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage models" ON models
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
    )
  );

CREATE POLICY "All authenticated users can view models" ON models
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Add model_id column to endpoints table (optional - for linking to predefined models)
ALTER TABLE endpoints 
ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES models(id) ON DELETE SET NULL;

-- Add index for model_id
CREATE INDEX IF NOT EXISTS idx_endpoints_model_id ON endpoints(model_id);

