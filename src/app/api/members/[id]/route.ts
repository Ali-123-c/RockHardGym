import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/members/[id] - Get member by ID
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .single()
      
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      data: data,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch member' },
      { status: 500 }
    )
  }
}

// PUT /api/members/[id] - Update member
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('members')
      .update(body)
      .eq('id', id)
      .select()
      .single()
      
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      message: 'Member updated successfully',
      data: data
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update member' },
      { status: 500 }
    )
  }
}

// DELETE /api/members/[id] - Delete member
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id)
      
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      message: 'Member deleted successfully',
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete member' },
      { status: 500 }
    )
  }
}
