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
      console.error('Supabase admin client not initialized - check environment variables')
      const hasUrl = !!process.env.SUPABASE_URL
      const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
      console.error('Environment check:', { hasUrl, hasServiceKey })
      return NextResponse.json(
        { 
          error: 'Server configuration error: Supabase admin client not initialized. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.',
          details: { hasUrl, hasServiceKey }
        },
        { status: 500 }
      )
    }

    console.log('Fetching endpoints from database...')
    const { data, error } = await supabaseAdmin
      .from('endpoints')
      .select('*, providers(name, type)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      console.error('Error code:', error.code)
      console.error('Error details:', error.details)
      
      // Check for authentication errors specifically
      if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('401')) {
        return NextResponse.json({ 
          error: 'Authentication failed. Please verify SUPABASE_SERVICE_ROLE_KEY is correct and has not expired.',
          details: error.details || null,
          hint: 'Check your Supabase project settings → API → service_role key',
          code: error.code || null
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        error: error.message || 'Database query failed',
        details: error.details || null,
        hint: error.hint || null,
        code: error.code || null
      }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('GET endpoints error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      type: error.constructor?.name || error.name || 'UnknownError'
    }, { status: 500 })
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
      console.error('Supabase admin client not initialized - check environment variables')
      const hasUrl = !!process.env.SUPABASE_URL
      const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
      return NextResponse.json(
        { 
          error: 'Server configuration error: Supabase admin client not initialized. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.',
          details: { hasUrl, hasServiceKey }
        },
        { status: 500 }
      )
    }

    // Validate required fields
    if (!name || !path || !model || !provider_id) {
      return NextResponse.json(
        { error: 'Missing required fields: name, path, model, and provider_id are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('endpoints')
      .insert({
        name: String(name).trim(),
        path: String(path).trim(),
        model: String(model).trim(),
        provider_id,
        config: config || {},
        is_active: true,
      } as any)
      .select()
      .single()

    if (error) {
      console.error('Database insert error:', error)
      console.error('Error code:', error.code)
      
      // Handle common database errors
      let errorMessage = error.message || 'Database error'
      if (error.code === '23505') { // Unique violation
        errorMessage = `An endpoint with the name "${name}" already exists`
      } else if (error.code === '23503') { // Foreign key violation
        errorMessage = `Invalid provider_id: The specified provider does not exist`
      } else if (error.code === '23502') { // Not null violation
        errorMessage = `Missing required field: ${error.column || 'unknown field'}`
      } else if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('401')) {
        errorMessage = 'Authentication failed. Please verify SUPABASE_SERVICE_ROLE_KEY is correct.'
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        details: error.details || null,
        hint: error.hint || null,
        code: error.code || null
      }, { status: 500 })
    }

    if (userId && data) {
      const endpointData = data as any
      await logAudit({
        userId,
        action: 'endpoint.created',
        resourceType: 'endpoint',
        resourceId: endpointData.id,
        details: { name, path, model },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
      })
    }

    return NextResponse.json({ data }, { headers: response.headers })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

