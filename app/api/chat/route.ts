import { NextRequest, NextResponse } from 'next/server'
import { authenticateToken, checkRateLimit, checkQuota, checkScope } from '@/lib/auth/middleware'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createProvider } from '@/lib/providers/factory'
import { generateCorrelationId, logUsage, structuredLog } from '@/lib/utils/logger'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const correlationId = generateCorrelationId()
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                   request.headers.get('x-real-ip') ||
                   'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  // Variables that might be needed in catch block
  let tokenData: any = null
  let body: any = null
  let endpointConfig: any = null

  try {
    // Parse request body first to get endpoint
    body = await request.json()
    const { endpoint, mcp_config_id, stream, ...chatRequest } = body

    // Also check query parameter for MCP config
    const { searchParams } = new URL(request.url)
    const mcpConfigId = mcp_config_id || searchParams.get('mcp_config_id')

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Missing endpoint parameter' },
        { status: 400 }
      )
    }

    // Get endpoint configuration
    if (!supabaseAdmin) {
      console.error('Supabase admin client not initialized - check environment variables')
      return NextResponse.json(
        { 
          error: 'Server configuration error: Supabase admin client not initialized. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.',
          details: {
            hasUrl: !!process.env.SUPABASE_URL,
            hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
          }
        },
        { status: 500 }
      )
    }

    const { data: endpointData, error: endpointError } = await supabaseAdmin
      .from('endpoints')
      .select('*, providers(*)')
      .eq('path', endpoint)
      .eq('is_active', true)
      .single()

    if (endpointError) {
      console.error('Database error fetching endpoint:', endpointError)
      
      // Check for authentication errors
      if (endpointError.code === 'PGRST301' || endpointError.message?.includes('JWT') || endpointError.message?.includes('401')) {
        return NextResponse.json(
          { 
            error: 'Authentication failed. Please verify SUPABASE_SERVICE_ROLE_KEY is correct.',
            details: endpointError.details || null,
            code: endpointError.code || null
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { 
          error: endpointError.message || 'Failed to fetch endpoint configuration',
          details: endpointError.details || null,
          code: endpointError.code || null
        },
        { status: 500 }
      )
    }

    if (!endpointData) {
      return NextResponse.json(
        { error: 'Endpoint not found or inactive' },
        { status: 404 }
      )
    }

    // Type assertion for joined query result
    endpointConfig = endpointData as any
    if (!endpointConfig.providers) {
      return NextResponse.json(
        { error: 'Provider configuration not found' },
        { status: 500 }
      )
    }

    // Check if authentication is required for this endpoint
    const requiresAuth = endpointConfig.requires_auth !== false // Default to true if not set
    let rateLimit: { allowed: boolean; remaining: number } | null = null

    // Authenticate token if required
    if (requiresAuth) {
      const authResult = await authenticateToken(request)
      tokenData = authResult.tokenData
      if (!tokenData || authResult.error) {
        return NextResponse.json(
          { error: authResult.error || 'Unauthorized' },
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
      rateLimit = await checkRateLimit(tokenData.id, tokenData.rateLimitPerMinute)
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
    }

    const provider = createProvider(endpointConfig.providers.type)
    const providerConfig = {
      apiKey: endpointConfig.providers.api_key_encrypted || process.env[`${endpointConfig.providers.type.toUpperCase()}_API_KEY`],
      baseUrl: endpointConfig.providers.base_url,
      ...endpointConfig.providers.config,
    }

    // Load MCP config if specified
    let mcpServer: any = null
    if (mcpConfigId) {
      try {
        const { MCPServer } = await import('@/lib/mcp/server')
        // Types imported for type checking only

        const { data: mcpConfigData, error: mcpError } = await supabaseAdmin
          .from('mcp_configs')
          .select('*')
          .eq('id', mcpConfigId)
          .eq('is_active', true)
          .single()

        if (!mcpError && mcpConfigData) {
          const mcpConfig = mcpConfigData as any

          const enabledTools = mcpConfig.enabled_tools || []
          const { data: toolsData, error: toolsError } = await supabaseAdmin
            .from('mcp_tools')
            .select('*')
            .in('id', enabledTools)
            .eq('is_active', true)

          if (!toolsError && toolsData) {
            const tools = toolsData.map((t: any) => ({
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
      } catch (error) {
        structuredLog('warn', 'Failed to load MCP config', { correlationId, error: (error as Error).message })
      }
    }

    // Merge endpoint config with request
    // Use endpoint's model if not provided in request, otherwise use request model
    let finalRequest = {
      ...endpointConfig.config,
      ...chatRequest,
      // Ensure model is set (use request model if provided, otherwise use endpoint's model)
      model: chatRequest.model || endpointConfig.model,
    }

    // Prepare request with MCP if available
    if (mcpServer) {
      const mcpRequest = mcpServer.prepareRequest(chatRequest.messages || [], finalRequest)
      finalRequest = {
        ...finalRequest,
        messages: mcpRequest.messages as any,
      }
      
      // Add tools to request if provider supports it
      if (mcpRequest.tools && mcpRequest.tools.length > 0) {
        (finalRequest as any).tools = mcpRequest.tools
        (finalRequest as any).tool_choice = mcpRequest.tool_choice
      }
    }

    const requestSize = JSON.stringify(body).length

    // Handle streaming
    if (stream || finalRequest.stream) {
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
              tokenId: tokenData?.id || null,
              endpointId: endpointConfig.id,
              providerId: endpointConfig.provider_id,
              status: 'success',
              statusCode: 200,
              latencyMs,
              requestSize,
              responseSize: 0, // Streaming, size unknown
              model: finalRequest.model,
              costEstimate: null,
              errorMessage: null,
              correlationId,
              ipAddress: clientIp,
              userAgent,
            })
          } catch (error: any) {
            // Extract status code from provider errors
            let statusCode = 500
            let errorMessage = error.message || 'Streaming error'

            if (error.response) {
              statusCode = error.response.status || 500
              errorMessage = error.response.data?.error?.message || 
                           error.response.data?.error || 
                           errorMessage
            } else if (error.status) {
              statusCode = error.status
            } else if (error.message?.includes('status code')) {
              const match = error.message.match(/status code (\d+)/)
              if (match) {
                statusCode = parseInt(match[1])
              }
            }

            structuredLog('error', 'Streaming error', { 
              correlationId, 
              error: errorMessage,
              statusCode
            })
            const latencyMs = Date.now() - startTime
            await logUsage({
              tokenId: tokenData?.id || null,
              endpointId: endpointConfig.id,
              providerId: endpointConfig.provider_id,
              status: 'error',
              statusCode,
              latencyMs,
              requestSize,
              responseSize: 0,
              model: finalRequest.model,
              costEstimate: null,
              errorMessage: errorMessage,
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

    // Non-streaming response
    let response = await provider.chatCompletion(finalRequest, providerConfig)
    
    // Process tool calls if MCP is enabled
    if (mcpServer && mcpServer.hasToolCalls(response)) {
      const { toolCalls } = await mcpServer.processResponse(response, chatRequest.messages || [])
      
      if (toolCalls.length > 0) {
        // Execute all tool calls
        const toolResults = await Promise.all(
          toolCalls.map((tc: any) => mcpServer.executeTool(tc))
        )

        // Add tool results to messages and make another request
        const toolMessages = toolResults.map(tr => 
          mcpServer.createToolResponseMessage(tr.tool_call_id, tr.content)
        )

        const nextRequest = {
          ...finalRequest,
          messages: [
            ...(chatRequest.messages || []),
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
      tokenId: tokenData?.id || null,
      endpointId: endpointConfig.id,
      providerId: endpointConfig.provider_id,
      status: 'success',
      statusCode: 200,
      latencyMs,
      requestSize,
      responseSize,
      model: finalRequest.model,
      costEstimate: null,
      errorMessage: null,
      correlationId,
      ipAddress: clientIp,
      userAgent,
    })

    const headers: Record<string, string> = {
      'X-Correlation-ID': correlationId,
    }
    if (rateLimit) {
      headers['X-RateLimit-Remaining'] = rateLimit.remaining.toString()
    }

    return NextResponse.json(response, { headers })
  } catch (error: any) {
    // Extract status code from provider errors
    let statusCode = 500
    let errorMessage = error.message || 'Internal server error'
    let errorDetails: any = null

    // Handle axios errors (OpenRouter, custom providers)
    if (error.response) {
      statusCode = error.response.status || 500
      errorMessage = error.response.data?.error?.message || 
                     error.response.data?.error || 
                     errorMessage
      errorDetails = error.response.data
    }
    // Handle OpenAI SDK errors
    else if (error.status) {
      statusCode = error.status
      errorMessage = error.message || errorMessage
    }
    // Handle errors with status code in message (e.g., "Request failed with status code 402")
    else if (error.message?.includes('status code')) {
      const match = error.message.match(/status code (\d+)/)
      if (match) {
        statusCode = parseInt(match[1])
      }
    }

    structuredLog('error', 'Chat API error', { 
      correlationId, 
      error: errorMessage,
      statusCode,
      providerError: error.response?.data || error.details
    })

    const latencyMs = Date.now() - startTime
    
    // Log usage with error status
    try {
      await logUsage({
        tokenId: tokenData?.id || null,
        endpointId: endpointConfig?.id || null,
        providerId: endpointConfig?.provider_id || null,
        status: 'error',
        statusCode,
        latencyMs,
        requestSize: body ? JSON.stringify(body).length : 0,
        responseSize: 0,
        model: endpointConfig?.model || null,
        costEstimate: null,
        errorMessage: errorMessage,
        correlationId,
        ipAddress: clientIp,
        userAgent,
      })
    } catch (logError) {
      // Don't fail if logging fails
      console.error('Failed to log usage:', logError)
    }

    return NextResponse.json(
      { 
        error: errorMessage, 
        correlationId,
        ...(errorDetails && { details: errorDetails })
      },
      { status: statusCode }
    )
  }
}

