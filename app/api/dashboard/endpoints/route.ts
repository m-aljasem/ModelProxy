import { NextRequest, NextResponse } from 'next/server'
import { createApiRouteClient } from '@/lib/supabase/api-route'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/utils/logger'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { client: supabase, response } = createApiRouteClient(request)
    
    // Try to get session, but don't block if it fails (we use admin client anyway)
    let session: any = null
    try {
      const sessionResult = await supabase.auth.getSession()
      session = sessionResult.data.session
    } catch (e) {
      // Continue without session - admin client will handle it
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error: Supabase admin client not initialized' },
        { status: 500 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('endpoints')
      .select('*, providers(name, type)')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { client: supabase, response } = createApiRouteClient(request)
    
    let session: any = null
    let userId: string | null = null
    
    try {
      const sessionResult = await supabase.auth.getSession()
      session = sessionResult.data.session
      userId = session?.user?.id || null
    } catch (e) {
      // Try getUser as fallback
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

    // Optional: Check if user has admin role
    // Uncomment the following if you want to restrict to admins only
    // const userRole = session.user.user_metadata?.role
    // if (userRole !== 'admin') {
    //   return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    // }

    const body = await request.json()
    const { name, path, model, provider_id, config } = body

    // Use admin client to bypass RLS
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error: Supabase admin client not initialized' },
        { status: 500 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('endpoints')
      .insert({
        name,
        path,
        model,
        provider_id,
        config: config || {},
        is_active: true,
      } as any)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (userId) {
      await logAudit({
        userId,
        action: 'endpoint.created',
        resourceType: 'endpoint',
        resourceId: data.id,
        details: { name, path, model },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
      })
    }

    return NextResponse.json({ data }, { headers: response.headers })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

