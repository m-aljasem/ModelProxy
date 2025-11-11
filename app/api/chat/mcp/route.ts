import { NextRequest, NextResponse } from 'next/server'
import { authenticateToken, checkRateLimit, checkQuota, checkScope } from '@/lib/auth/middleware'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createProvider } from '@/lib/providers/factory'
import { generateCorrelationId, logUsage, structuredLog } from '@/lib/utils/logger'
import { MCPServer } from '@/lib/mcp/server'
import { MCPTool, MCPConfig } from '@/lib/mcp/types'

export const runtime = 'nodejs'
export const maxDuration = 120 // Longer timeout for MCP operations

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const correlationId = generateCorrelationId()
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                   request.headers.get('x-real-ip') ||
                   'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  try {
    // Authenticate token
    const { tokenData, error: authError } = await authenticateToken(request)
    if (!tokenData || authError) {
      return NextResponse.json(
        { error: authError || 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check scope
    if (!(await checkScope(tokenData, 'chat'))) {
      return NextResponse.json(
        { error: 'Token does not have chat scope' },
        { status: 403 }
      )
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(tokenData.id, tokenData.rateLimitPerMinute)
    if (!rateLimit.allowed) {
      await logUsage({
        tokenId: tokenData.id,
        endpointId: null,
        providerId: null,
        status: 'rate_limited',
        statusCode: 429,
        latencyMs: Date.now() - startTime,
        requestSize: 0,
        responseSize: 0,
        model: null,
        costEstimate: null,
        errorMessage: 'Rate limit exceeded',
        correlationId,
        ipAddress: clientIp,
        userAgent,
      })
      return NextResponse.json(
        { error: 'Rate limit exceeded', remaining: rateLimit.remaining },
        { status: 429, headers: { 'X-RateLimit-Remaining': rateLimit.remaining.toString() } }
      )
    }

    // Check quota
    const quota = await checkQuota(tokenData.id, tokenData.monthlyQuota)
    if (!quota.allowed) {
      return NextResponse.json(
        { error: 'Monthly quota exceeded', remaining: quota.remaining },
        { status: 429 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { endpoint, mcp_config_id, stream, ...chatRequest } = body

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Missing endpoint parameter' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Get endpoint configuration
    const { data: endpointData, error: endpointError } = await supabaseAdmin
      .from('endpoints')
      .select('*, providers(*)')
      .eq('path', endpoint)
      .eq('is_active', true)
      .single()

    if (endpointError || !endpointData) {
      return NextResponse.json(
        { error: 'Endpoint not found or inactive' },
        { status: 404 }
      )
    }

    const endpointConfig = endpointData as any

    // Get MCP config if specified
    let mcpServer: MCPServer | null = null
    if (mcp_config_id) {
      const { data: mcpConfigData, error: mcpError } = await supabaseAdmin
        .from('mcp_configs')
        .select('*')
        .eq('id', mcp_config_id)
        .eq('is_active', true)
        .single()

      if (!mcpError && mcpConfigData) {
        const mcpConfig = mcpConfigData as any as MCPConfig

        // Get tools for this MCP config
        const enabledTools = mcpConfig.enabled_tools || []
        const { data: toolsData, error: toolsError } = await supabaseAdmin
          .from('mcp_tools')
          .select('*')
          .in('id', enabledTools)
          .eq('is_active', true)

        if (!toolsError && toolsData) {
          const tools: MCPTool[] = toolsData.map((t: any) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            schema: t.schema,
            handler_type: t.handler_type,
            handler_config: t.handler_config,
            is_active: t.is_active
          }))

          mcpServer = new MCPServer(mcpConfig, tools)
        }
      }
    }

    const provider = createProvider(endpointConfig.providers.type)
    const providerConfig = {
      apiKey: endpointConfig.providers.api_key_encrypted || process.env[`${endpointConfig.providers.type.toUpperCase()}_API_KEY`],
      baseUrl: endpointConfig.providers.base_url,
      ...endpointConfig.providers.config,
    }

    // Prepare request with MCP if available
    const finalRequest = {
      model: endpointConfig.model,
      ...endpointConfig.config,
      ...chatRequest,
    }

    let messages = chatRequest.messages || []
    
    // If MCP is enabled, prepare the request with tools
    if (mcpServer) {
      const mcpRequest = mcpServer.prepareRequest(messages, finalRequest)
      messages = mcpRequest.messages as any
      
      // Add tools to request if provider supports it (OpenAI format)
      const tools = mcpRequest.tools
      if (tools && Array.isArray(tools) && tools.length > 0) {
        const finalRequestAny = finalRequest as any
        finalRequestAny.tools = tools
        finalRequestAny.tool_choice = mcpRequest.tool_choice
      }
    }

    const requestSize = JSON.stringify(body).length

    // Handle streaming
    if (stream || finalRequest.stream) {
      // For streaming with MCP, we need to handle tool calls differently
      // This is a simplified version - full implementation would handle tool calls in stream
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const encoder = new TextEncoder()
            for await (const chunk of provider.chatCompletionStream(finalRequest, providerConfig)) {
              const data = `data: ${JSON.stringify(chunk)}\n\n`
              controller.enqueue(encoder.encode(data))
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()

            const latencyMs = Date.now() - startTime
            await logUsage({
              tokenId: tokenData.id,
              endpointId: endpointConfig.id,
              providerId: endpointConfig.provider_id,
              status: 'success',
              statusCode: 200,
              latencyMs,
              requestSize,
              responseSize: 0,
              model: endpointConfig.model,
              costEstimate: null,
              errorMessage: null,
              correlationId,
              ipAddress: clientIp,
              userAgent,
            })
          } catch (error: any) {
            structuredLog('error', 'MCP streaming error', { correlationId, error: error.message })
            const latencyMs = Date.now() - startTime
            await logUsage({
              tokenId: tokenData.id,
              endpointId: endpointConfig.id,
              providerId: endpointConfig.provider_id,
              status: 'error',
              statusCode: 500,
              latencyMs,
              requestSize,
              responseSize: 0,
              model: endpointConfig.model,
              costEstimate: null,
              errorMessage: error.message,
              correlationId,
              ipAddress: clientIp,
              userAgent,
            })
            controller.error(error)
          }
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Correlation-ID': correlationId,
        },
      })
    }

    // Non-streaming response with MCP tool calling support
    let response = await provider.chatCompletion(finalRequest, providerConfig)
    
    // Process tool calls if MCP is enabled
    if (mcpServer && mcpServer.hasToolCalls(response)) {
      const { toolCalls } = await mcpServer.processResponse(response, messages)
      
      if (toolCalls.length > 0) {
        // Execute all tool calls
        const toolResults = await Promise.all(
          toolCalls.map(tc => mcpServer!.executeTool(tc))
        )

        // Add tool results to messages and make another request
        const toolMessages = toolResults.map(tr => 
          mcpServer!.createToolResponseMessage(tr.tool_call_id, tr.content)
        )

        const nextRequest = {
          ...finalRequest,
          messages: [
            ...messages,
            response.choices[0].message as any,
            ...toolMessages
          ]
        }

        // Make follow-up request with tool results
        response = await provider.chatCompletion(nextRequest, providerConfig)
      }
    }

    const responseSize = JSON.stringify(response).length
    const latencyMs = Date.now() - startTime

    await logUsage({
      tokenId: tokenData.id,
      endpointId: endpointConfig.id,
      providerId: endpointConfig.provider_id,
      status: 'success',
      statusCode: 200,
      latencyMs,
      requestSize,
      responseSize,
      model: endpointConfig.model,
      costEstimate: null,
      errorMessage: null,
      correlationId,
      ipAddress: clientIp,
      userAgent,
    })

    return NextResponse.json(response, {
      headers: {
        'X-Correlation-ID': correlationId,
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      },
    })
  } catch (error: any) {
    structuredLog('error', 'MCP Chat API error', { correlationId, error: error.message })
    const latencyMs = Date.now() - startTime
    return NextResponse.json(
      { error: error.message || 'Internal server error', correlationId },
      { status: 500 }
    )
  }
}

