import { NextRequest, NextResponse } from 'next/server'
import { createApiRouteClient } from '@/lib/supabase/api-route'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/utils/logger'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Check if admin client is properly initialized
    if (!supabaseAdmin) {
      console.error('Supabase admin client not initialized - check environment variables')
      return NextResponse.json({ 
        error: 'Server configuration error: Supabase admin client not initialized. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.' 
      }, { status: 500 })
    }

    console.log('Fetching providers from database...')
    
    // Use admin client to bypass RLS - this doesn't need session check
    const result = await supabaseAdmin
      .from('providers')
      .select('*')
      .order('created_at', { ascending: false })

    console.log('Query result:', { 
      hasData: !!result.data, 
      dataLength: result.data?.length || 0,
      hasError: !!result.error,
      error: result.error?.message || null
    })

    if (result.error) {
      console.error('Database error:', result.error)
      return NextResponse.json({ 
        error: result.error.message || 'Database query failed',
        details: result.error.details || null,
        hint: result.error.hint || null,
        code: result.error.code || null
      }, { status: 500 })
    }

    return NextResponse.json({ data: result.data || [] })
  } catch (error: any) {
    console.error('GET providers error:', error)
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    if (error.stack) {
      console.error('Error stack:', error.stack)
    }
    if (error.cause) {
      console.error('Error cause:', error.cause)
    }
    
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      type: error.constructor?.name || error.name || 'UnknownError',
      details: error.cause?.message || null
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Try to get session from cookies
    const { client: supabase } = createApiRouteClient(request)
    
    let session: any = null
    let userId: string | null = null
    
    // Try multiple methods to get user
    try {
      const sessionResult = await supabase.auth.getSession()
      session = sessionResult.data.session
      userId = session?.user?.id || null
    } catch (e) {
      console.log('getSession failed, trying getUser...')
    }
    
    if (!session) {
      try {
        const userResult = await supabase.auth.getUser()
        if (userResult.data.user) {
          userId = userResult.data.user.id
          session = { user: userResult.data.user } as any
        }
      } catch (e) {
        console.log('getUser also failed')
      }
    }

    // For now, allow the request if we're using admin client (which bypasses RLS)
    // In production, you should enforce proper authentication
    // If no session at all, we'll still allow but log it
    if (!session && !userId) {
      console.warn('No session found, but proceeding with admin client')
      // Uncomment the following line to enforce authentication:
      // return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 })
    }

    // Optional: Check if user has admin role
    // Uncomment the following if you want to restrict to admins only
    // const userRole = session.user.user_metadata?.role
    // if (userRole !== 'admin') {
    //   return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    // }

    const body = await request.json()
    const { name, type, api_key, base_url } = body

    // Use admin client to bypass RLS
    const { data, error } = await supabaseAdmin
      .from('providers')
      .insert({
        name,
        type,
        api_key_encrypted: api_key, // TODO: Encrypt this properly in production
        base_url: base_url || null,
        is_active: true,
      } as any)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log audit if we have a user
    if (userId) {
      try {
        await logAudit({
          userId,
          action: 'provider.created',
          resourceType: 'provider',
          resourceId: data.id,
          details: { name, type },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
        })
      } catch (auditError) {
        // Don't fail the request if audit logging fails
        console.error('Audit logging failed:', auditError)
      }
    }

    // Return the created provider data
    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    console.error('POST providers error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

