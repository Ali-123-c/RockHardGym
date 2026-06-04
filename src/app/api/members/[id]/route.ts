import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { invalidateApiCache } from '@/lib/api-cache'

// GET /api/members/[id] - Get member by ID
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    
    const supabase = getSupabase()
    let retries = 2
    let member = null
    let error = null
    
    while (retries > 0) {
      try {
        const result = await supabase
          .from('members')
          .select('*')
          .eq('id', id)
          .single()
        
        member = result.data
        error = result.error
        
        if (!error) break
        retries--
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (e) {
        error = e
        retries--
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    }
    
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      data: member,
    })
  } catch (error: any) {
    console.error('GET /members/[id] error:', error)
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
    
    const supabase = getSupabase()
    let retries = 2
    let updated = null
    let error = null

    while (retries > 0) {
      try {
        const result = await supabase
          .from('members')
          .update(body)
          .eq('id', id)
          .select()
          .single()
        
        updated = result.data
        error = result.error
        
        if (!error) break
        
        // If it's a unique constraint, don't retry
        if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
          throw new Error(error.message || 'Duplicate entry')
        }
        
        retries--
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (e: any) {
        error = e
        // If it's a unique constraint, don't retry
        if (e.message?.includes('unique') || e.message?.includes('duplicate')) {
          throw e
        }
        retries--
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    }
    
    if (error) throw error

    // Invalidate member list cache so the UI picks up the change immediately
    invalidateApiCache('members:')
    
    return NextResponse.json({
      success: true,
      message: 'Member updated successfully',
      data: updated
    })
  } catch (error: any) {
    console.error('PUT /members/[id] error:', error)
    
    if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
      return NextResponse.json(
        { success: false, error: 'Duplicate entry - this phone or membership already exists' },
        { status: 409 }
      )
    }
    
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
    
    const supabase = getSupabase()
    let retries = 2
    let error = null

    while (retries > 0) {
      try {
        const result = await supabase
          .from('members')
          .delete()
          .eq('id', id)
        
        error = result.error
        
        if (!error) break
        retries--
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (e) {
        error = e
        retries--
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    }
    
    if (error) throw error

    // Invalidate member list cache so the UI picks up the deletion immediately
    invalidateApiCache('members:')
    
    return NextResponse.json({
      success: true,
      message: 'Member deleted successfully',
    })
  } catch (error: any) {
    console.error('DELETE /members/[id] error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete member' },
      { status: 500 }
    )
  }
}