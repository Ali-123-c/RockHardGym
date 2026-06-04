import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { withRetry } from '@/lib/withRetry'
import { withApiCache, invalidateApiCache } from '@/lib/api-cache'

// POST /api/members - Create a new member
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.name || !body.phone || !body.membership_no || !body.city || !body.joining_date || !body.fee_amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    // Check if phone or membership already exists
    const { data: existingByPhone } = await supabase
      .from('members')
      .select('id, phone')
      .eq('phone', body.phone)
      .single()
    
    const { data: existingByMembership } = await supabase
      .from('members')
      .select('id, membership_no')
      .eq('membership_no', body.membership_no)
      .single()

    if (existingByPhone) {
      return NextResponse.json(
        { success: false, error: 'Phone number already registered' },
        { status: 409 }
      )
    }

    if (existingByMembership) {
      return NextResponse.json(
        { success: false, error: 'Membership number already exists' },
        { status: 409 }
      )
    }

    // Attempt to insert with retries for transient failures
    const insertedData = await withRetry(
      async () => {
        const { data, error } = await supabase
          .from('members')
          .insert([body])
          .select()
          .single()
        
        if (error) throw error
        return data
      },
      3,
      500,
      (error: any) => {
        // If it's a unique constraint, don't retry
        return !(error.message?.includes('unique') || error.message?.includes('duplicate'))
      }
    )

    // Invalidate member list cache so the UI picks up the new member immediately
    invalidateApiCache('members:')

    return NextResponse.json(
      { success: true, message: 'Member created successfully', data: insertedData },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('API Route Error:', error)
    
    // Handle specific error messages
    if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
      return NextResponse.json(
        { success: false, error: error.message || 'Member already exists' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Server error occurred while creating member' },
      { status: 500 }
    )
  }
}

// GET /api/members - Get all members with optional search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    const supabase = getSupabase()
    const cacheKey = `members:${search || 'all'}`

    const result = await withApiCache(cacheKey, 5_000, async () => {
      let query = supabase.from('members').select('*')
      
      if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('Fetch members error:', error)
        throw error
      }

      return { data: data || [], count: data?.length || 0 }
    })

    const response = NextResponse.json({
      success: true,
      ...result,
    })
    // No browser caching — ensures the UI always reflects the latest mutations
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    return response
  } catch (error: any) {
    console.error('GET /members error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch members' },
      { status: 500 }
    )
  }
}