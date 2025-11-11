import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createApiRouteClient } from '@/lib/supabase/api-route'

export const runtime = 'nodejs'

// GET - Get a specific tool
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
      .from('mcp_tools')
      .select('*')
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
        { error: 'Tool not found' },
        { status: 404 }
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

// PUT - Update a tool
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
    const { name, description, schema, handler_type, handler_config, is_active } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (schema !== undefined) updateData.schema = schema
    if (handler_type !== undefined) updateData.handler_type = handler_type
    if (handler_config !== undefined) updateData.handler_config = handler_config
    if (is_active !== undefined) updateData.is_active = is_active

    const { data, error } = await (supabaseAdmin as any)
      .from('mcp_tools')
      .update(updateData)
      .eq('id', params.id)
      .select()
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

// DELETE - Delete a tool
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
      .from('mcp_tools')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Tool deleted successfully' })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

