# MCP (Model Context Protocol) Features

ModelProxy now includes powerful MCP capabilities that allow you to add tool-calling and function execution abilities to any model, even if the model doesn't natively support it.

## Overview

MCP (Model Context Protocol) enables models to:
- Call external tools and functions
- Access web APIs
- Perform calculations
- Execute custom scripts
- And much more!

## Key Features

### 1. **MCP for Any Model**
   - Add MCP capabilities to models that don't natively support tool calling
   - Works with OpenAI, OpenRouter, and custom providers
   - Seamless integration with existing endpoints

### 2. **Custom MCP Builder**
   - Create your own tools with a visual builder
   - Support for HTTP requests, functions, and scripts
   - Define tool schemas with JSON Schema

### 3. **MCP Configurations**
   - Link MCP capabilities to specific endpoints
   - Enable/disable tools per configuration
   - Custom system prompts for MCP behavior

## Getting Started

### Step 1: Run the Database Migration

First, apply the MCP schema to your database:

```sql
-- Run the contents of supabase/mcp_schema.sql in your Supabase SQL editor
```

This will create:
- `mcp_tools` table - stores available tools
- `mcp_configs` table - links endpoints to MCP capabilities
- `mcp_tool_calls` table - logs tool usage

### Step 2: Create Your First Tool

1. Navigate to **Dashboard > MCP Builder**
2. Click **New Tool**
3. Fill in:
   - **Name**: A unique identifier (e.g., `web_search`)
   - **Description**: What the tool does
   - **Handler Type**: Choose from HTTP, Function, or Script
   - **Schema**: Define the input parameters
   - **Handler Config**: Configuration for the handler

#### Example: Web Search Tool

```json
{
  "name": "web_search",
  "description": "Search the web for information",
  "handler_type": "http",
  "schema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Search query"
      }
    },
    "required": ["query"]
  },
  "handler_config": {
    "url": "https://api.duckduckgo.com/?q={query}&format=json",
    "method": "GET"
  }
}
```

### Step 3: Create an MCP Configuration

1. Navigate to **Dashboard > MCP Configs**
2. Click **New MCP Config**
3. Select an endpoint
4. Choose which tools to enable
5. Optionally add a system prompt

### Step 4: Use MCP in Chat Requests

#### Using the MCP Chat Endpoint

```bash
curl -X POST https://your-domain.com/api/chat/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "/api/chat",
    "mcp_config_id": "your-mcp-config-id",
    "messages": [
      {
        "role": "user",
        "content": "What is the weather in San Francisco?"
      }
    ]
  }'
```

#### Using the Regular Chat Endpoint with MCP

You can also use the regular chat endpoint and specify MCP config via query parameter:

```bash
curl -X POST "https://your-domain.com/api/chat?mcp_config_id=your-mcp-config-id" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "/api/chat",
    "messages": [
      {
        "role": "user",
        "content": "Calculate 123 * 456"
      }
    ]
  }'
```

## Tool Types

### HTTP Tools
Execute HTTP requests to external APIs.

**Handler Config Example:**
```json
{
  "url": "https://api.example.com/endpoint?param={param}",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer {API_KEY}"
  }
}
```

URL placeholders `{param}` are replaced with actual values from tool arguments.

### Function Tools
Execute JavaScript functions (sandboxed).

**Handler Config Example:**
```json
{
  "type": "eval",
  "sandbox": true
}
```

Currently supports calculation functions. More function types coming soon!

### Script Tools
Execute custom scripts (coming soon).

## How It Works

1. **Request Processing**: When a chat request includes an MCP config, the system:
   - Loads the MCP configuration and enabled tools
   - Injects tool definitions into the request
   - Adds a system prompt if configured

2. **Tool Calling**: If the model requests a tool call:
   - The system executes the tool
   - Returns the result to the model
   - Makes a follow-up request with tool results

3. **Response**: The final response includes both the model's reasoning and tool results.

## API Reference

### List MCP Tools
```bash
GET /api/mcp/tools
```

### Create MCP Tool
```bash
POST /api/mcp/tools
Content-Type: application/json

{
  "name": "tool_name",
  "description": "Tool description",
  "schema": { ... },
  "handler_type": "http",
  "handler_config": { ... }
}
```

### List MCP Configs
```bash
GET /api/mcp/configs
```

### Create MCP Config
```bash
POST /api/mcp/configs
Content-Type: application/json

{
  "name": "config_name",
  "endpoint_id": "endpoint-uuid",
  "enabled_tools": ["tool-id-1", "tool-id-2"],
  "system_prompt": "Optional system prompt",
  "description": "Optional description"
}
```

### MCP Chat Endpoint
```bash
POST /api/chat/mcp
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "endpoint": "/api/chat",
  "mcp_config_id": "mcp-config-uuid",
  "messages": [...],
  "stream": false
}
```

## Best Practices

1. **Tool Naming**: Use descriptive, lowercase names with underscores (e.g., `get_weather`, `calculate_sum`)

2. **Schema Design**: 
   - Make parameters clear and well-described
   - Mark required parameters appropriately
   - Use appropriate types (string, number, boolean, object, array)

3. **Error Handling**: Tools should return clear error messages if something goes wrong

4. **Security**: 
   - Don't expose sensitive API keys in handler configs
   - Use environment variables for API keys
   - Validate tool inputs

5. **System Prompts**: Use system prompts to guide the model on when and how to use tools

## Examples

### Example 1: Weather Tool

```json
{
  "name": "get_weather",
  "description": "Get current weather for a location",
  "schema": {
    "type": "object",
    "properties": {
      "location": {
        "type": "string",
        "description": "City name or coordinates"
      },
      "units": {
        "type": "string",
        "enum": ["celsius", "fahrenheit"],
        "default": "celsius"
      }
    },
    "required": ["location"]
  },
  "handler_type": "http",
  "handler_config": {
    "url": "https://api.openweathermap.org/data/2.5/weather?q={location}&units={units}&appid={API_KEY}",
    "method": "GET"
  }
}
```

### Example 2: Calculator Tool

```json
{
  "name": "calculate",
  "description": "Perform mathematical calculations",
  "schema": {
    "type": "object",
    "properties": {
      "expression": {
        "type": "string",
        "description": "Mathematical expression to evaluate"
      }
    },
    "required": ["expression"]
  },
  "handler_type": "function",
  "handler_config": {
    "type": "eval",
    "sandbox": true
  }
}
```

## Troubleshooting

### Tool Not Executing
- Check that the MCP config is active
- Verify the tool is enabled in the MCP config
- Check the model supports function calling (or use MCP wrapper)

### Tool Execution Errors
- Verify handler config is correct
- Check API keys are set in environment variables
- Review tool call logs in the dashboard

### Model Not Using Tools
- Add a system prompt explaining when to use tools
- Ensure tool descriptions are clear
- Check that the model supports function calling format

## Future Enhancements

- [ ] Streaming support for tool calls
- [ ] More function types
- [ ] Script execution
- [ ] Tool call chaining
- [ ] Tool usage analytics
- [ ] Pre-built tool library

## Support

For issues or questions, please check:
- Dashboard logs for tool execution errors
- API response error messages
- Database `mcp_tool_calls` table for execution history

