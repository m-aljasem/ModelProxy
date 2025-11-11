import { NextRequest, NextResponse } from 'next/server'
import { createApiRouteClient } from '@/lib/supabase/api-route'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/utils/logger'

export const runtime = 'nodejs'

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
    const { name, type, api_key, base_url, is_active } = body

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: name and type are required' },
        { status: 400 }
      )
    }

    // Validate provider type
    const validTypes = ['openai', 'openrouter', 'custom']
    const normalizedType = String(type).toLowerCase().trim()
    if (!validTypes.includes(normalizedType)) {
      return NextResponse.json(
        { error: `Invalid provider type "${type}". Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const updateData: any = {
      name: String(name).trim(),
      type: normalizedType,
      updated_at: new Date().toISOString(),
    }

    // Only update api_key if provided (don't overwrite with empty)
    if (api_key !== undefined) {
      updateData.api_key_encrypted = api_key ? String(api_key).trim() : null
    }

    if (base_url !== undefined) {
      updateData.base_url = base_url ? String(base_url).trim() : null
    }

    if (is_active !== undefined) {
      updateData.is_active = Boolean(is_active)
    }

    const admin = supabaseAdmin as any
    const { data, error } = await admin
      .from('providers')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      let errorMessage = error.message || 'Database error'
      if (error.code === '23505') {
        errorMessage = `A provider with the name "${name}" already exists`
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        details: error.details || null,
        code: error.code || null
      }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    if (userId) {
      await logAudit({
        userId,
        action: 'provider.updated',
        resourceType: 'provider',
        resourceId: params.id,
        details: { name, type },
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

    // First, get the provider to log its details
    const admin = supabaseAdmin as any
    const { data: providerData } = await admin
      .from('providers')
      .select('name')
      .eq('id', params.id)
      .single()

    const { error } = await admin
      .from('providers')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ 
        error: error.message || 'Failed to delete provider',
        details: error.details || null
      }, { status: 500 })
    }

    if (userId && providerData) {
      const provider = providerData as any
      await logAudit({
        userId,
        action: 'provider.deleted',
        resourceType: 'provider',
        resourceId: params.id,
        details: { name: provider.name },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

