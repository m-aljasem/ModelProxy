-- MCP (Model Context Protocol) Schema Extension

-- MCP Tools table - stores available tools/functions that can be called
CREATE TABLE IF NOT EXISTS mcp_tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  schema JSONB NOT NULL, -- JSON Schema for the tool parameters
  handler_type VARCHAR(50) NOT NULL DEFAULT 'http', -- 'http', 'function', 'script'
  handler_config JSONB DEFAULT '{}', -- Configuration for the handler (URL, code, etc.)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MCP Configurations table - links endpoints/models to MCP capabilities
CREATE TABLE IF NOT EXISTS mcp_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  endpoint_id UUID REFERENCES endpoints(id) ON DELETE CASCADE,
  description TEXT,
  enabled_tools UUID[] DEFAULT ARRAY[]::UUID[], -- Array of mcp_tools.id
  system_prompt TEXT, -- System prompt to inject for MCP capabilities
  config JSONB DEFAULT '{}', -- Additional MCP configuration
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- MCP Tool Calls log - tracks tool usage
CREATE TABLE IF NOT EXISTS mcp_tool_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mcp_config_id UUID REFERENCES mcp_configs(id) ON DELETE SET NULL,
  tool_id UUID REFERENCES mcp_tools(id) ON DELETE SET NULL,
  endpoint_id UUID REFERENCES endpoints(id) ON DELETE SET NULL,
  token_id UUID REFERENCES api_tokens(id) ON DELETE SET NULL,
  request_data JSONB NOT NULL,
  response_data JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'error'
  error_message TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mcp_configs_endpoint_id ON mcp_configs(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_mcp_configs_is_active ON mcp_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_calls_config_id ON mcp_tool_calls(mcp_config_id);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_calls_tool_id ON mcp_tool_calls(tool_id);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_calls_created_at ON mcp_tool_calls(created_at);

-- Trigger for updated_at
CREATE TRIGGER update_mcp_tools_updated_at BEFORE UPDATE ON mcp_tools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mcp_configs_updated_at BEFORE UPDATE ON mcp_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE mcp_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_tool_calls ENABLE ROW LEVEL SECURITY;

-- Admins can manage MCP tools
CREATE POLICY "Admins can manage mcp_tools" ON mcp_tools
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
    )
  );

-- All authenticated users can view MCP tools
CREATE POLICY "All authenticated users can view mcp_tools" ON mcp_tools
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admins can manage MCP configs
CREATE POLICY "Admins can manage mcp_configs" ON mcp_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
    )
  );

-- All authenticated users can view MCP configs
CREATE POLICY "All authenticated users can view mcp_configs" ON mcp_configs
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- All authenticated users can view their own tool calls
CREATE POLICY "All authenticated users can view mcp_tool_calls" ON mcp_tool_calls
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Insert some default MCP tools
INSERT INTO mcp_tools (name, description, schema, handler_type, handler_config) VALUES
  (
    'web_search',
    'Search the web for information',
    '{"type": "object", "properties": {"query": {"type": "string", "description": "Search query"}}, "required": ["query"]}'::jsonb,
    'http',
    '{"url": "https://api.duckduckgo.com/?q={query}&format=json", "method": "GET"}'::jsonb
  ),
  (
    'get_weather',
    'Get current weather information for a location',
    '{"type": "object", "properties": {"location": {"type": "string", "description": "City name or coordinates"}, "units": {"type": "string", "enum": ["celsius", "fahrenheit"], "default": "celsius"}}, "required": ["location"]}'::jsonb,
    'http',
    '{"url": "https://api.openweathermap.org/data/2.5/weather?q={location}&appid={API_KEY}&units={units}", "method": "GET"}'::jsonb
  ),
  (
    'calculate',
    'Perform mathematical calculations',
    '{"type": "object", "properties": {"expression": {"type": "string", "description": "Mathematical expression to evaluate"}}, "required": ["expression"]}'::jsonb,
    'function',
    '{"type": "eval", "sandbox": true}'::jsonb
  )
ON CONFLICT (name) DO NOTHING;

