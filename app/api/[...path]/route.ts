import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Catch-all route handler for OpenAI-compatible endpoints
 * Handles paths like /api/{endpoint_path}/v1/chat/completions
 */
export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(request, params, 'POST')
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(request, params, 'GET')
}

async function handleRequest(request: NextRequest, params: { path: string[] }, method: string) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error: Supabase admin client not initialized' },
        { status: 500 }
      )
    }

    // Reconstruct the full path from segments
    // params.path for /api/my-endpoint/v1/chat/completions will be ['my-endpoint', 'v1', 'chat', 'completions']
    const pathSegments = params.path || []
    const fullPath = '/api/' + pathSegments.join('/')

    // Get all active endpoints with OpenAI compatibility enabled
    const { data: endpoints, error: endpointsError } = await supabaseAdmin
      .from('endpoints')
      .select('*, providers(*)')
      .eq('is_active', true)
      .eq('openai_compatible', true)

    if (endpointsError) {
      console.error('Error fetching endpoints:', endpointsError)
      return NextResponse.json(
        { error: 'Failed to fetch endpoints' },
        { status: 500 }
      )
    }

    if (!endpoints || endpoints.length === 0) {
      // No OpenAI-compatible endpoints, return 404
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      )
    }

    // Find matching endpoint - check if the path starts with an endpoint path
    // Sort endpoints by path length (longest first) to match more specific paths first
    const sortedEndpoints = [...endpoints].sort((a, b) => b.path.length - a.path.length)
    
    let matchedEndpoint: any = null
    let remainingPath = ''

    for (const endpoint of sortedEndpoints) {
      const endpointPath = endpoint.path
      if (fullPath.startsWith(endpointPath)) {
        // Check if there's more path after the endpoint path
        const pathAfterEndpoint = fullPath.slice(endpointPath.length)
        if (pathAfterEndpoint === '' || pathAfterEndpoint.startsWith('/')) {
          matchedEndpoint = endpoint
          remainingPath = pathAfterEndpoint.startsWith('/') ? pathAfterEndpoint.slice(1) : pathAfterEndpoint
          break
        }
      }
    }

    if (!matchedEndpoint) {
      return NextResponse.json(
        { error: 'Endpoint not found or OpenAI compatibility not enabled' },
        { status: 404 }
      )
    }

    // Determine the handler based on the remaining path
    // OpenAI-style paths: /v1/chat/completions, /v1/embeddings, etc.
    const pathParts = remainingPath.split('/').filter(Boolean)
    
    // Route to appropriate handler based on path
    if (pathParts.length >= 2 && pathParts[0] === 'v1') {
      const resource = pathParts[1] // 'chat', 'embeddings', etc.
      
      if (resource === 'chat' || resource === 'chat/completions') {
        // Route to chat handler
        return await handleChatRequest(request, matchedEndpoint)
      } else if (resource === 'embeddings') {
        // Route to embeddings handler
        return await handleEmbeddingsRequest(request, matchedEndpoint)
      } else if (resource === 'models') {
        // Route to models handler (GET only for listing models)
        if (method === 'GET') {
          return await handleModelsRequest(request, matchedEndpoint)
        }
        return NextResponse.json(
          { error: 'Method not allowed for models endpoint' },
          { status: 405 }
        )
      }
    }

    // If path doesn't match known OpenAI patterns and it's a POST, route to chat as default
    // This allows flexibility for custom paths
    if (method === 'POST') {
      return await handleChatRequest(request, matchedEndpoint)
    }

    // For GET requests that don't match known patterns, return 404
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    )
  } catch (error: any) {
    console.error('OpenAI compatibility route error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Handle chat completion requests
 */
async function handleChatRequest(request: NextRequest, endpointConfig: any) {
  // Import and use the chat route handler logic
  // We'll create a modified version that accepts endpoint config directly
  const { authenticateToken, checkRateLimit, checkQuota, checkScope } = await import('@/lib/auth/middleware')
  const { createProvider } = await import('@/lib/providers/factory')
  const { generateCorrelationId, logUsage, structuredLog } = await import('@/lib/utils/logger')

  const startTime = Date.now()
  const correlationId = generateCorrelationId()
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                   request.headers.get('x-real-ip') ||
                   'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  let tokenData: any = null
  let body: any = null

  try {
    body = await request.json()
    const { stream, ...chatRequest } = body

    if (!endpointConfig.providers) {
      return NextResponse.json(
        { error: 'Provider configuration not found' },
        { status: 500 }
      )
    }

    const requiresAuth = endpointConfig.requires_auth !== false
    let rateLimit: { allowed: boolean; remaining: number } | null = null

    if (requiresAuth) {
      const authResult = await authenticateToken(request)
      tokenData = authResult.tokenData
      if (!tokenData || authResult.error) {
        return NextResponse.json(
          { error: authResult.error || 'Unauthorized' },
          { status: 401 }
        )
      }

      if (!(await checkScope(tokenData, 'chat'))) {
        return NextResponse.json(
          { error: 'Token does not have chat scope' },
          { status: 403 }
        )
      }

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

    let finalRequest = {
      ...endpointConfig.config,
      ...chatRequest,
      model: chatRequest.model || endpointConfig.model,
    }

    const requestSize = JSON.stringify(body).length

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
              responseSize: 0,
              model: finalRequest.model,
              costEstimate: null,
              errorMessage: null,
              correlationId,
              ipAddress: clientIp,
              userAgent,
            })
          } catch (error: any) {
            const latencyMs = Date.now() - startTime
            await logUsage({
              tokenId: tokenData?.id || null,
              endpointId: endpointConfig.id,
              providerId: endpointConfig.provider_id,
              status: 'error',
              statusCode: 500,
              latencyMs,
              requestSize,
              responseSize: 0,
              model: finalRequest.model,
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

    const response = await provider.chatCompletion(finalRequest, providerConfig)
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
    const latencyMs = Date.now() - startTime
    await logUsage({
      tokenId: tokenData?.id || null,
      endpointId: endpointConfig?.id || null,
      providerId: endpointConfig?.provider_id || null,
      status: 'error',
      statusCode: 500,
      latencyMs,
      requestSize: body ? JSON.stringify(body).length : 0,
      responseSize: 0,
      model: endpointConfig?.model || null,
      costEstimate: null,
      errorMessage: error.message,
      correlationId,
      ipAddress: clientIp,
      userAgent,
    })

    return NextResponse.json(
      { error: error.message || 'Internal server error', correlationId },
      { status: 500 }
    )
  }
}

/**
 * Handle embeddings requests
 */
async function handleEmbeddingsRequest(request: NextRequest, endpointConfig: any) {
  // For now, return a placeholder - can be implemented similarly to chat
  return NextResponse.json(
    { error: 'Embeddings endpoint not yet implemented for OpenAI compatibility layer' },
    { status: 501 }
  )
}

/**
 * Handle models listing requests (OpenAI-compatible)
 */
async function handleModelsRequest(request: NextRequest, endpointConfig: any) {
  // Return a simple models list compatible with OpenAI format
  return NextResponse.json({
    object: 'list',
    data: [
      {
        id: endpointConfig.model,
        object: 'model',
        created: Date.now(),
        owned_by: endpointConfig.providers?.name || 'modelmesh',
      }
    ]
  })
}

