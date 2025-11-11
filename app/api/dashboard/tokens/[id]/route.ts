import { NextRequest, NextResponse } from 'next/server'
import { createApiRouteClient } from '@/lib/supabase/api-route'
import { revokeToken } from '@/lib/auth/token'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/utils/logger'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { client: supabase } = createApiRouteClient(request)
    
    let session: any = null
    let userId: string | null = null
    
    try {
      const sessionResult = await supabase.auth.getSession()
      session = sessionResult.data.session
      userId = session?.user?.id || null
    } catch (e) {
      try {
        const userResult = await supabase.auth.getUser()
        if (userResult.data.user) {
          userId = userResult.data.user.id
          session = { user: userResult.data.user } as any
        }
      } catch (e2) {
        // Continue without session
      }
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error: Supabase admin client not initialized' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { name, scopes, rate_limit_per_minute, monthly_quota, is_active } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      )
    }

    const updateData: any = {
      name: String(name).trim(),
      updated_at: new Date().toISOString(),
    }

    if (scopes !== undefined) {
      updateData.scopes = scopes
    }

    if (rate_limit_per_minute !== undefined) {
      updateData.rate_limit_per_minute = parseInt(String(rate_limit_per_minute))
    }

    if (monthly_quota !== undefined) {
      updateData.monthly_quota = monthly_quota ? parseInt(String(monthly_quota)) : null
    }

    if (is_active !== undefined) {
      updateData.is_active = Boolean(is_active)
    }

    const admin = supabaseAdmin as any
    const { data, error } = await admin
      .from('api_tokens')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ 
        error: error.message || 'Failed to update token',
        details: error.details || null
      }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 })
    }

    if (userId) {
      await logAudit({
        userId,
        action: 'token.updated',
        resourceType: 'token',
        resourceId: params.id,
        details: { name, scopes },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
      })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { client: supabase } = createApiRouteClient(request)
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await revokeToken(params.id)

    await logAudit({
      userId: session.user.id,
      action: 'token.revoked',
      resourceType: 'token',
      resourceId: params.id,
      details: {},
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

