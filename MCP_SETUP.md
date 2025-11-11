# MCP Setup Instructions

## Quick Start

### 1. Database Setup

Run the MCP schema migration in your Supabase SQL editor:

```bash
# Copy and paste the contents of supabase/mcp_schema.sql
```

Or run it via Supabase CLI:
```bash
supabase db execute -f supabase/mcp_schema.sql
```

### 2. Verify Installation

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the dashboard and check for:
   - **MCP Configs** in the sidebar
   - **MCP Builder** in the sidebar

3. You should see 3 default tools pre-installed:
   - `web_search`
   - `get_weather`
   - `calculate`

### 3. Create Your First MCP Config

1. Go to **Dashboard > MCP Configs**
2. Click **New MCP Config**
3. Select an endpoint
4. Choose tools to enable
5. Save

### 4. Test MCP

Use the chat endpoint with MCP:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "/api/chat",
    "mcp_config_id": "your-mcp-config-id",
    "messages": [
      {
        "role": "user",
        "content": "What is 123 * 456?"
      }
    ]
  }'
```

## Environment Variables

No additional environment variables are required for basic MCP functionality. However, if you create tools that use external APIs, you may need to set:

- `WEATHER_API_KEY` - For weather tools (if using OpenWeatherMap)
- Other API keys as needed for your custom tools

## Troubleshooting

### MCP Config Not Found
- Ensure the MCP config ID is correct
- Check that the MCP config is active
- Verify the endpoint is active

### Tools Not Executing
- Check tool handler configuration
- Verify API keys are set (if needed)
- Review tool call logs in the database

### Database Errors
- Ensure you've run the migration
- Check Supabase connection
- Verify RLS policies are set correctly

## Next Steps

- Read [MCP_FEATURES.md](./MCP_FEATURES.md) for detailed documentation
- Explore the MCP Builder to create custom tools
- Check the API reference for integration examples

