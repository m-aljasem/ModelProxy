// MCP (Model Context Protocol) Types

export interface MCPTool {
  id: string
  name: string
  description: string
  schema: {
    type: string
    properties: Record<string, any>
    required?: string[]
  }
  handler_type: 'http' | 'function' | 'script'
  handler_config: Record<string, any>
  is_active: boolean
}

export interface MCPConfig {
  id: string
  name: string
  endpoint_id: string
  description?: string
  enabled_tools: string[]
  system_prompt?: string
  config: Record<string, any>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, any>
}

export interface ToolCallResult {
  tool_call_id: string
  content: string
  is_error?: boolean
}

export interface MCPMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

export interface MCPToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: string
      properties: Record<string, any>
      required?: string[]
    }
  }
}

export interface MCPChatRequest {
  model: string
  messages: MCPMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
  tools?: MCPToolDefinition[]
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } }
}

export interface MCPChatResponse {
  id: string
  model: string
  choices: Array<{
    index: number
    message: MCPMessage
    finish_reason: string | null
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

