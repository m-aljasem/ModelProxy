-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Roles enum
CREATE TYPE user_role AS ENUM ('admin', 'operator', 'viewer');

-- Provider type enum
CREATE TYPE provider_type AS ENUM ('openai', 'openrouter', 'custom');

-- Token scope enum
CREATE TYPE token_scope AS ENUM ('chat', 'embeddings', 'models', 'all');

-- Request status enum
CREATE TYPE request_status AS ENUM ('success', 'error', 'timeout', 'rate_limited');

-- Providers table
CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  type provider_type NOT NULL,
  api_key_encrypted TEXT, -- Encrypted API key (use Supabase Vault or encrypt before storing)
  base_url TEXT,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Endpoints table (configurations for API endpoints)
CREATE TABLE endpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  model VARCHAR(255) NOT NULL,
  path VARCHAR(255) NOT NULL, -- e.g., '/api/chat', '/api/embeddings'
  config JSONB DEFAULT '{}', -- Provider-specific config (temperature, max_tokens, etc.)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Tokens table
CREATE TABLE api_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  token_hash TEXT NOT NULL UNIQUE, -- bcrypt hash of the token
  scopes token_scope[] DEFAULT ARRAY['all']::token_scope[],
  rate_limit_per_minute INTEGER DEFAULT 60,
  monthly_quota INTEGER, -- NULL means unlimited
  ip_whitelist TEXT[], -- Array of allowed IPs, empty means all
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Usage tracking table
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id UUID REFERENCES api_tokens(id) ON DELETE SET NULL,
  endpoint_id UUID REFERENCES endpoints(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  status request_status NOT NULL,
  status_code INTEGER,
  latency_ms INTEGER,
  request_size INTEGER,
  response_size INTEGER,
  model VARCHAR(255),
  cost_estimate DECIMAL(10, 6), -- Estimated cost in USD
  error_message TEXT,
  correlation_id UUID, -- For tracing requests
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL, -- e.g., 'token.created', 'endpoint.updated'
  resource_type VARCHAR(255) NOT NULL, -- e.g., 'token', 'endpoint', 'provider'
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_endpoints_provider_id ON endpoints(provider_id);
CREATE INDEX idx_endpoints_path ON endpoints(path);
CREATE INDEX idx_usage_logs_token_id ON usage_logs(token_id);
CREATE INDEX idx_usage_logs_endpoint_id ON usage_logs(endpoint_id);
CREATE INDEX idx_usage_logs_provider_id ON usage_logs(provider_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX idx_usage_logs_correlation_id ON usage_logs(correlation_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_api_tokens_token_hash ON api_tokens(token_hash);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_endpoints_updated_at BEFORE UPDATE ON endpoints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_tokens_updated_at BEFORE UPDATE ON api_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies: Admins can do everything
CREATE POLICY "Admins can manage providers" ON providers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
    )
  );

CREATE POLICY "Admins and operators can view providers" ON providers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role')::text IN ('admin', 'operator', 'viewer')
    )
  );

-- Similar policies for other tables
CREATE POLICY "Admins can manage endpoints" ON endpoints
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
    )
  );

CREATE POLICY "All authenticated users can view endpoints" ON endpoints
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage tokens" ON api_tokens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
    )
  );

CREATE POLICY "All authenticated users can view tokens" ON api_tokens
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can view usage logs" ON usage_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
    )
  );

-- Function to log usage (called from application)
CREATE OR REPLACE FUNCTION log_usage(
  p_token_id UUID,
  p_endpoint_id UUID,
  p_provider_id UUID,
  p_status request_status,
  p_status_code INTEGER,
  p_latency_ms INTEGER,
  p_request_size INTEGER,
  p_response_size INTEGER,
  p_model VARCHAR,
  p_cost_estimate DECIMAL,
  p_error_message TEXT,
  p_correlation_id UUID,
  p_ip_address INET,
  p_user_agent TEXT
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO usage_logs (
    token_id, endpoint_id, provider_id, status, status_code,
    latency_ms, request_size, response_size, model, cost_estimate,
    error_message, correlation_id, ip_address, user_agent
  ) VALUES (
    p_token_id, p_endpoint_id, p_provider_id, p_status, p_status_code,
    p_latency_ms, p_request_size, p_response_size, p_model, p_cost_estimate,
    p_error_message, p_correlation_id, p_ip_address, p_user_agent
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

