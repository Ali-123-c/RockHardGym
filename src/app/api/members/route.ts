import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

    const { data, error } = await supabase.from('members').insert([body]).select().single()
    
    if (error) {
      console.error('Supabase Insert Error:', error);
      return NextResponse.json(
        { success: false, error: error.message || error.details || 'Failed to create member in database' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: true, message: 'Member created successfully', data },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('API Route Error:', error);
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

    let query = supabase.from('members').select('*')
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch members' },
      { status: 500 }
    )
  }
}
