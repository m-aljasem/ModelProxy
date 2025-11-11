import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createApiRouteClient } from '@/lib/supabase/api-route'

export const runtime = 'nodejs'

// GET - Get a specific MCP config
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      .eq('id', params.id)
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'MCP config not found' },
        { status: 404 }
      )
    }

    // Get the tools for this config
    const enabledTools = (data as any).enabled_tools || []
    const { data: tools, error: toolsError } = await supabaseAdmin
      .from('mcp_tools')
      .select('*')
      .in('id', enabledTools)

    return NextResponse.json({
      data: {
        ...(data as any),
        tools: tools || []
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update an MCP config
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { name, description, enabled_tools, system_prompt, config, is_active } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (enabled_tools !== undefined) updateData.enabled_tools = enabled_tools
    if (system_prompt !== undefined) updateData.system_prompt = system_prompt
    if (config !== undefined) updateData.config = config
    if (is_active !== undefined) updateData.is_active = is_active

    const { data, error } = await (supabaseAdmin as any)
      .from('mcp_configs')
      .update(updateData)
      .eq('id', params.id)
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

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete an MCP config
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { error } = await supabaseAdmin
      .from('mcp_configs')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'MCP config deleted successfully' })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

