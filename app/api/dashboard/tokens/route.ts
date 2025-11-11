import { NextRequest, NextResponse } from 'next/server'
import { createApiRouteClient } from '@/lib/supabase/api-route'
import { createToken } from '@/lib/auth/token'
import { logAudit } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const { client: supabase } = createApiRouteClient(request)
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, scopes, rate_limit_per_minute, monthly_quota } = body

    const { token, tokenData } = await createToken(
      name,
      scopes,
      rate_limit_per_minute,
      monthly_quota,
      [],
      session.user.id
    )

    try {
      await logAudit({
        userId: session.user.id,
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

    return NextResponse.json({ token, tokenData })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

