import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createApiRouteClient } from '@/lib/supabase/api-route'

export const runtime = 'nodejs'

// GET - List all MCP tools
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('mcp_tools')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new MCP tool
export async function POST(request: NextRequest) {
  try {
    const { client: supabase } = createApiRouteClient(request)
    const session = await supabase.auth.getSession()

    if (!session.data.session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { name, description, schema, handler_type, handler_config } = body

    if (!name || !description || !schema || !handler_type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, schema, handler_type' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('mcp_tools')
      .insert({
        name,
        description,
        schema,
        handler_type,
        handler_config: handler_config || {},
        is_active: true
      } as any)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

