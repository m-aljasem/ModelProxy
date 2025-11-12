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
    const { name, path, model, provider_id, config, is_active, requires_auth } = body

    // Validate required fields
    if (!name || !path || !model || !provider_id) {
      return NextResponse.json(
        { error: 'Missing required fields: name, path, model, and provider_id are required' },
        { status: 400 }
      )
    }

    const updateData: any = {
      name: String(name).trim(),
      path: String(path).trim(),
      model: String(model).trim(),
      provider_id,
      updated_at: new Date().toISOString(),
    }

    if (config !== undefined) {
      updateData.config = config
    }

    if (is_active !== undefined) {
      updateData.is_active = Boolean(is_active)
    }

    if (requires_auth !== undefined) {
      updateData.requires_auth = Boolean(requires_auth)
    }

    const admin = supabaseAdmin as any
    const { data, error } = await admin
      .from('endpoints')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      let errorMessage = error.message || 'Database error'
      if (error.code === '23505') {
        errorMessage = `An endpoint with the name "${name}" already exists`
      } else if (error.code === '23503') {
        errorMessage = `Invalid provider_id: The specified provider does not exist`
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        details: error.details || null,
        code: error.code || null
      }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 })
    }

    if (userId) {
      try {
        await logAudit({
          userId,
          action: 'endpoint.updated',
          resourceType: 'endpoint',
          resourceId: params.id,
          details: { name, path, model },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
        })
      } catch (auditError) {
        // Don't fail the request if audit logging fails
        console.error('Audit logging failed:', auditError)
      }
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
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

    // First, get the endpoint to log its details
    const admin = supabaseAdmin as any
    const { data: endpointData } = await admin
      .from('endpoints')
      .select('name')
      .eq('id', params.id)
      .single()

    const { error } = await admin
      .from('endpoints')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ 
        error: error.message || 'Failed to delete endpoint',
        details: error.details || null
      }, { status: 500 })
    }

    if (userId && endpointData) {
      const endpoint = endpointData as any
      try {
        await logAudit({
          userId,
          action: 'endpoint.deleted',
          resourceType: 'endpoint',
          resourceId: params.id,
          details: { name: endpoint.name },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
        })
      } catch (auditError) {
        // Don't fail the request if audit logging fails
        console.error('Audit logging failed:', auditError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

