import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET() {
  try {
    // Check database connection
    if (!supabaseAdmin) {
      return NextResponse.json(
        { status: 'unhealthy', error: 'Supabase admin client not initialized' },
        { status: 503 }
      )
    }

    const { error } = await supabaseAdmin.from('providers').select('id').limit(1)
    
    if (error) {
      return NextResponse.json(
        { status: 'unhealthy', error: error.message },
        { status: 503 }
      )
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json(
      { status: 'unhealthy', error: error.message },
      { status: 503 }
    )
  }
}

