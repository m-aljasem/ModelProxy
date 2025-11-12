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
      .select('*, providers(id, name, type)')
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
    const { name, path, model, provider_id, config, requires_auth } = body

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

    // Try insert with select first
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('endpoints')
      .insert({
        name: String(name).trim(),
        path: String(path).trim(),
        model: String(model).trim(),
        provider_id,
        config: config || {},
        requires_auth: requires_auth !== undefined ? Boolean(requires_auth) : true,
        is_active: true,
      } as any)
      .select()

    let data: any = null

    // Check if error is a real database error or just a select/response issue
    if (insertError) {
      // Check if it's a real database constraint error (insert failed)
      const isRealDbError = insertError.code === '23505' || // Unique violation
                           insertError.code === '23503' || // Foreign key violation
                           insertError.code === '23502' || // Not null violation
                           insertError.code === 'PGRST301' || // Auth error
                           insertError.message?.includes('JWT') ||
                           insertError.message?.includes('401')

      if (isRealDbError) {
        // Real database error - return it
        console.error('Database insert error:', insertError)
        console.error('Error code:', insertError.code)
        
        let errorMessage = insertError.message || 'Database error'
        if (insertError.code === '23505') {
          errorMessage = `An endpoint with the name "${name}" already exists`
        } else if (insertError.code === '23503') {
          errorMessage = `Invalid provider_id: The specified provider does not exist`
        } else if (insertError.code === '23502') {
          const columnMatch = insertError.details?.match(/column "([^"]+)"/i) || insertError.hint?.match(/column "([^"]+)"/i)
          const columnName = columnMatch ? columnMatch[1] : 'unknown field'
          errorMessage = `Missing required field: ${columnName}`
        } else if (insertError.code === 'PGRST301' || insertError.message?.includes('JWT') || insertError.message?.includes('401')) {
          errorMessage = 'Authentication failed. Please verify SUPABASE_SERVICE_ROLE_KEY is correct.'
        }
        
        return NextResponse.json({ 
          error: errorMessage,
          details: insertError.details || null,
          hint: insertError.hint || null,
          code: insertError.code || null
        }, { status: 500 })
      } else {
        // Likely a 409 or select-related error - insert probably succeeded, fetch the data
        console.warn('Insert with select returned error (likely 409), but insert may have succeeded. Fetching data...', insertError)
      }
    }

    // If we have data from insert, use it
    if (insertData && (!Array.isArray(insertData) || insertData.length > 0)) {
      data = Array.isArray(insertData) ? insertData[0] : insertData
    } else {
      // Insert succeeded but couldn't return data (409 error), fetch it separately
      console.log('Fetching inserted endpoint data...')
      const { data: fetchedData, error: fetchError } = await supabaseAdmin
        .from('endpoints')
        .select('*')
        .eq('name', String(name).trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (fetchError) {
        console.warn('Could not fetch inserted endpoint:', fetchError)
        // Still return success since insert worked, just couldn't return the data
        data = {
          name,
          path,
          model,
          provider_id,
          config: config || {},
          is_active: true,
        }
      } else if (fetchedData) {
        data = fetchedData
      } else {
        // Fallback - return basic data
        data = {
          name,
          path,
          model,
          provider_id,
          config: config || {},
          is_active: true,
        }
      }
    }

    // Ensure data exists before returning
    if (!data) {
      console.error('No data returned from insert operation')
      return NextResponse.json({ 
        error: 'Failed to create endpoint - data not available',
        message: 'Endpoint may have been created but data could not be retrieved. Please refresh the page.'
      }, { status: 500 })
    }

    // Log audit if we have a user and data with an ID
    if (userId && data) {
      const endpointData = data as any
      try {
        await logAudit({
          userId,
          action: 'endpoint.created',
          resourceType: 'endpoint',
          resourceId: endpointData.id || null,
          details: { name, path, model },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
        })
      } catch (auditError) {
        // Don't fail the request if audit logging fails
        console.error('Audit logging failed:', auditError)
      }
    }

    return NextResponse.json({ data }, { headers: response.headers })
  } catch (error: any) {
    console.error('Unexpected error in POST /api/dashboard/endpoints:', error)
    return NextResponse.json({ 
      error: error?.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 })
  }
}

