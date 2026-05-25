import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/payments - Record a payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { member_id, amount, payment_date, month } = body

    if (!member_id || amount === undefined || !month) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields (member_id, amount, month)' },
        { status: 400 }
      )
    }

    // Insert payment record
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .insert([
        {
          member_id,
          amount: parseFloat(amount),
          payment_date: payment_date || new Date().toISOString().split('T')[0],
          month,
          status: 'Paid'
        }
      ])
      .select()
      .single()

    if (paymentError) throw paymentError

    // Automatically update the member status to Active
    const { error: memberError } = await supabase
      .from('members')
      .update({ status: 'Active' })
      .eq('id', member_id)

    if (memberError) {
      console.error('Failed to update member status to Active:', memberError)
    }

    return NextResponse.json(
      { success: true, message: 'Payment recorded successfully', data: paymentData },
      { status: 201 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record payment' },
      { status: 500 }
    )
  }
}

// GET /api/payments - Get payment records
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const month = searchParams.get('month')
    const member_id = searchParams.get('member_id')

    let query = supabase
      .from('payments')
      .select(`
        id,
        member_id,
        amount,
        payment_date,
        month,
        status,
        created_at,
        members (
          name,
          membership_no,
          phone,
          status
        )
      `)

    if (status) {
      query = query.eq('status', status)
    }
    if (month) {
      query = query.eq('month', month)
    }
    if (member_id) {
      query = query.eq('member_id', member_id)
    }

    const { data, error } = await query.order('payment_date', { ascending: false })

    if (error) throw error

    // Compute total revenue
    const totalRevenue = (data || []).reduce((sum, p) => sum + Number(p.amount || 0), 0)

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
      totalRevenue,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}
