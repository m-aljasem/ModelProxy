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
    const { name, provider_id, model_identifier, description, is_active } = body

    // Validate required fields
    if (!name || !provider_id || !model_identifier) {
      return NextResponse.json(
        { error: 'Missing required fields: name, provider_id, and model_identifier are required' },
        { status: 400 }
      )
    }

    const updateData: any = {
      name: String(name).trim(),
      provider_id,
      model_identifier: String(model_identifier).trim(),
      updated_at: new Date().toISOString(),
    }

    if (description !== undefined) {
      updateData.description = description ? String(description).trim() : null
    }

    if (is_active !== undefined) {
      updateData.is_active = Boolean(is_active)
    }

    const admin = supabaseAdmin as any
    const { data, error } = await admin
      .from('models')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      let errorMessage = error.message || 'Database error'
      if (error.code === '23505') {
        errorMessage = `A model with identifier "${model_identifier}" already exists for this provider`
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
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    if (userId) {
      try {
        await logAudit({
          userId,
          action: 'model.updated',
          resourceType: 'model',
          resourceId: params.id,
          details: { name, provider_id, model_identifier },
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

    // First, get the model to log its details
    const admin = supabaseAdmin as any
    const { data: modelData } = await admin
      .from('models')
      .select('name')
      .eq('id', params.id)
      .single()

    const { error } = await admin
      .from('models')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ 
        error: error.message || 'Failed to delete model',
        details: error.details || null
      }, { status: 500 })
    }

    if (userId && modelData) {
      const model = modelData as any
      try {
        await logAudit({
          userId,
          action: 'model.deleted',
          resourceType: 'model',
          resourceId: params.id,
          details: { name: model.name },
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

