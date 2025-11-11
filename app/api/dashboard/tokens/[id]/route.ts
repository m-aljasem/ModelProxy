import { NextRequest, NextResponse } from 'next/server'
import { createApiRouteClient } from '@/lib/supabase/api-route'
import { revokeToken } from '@/lib/auth/token'
import { logAudit } from '@/lib/utils/logger'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createApiRouteClient(request)
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await revokeToken(params.id)

    await logAudit({
      userId: session.user.id,
      action: 'token.revoked',
      resourceType: 'token',
      resourceId: params.id,
      details: {},
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

