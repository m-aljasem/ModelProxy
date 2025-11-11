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
    if (!(await checkScope(tokenData, 'embeddings'))) {
      return NextResponse.json(
        { error: 'Token does not have embeddings scope' },
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
        { status: 429 }
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
    const { endpoint, ...embeddingRequest } = body

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Missing endpoint parameter' },
        { status: 400 }
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

    const provider = createProvider(endpointData.providers.type)
    const providerConfig = {
      apiKey: endpointData.providers.api_key_encrypted || process.env[`${endpointData.providers.type.toUpperCase()}_API_KEY`],
      baseUrl: endpointData.providers.base_url,
      ...endpointData.providers.config,
    }

    // Merge endpoint config with request
    const finalRequest = {
      model: endpointData.model,
      ...endpointData.config,
      ...embeddingRequest,
    }

    const requestSize = JSON.stringify(body).length

    const response = await provider.embeddings(finalRequest, providerConfig)
    const responseSize = JSON.stringify(response).length
    const latencyMs = Date.now() - startTime

    await logUsage({
      tokenId: tokenData.id,
      endpointId: endpointData.id,
      providerId: endpointData.provider_id,
      status: 'success',
      statusCode: 200,
      latencyMs,
      requestSize,
      responseSize,
      model: endpointData.model,
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
    structuredLog('error', 'Embeddings API error', { correlationId, error: error.message })
    const latencyMs = Date.now() - startTime
    return NextResponse.json(
      { error: error.message || 'Internal server error', correlationId },
      { status: 500 }
    )
  }
}

