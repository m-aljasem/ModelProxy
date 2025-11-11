import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createApiRouteClient } from '@/lib/supabase/api-route'

export const runtime = 'nodejs'

// GET - List all MCP configs
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('mcp_configs')
      .select(`
        *,
        endpoints(id, name, model, path, providers(id, name, type))
      `)
      .order('created_at', { ascending: false })

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

// POST - Create a new MCP config
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
    const { name, endpoint_id, description, enabled_tools, system_prompt, config } = body

    if (!name || !endpoint_id) {
      return NextResponse.json(
        { error: 'Missing required fields: name and endpoint_id' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('mcp_configs')
      .insert({
        name,
        endpoint_id,
        description,
        enabled_tools: enabled_tools || [],
        system_prompt,
        config: config || {},
        is_active: true,
        created_by: session.data.session.user.id
      } as any)
      .select(`
        *,
        endpoints(id, name, model, path, providers(id, name, type))
      `)
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

