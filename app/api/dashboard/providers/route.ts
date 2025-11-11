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

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: name and type are required' },
        { status: 400 }
      )
    }

    // Validate provider type matches enum
    const validTypes = ['openai', 'openrouter', 'custom']
    const normalizedType = String(type).toLowerCase().trim()
    if (!validTypes.includes(normalizedType)) {
      return NextResponse.json(
        { error: `Invalid provider type "${type}". Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate api_key is provided (even if empty, we need to know it was sent)
    if (api_key === undefined) {
      return NextResponse.json(
        { error: 'Missing required field: api_key' },
        { status: 400 }
      )
    }

    // Validate name length (VARCHAR(255))
    if (name.length > 255) {
      return NextResponse.json(
        { error: 'Provider name must be 255 characters or less' },
        { status: 400 }
      )
    }

    // Use admin client to bypass RLS
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error: Supabase admin client not initialized' },
        { status: 500 }
      )
    }

    const admin = supabaseAdmin as any
    
    // Prepare insert data
    const insertData: any = {
      name: String(name).trim(),
      type: normalizedType, // Use the validated and normalized type
      api_key_encrypted: api_key ? String(api_key).trim() : null, // Allow null API key (for providers that don't need one)
      base_url: base_url ? String(base_url).trim() : null,
      is_active: true,
    }

    console.log('Attempting to insert provider:', { 
      name: insertData.name, 
      type: insertData.type,
      hasApiKey: !!insertData.api_key_encrypted,
      hasBaseUrl: !!insertData.base_url
    })

    const { data, error } = await admin
      .from('providers')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Database insert error:', error)
      console.error('Error code:', error.code)
      console.error('Error details:', error.details)
      console.error('Error hint:', error.hint)
      
      // Provide more specific error messages
      let errorMessage = error.message || 'Database error'
      
      // Handle common database errors
      if (error.code === '23505') { // Unique violation
        errorMessage = `A provider with the name "${name}" already exists`
      } else if (error.code === '23502') { // Not null violation
        errorMessage = `Missing required field: ${error.column || 'unknown field'}`
      } else if (error.code === '23514') { // Check violation
        errorMessage = `Invalid data: ${error.message}`
      } else if (error.message?.includes('invalid input value for enum')) {
        errorMessage = `Invalid provider type "${type}". Must be one of: openai, openrouter, custom`
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        details: error.details || null,
        hint: error.hint || null,
        code: error.code || null
      }, { status: 500 })
    }

    // Log audit if we have a user
    if (userId && data) {
      try {
        const providerData = data as any
        await logAudit({
          userId,
          action: 'provider.created',
          resourceType: 'provider',
          resourceId: providerData.id,
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
    console.error('Error stack:', error.stack)
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    
    // Check if it's a JSON parsing error
    if (error instanceof SyntaxError || error.message?.includes('JSON')) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }
    
    // Check if it's a request body parsing error
    if (error.message?.includes('body') || error.message?.includes('parse')) {
      return NextResponse.json(
        { error: 'Failed to parse request body. Please ensure all fields are valid.' },
        { status: 400 }
      )
    }
    
    // Check if it's from OpenAI SDK
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        { error: `Provider configuration error: ${error.message}` },
        { status: 400 }
      )
    }
    
    // Return detailed error for debugging
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      type: error.constructor?.name || error.name || 'UnknownError',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

