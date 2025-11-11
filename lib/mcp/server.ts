// MCP Server - Wraps any model with MCP capabilities

import { MCPTool, MCPConfig, ToolCall, ToolCallResult, MCPMessage, MCPChatRequest, MCPChatResponse, MCPToolDefinition } from './types'
import { ChatMessage, ChatCompletionRequest, ChatCompletionResponse } from '../providers/types'

export class MCPServer {
  private tools: Map<string, MCPTool> = new Map()
  private config: MCPConfig | null = null

  constructor(config: MCPConfig, tools: MCPTool[]) {
    this.config = config
    tools.forEach(tool => {
      if (tool.is_active) {
        this.tools.set(tool.name, tool)
      }
    })
  }

  /**
   * Convert regular chat messages to MCP format with tool definitions
   */
  prepareRequest(messages: ChatMessage[], baseRequest: ChatCompletionRequest): MCPChatRequest {
    const mcpMessages: MCPMessage[] = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    // Add system prompt if configured
    if (this.config?.system_prompt) {
      mcpMessages.unshift({
        role: 'system',
        content: this.config.system_prompt
      })
    }

    // Get enabled tools
    const enabledTools = this.getEnabledTools()

    // Convert to OpenAI-compatible tool format
    const tools: MCPToolDefinition[] = enabledTools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.schema
      }
    }))

    return {
      ...baseRequest,
      messages: mcpMessages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined
    }
  }

  /**
   * Process a chat completion response and handle tool calls
   */
  async processResponse(
    response: ChatCompletionResponse,
    originalMessages: ChatMessage[]
  ): Promise<{ response: ChatCompletionResponse; toolCalls: ToolCall[] }> {
    const toolCalls: ToolCall[] = []
    const choices = response.choices.map(choice => {
      // Check if the model wants to call tools
      const message = choice.message as any
      
      if (message.tool_calls && Array.isArray(message.tool_calls)) {
        // Extract tool calls from the response
        message.tool_calls.forEach((tc: any) => {
          toolCalls.push({
            id: tc.id || `call_${Date.now()}_${Math.random()}`,
            name: tc.function?.name || '',
            arguments: typeof tc.function?.arguments === 'string' 
              ? JSON.parse(tc.function.arguments) 
              : tc.function?.arguments || {}
          })
        })
      }

      return choice
    })

    return {
      response: {
        ...response,
        choices
      },
      toolCalls
    }
  }

  /**
   * Execute a tool call
   */
  async executeTool(toolCall: ToolCall): Promise<ToolCallResult> {
    const tool = this.tools.get(toolCall.name)
    
    if (!tool) {
      return {
        tool_call_id: toolCall.id,
        content: `Error: Tool "${toolCall.name}" not found`,
        is_error: true
      }
    }

    try {
      let result: any

      switch (tool.handler_type) {
        case 'http':
          result = await this.executeHttpTool(tool, toolCall.arguments)
          break
        case 'function':
          result = await this.executeFunctionTool(tool, toolCall.arguments)
          break
        case 'script':
          result = await this.executeScriptTool(tool, toolCall.arguments)
          break
        default:
          throw new Error(`Unknown handler type: ${tool.handler_type}`)
      }

      return {
        tool_call_id: toolCall.id,
        content: typeof result === 'string' ? result : JSON.stringify(result)
      }
    } catch (error: any) {
      return {
        tool_call_id: toolCall.id,
        content: `Error executing tool: ${error.message}`,
        is_error: true
      }
    }
  }

  /**
   * Execute HTTP-based tool
   */
  private async executeHttpTool(tool: MCPTool, args: Record<string, any>): Promise<any> {
    const config = tool.handler_config
    let url = config.url || ''
    const method = config.method || 'GET'
    const headers = config.headers || {}

    // Replace placeholders in URL
    Object.keys(args).forEach(key => {
      url = url.replace(`{${key}}`, encodeURIComponent(args[key]))
    })

    // Replace API_KEY placeholder if exists
    if (url.includes('{API_KEY}')) {
      // You might want to get this from environment or config
      url = url.replace('{API_KEY}', process.env.WEATHER_API_KEY || '')
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }

    if (method !== 'GET' && config.body) {
      fetchOptions.body = JSON.stringify(config.body)
    }

    const response = await fetch(url, fetchOptions)
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Execute function-based tool (sandboxed evaluation)
   */
  private async executeFunctionTool(tool: MCPTool, args: Record<string, any>): Promise<any> {
    const config = tool.handler_config
    
    if (config.type === 'eval') {
      // For calculate tool
      if (tool.name === 'calculate') {
        const expression = args.expression || ''
        // Basic safety check - only allow numbers and basic operators
        if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
          throw new Error('Invalid expression: only numbers and basic operators allowed')
        }
        // Use Function constructor for safer evaluation
        try {
          const result = Function(`"use strict"; return (${expression})`)()
          return { result, expression }
        } catch (error: any) {
          throw new Error(`Calculation error: ${error.message}`)
        }
      }
    }

    throw new Error(`Unknown function type: ${config.type}`)
  }

  /**
   * Execute script-based tool
   */
  private async executeScriptTool(tool: MCPTool, args: Record<string, any>): Promise<any> {
    // For future implementation - could run custom scripts
    throw new Error('Script tools not yet implemented')
  }

  /**
   * Get enabled tools for this MCP config
   */
  private getEnabledTools(): MCPTool[] {
    if (!this.config) return []
    
    return Array.from(this.tools.values()).filter(tool => 
      this.config!.enabled_tools.includes(tool.id)
    )
  }

  /**
   * Create tool response message for the model
   */
  createToolResponseMessage(toolCallId: string, content: string): MCPMessage {
    return {
      role: 'tool',
      content,
      tool_call_id: toolCallId
    }
  }

  /**
   * Check if a model response contains tool calls
   */
  hasToolCalls(response: ChatCompletionResponse): boolean {
    return response.choices.some(choice => {
      const message = choice.message as any
      return message.tool_calls && Array.isArray(message.tool_calls) && message.tool_calls.length > 0
    })
  }
}

