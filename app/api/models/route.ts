import { NextRequest, NextResponse } from 'next/server'
import { authenticateToken, checkScope } from '@/lib/auth/middleware'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createProvider } from '@/lib/providers/factory'
import { generateCorrelationId, structuredLog } from '@/lib/utils/logger'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const correlationId = generateCorrelationId()

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
    if (!(await checkScope(tokenData, 'models'))) {
      return NextResponse.json(
        { error: 'Token does not have models scope' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const providerName = searchParams.get('provider')

    if (providerName) {
      // Get specific provider
      const { data: providerData, error: providerError } = await supabaseAdmin
        .from('providers')
        .select('*')
        .eq('name', providerName)
        .eq('is_active', true)
        .single()

      if (providerError || !providerData) {
        return NextResponse.json(
          { error: 'Provider not found or inactive' },
          { status: 404 }
        )
      }

      const provider = createProvider(providerData.type)
      const providerConfig = {
        apiKey: providerData.api_key_encrypted || process.env[`${providerData.type.toUpperCase()}_API_KEY`],
        baseUrl: providerData.base_url,
        ...providerData.config,
      }

      const models = await provider.listModels(providerConfig)
      return NextResponse.json({ data: models }, {
        headers: { 'X-Correlation-ID': correlationId },
      })
    }

    // Get all active providers and their models
    const { data: providers, error: providersError } = await supabaseAdmin
      .from('providers')
      .select('*')
      .eq('is_active', true)

    if (providersError || !providers) {
      return NextResponse.json(
        { error: 'Failed to fetch providers' },
        { status: 500 }
      )
    }

    const allModels = []
    for (const providerData of providers) {
      try {
        const provider = createProvider(providerData.type)
        const providerConfig = {
          apiKey: providerData.api_key_encrypted || process.env[`${providerData.type.toUpperCase()}_API_KEY`],
          baseUrl: providerData.base_url,
          ...providerData.config,
        }
        const models = await provider.listModels(providerConfig)
        allModels.push(...models)
      } catch (error: any) {
        structuredLog('warn', 'Failed to fetch models from provider', {
          correlationId,
          provider: providerData.name,
          error: error.message,
        })
      }
    }

    return NextResponse.json({ data: allModels }, {
      headers: { 'X-Correlation-ID': correlationId },
    })
  } catch (error: any) {
    structuredLog('error', 'Models API error', { correlationId, error: error.message })
    return NextResponse.json(
      { error: error.message || 'Internal server error', correlationId },
      { status: 500 }
    )
  }
}

