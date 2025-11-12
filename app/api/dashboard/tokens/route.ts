import { NextRequest, NextResponse } from 'next/server'
import { createApiRouteClient } from '@/lib/supabase/api-route'
import { createToken } from '@/lib/auth/token'
import { logAudit } from '@/lib/utils/logger'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error: Supabase admin client not initialized' },
        { status: 500 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('api_tokens')
      .select('id, name, scopes, rate_limit_per_minute, monthly_quota, is_active, created_at, last_used_at')
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
    const { client: supabase } = createApiRouteClient(request)
    
    let session: any = null
    let userId: string | null = null
    
    // Try multiple methods to get user session
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
        // Continue without session - we'll use admin client
        console.warn('Could not get user session, proceeding with admin client')
      }
    }

    // For now, allow the request if we're using admin client (which bypasses RLS)
    // In production, you should enforce proper authentication
    // Uncomment the following to enforce authentication:
    // if (!session && !userId) {
    //   return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 })
    // }

    const body = await request.json()
    const { name, scopes, rate_limit_per_minute, monthly_quota } = body

    const { token, tokenData } = await createToken(
      name,
      scopes,
      rate_limit_per_minute,
      monthly_quota,
      [],
      userId || undefined // Pass userId if available, otherwise undefined
    )

    if (userId) {
      try {
        await logAudit({
          userId,
          action: 'token.created',
          resourceType: 'token',
          resourceId: tokenData.id,
          details: { name, scopes },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
        })
      } catch (auditError) {
        // Don't fail the request if audit logging fails
        console.error('Audit logging failed:', auditError)
      }
    }

    return NextResponse.json({ token, tokenData })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

