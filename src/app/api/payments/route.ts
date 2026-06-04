import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { withRetry } from '@/lib/withRetry'
import { withApiCache, invalidateApiCache } from '@/lib/api-cache'

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

    // Insert payment record with retry logic
    const paymentData = await withRetry(async () => {
      const { data, error } = await supabase
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

      if (error) throw error
      return data
    })

    // Automatically update the member status to Active
    const { error: memberError } = await supabase
      .from('members')
      .update({ status: 'Active' })
      .eq('id', member_id)

    if (memberError) {
      console.error('Failed to update member status to Active:', memberError)
    }

    // Invalidate payment + member caches so the UI reflects the new payment and status change
    invalidateApiCache('payments:')
    invalidateApiCache('members:')

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

    const cacheKey = `payments:${status || 'all'}:${month || 'all'}:${member_id || 'all'}`

    const result = await withApiCache(cacheKey, 5_000, async () => {
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

      const totalRevenue = (data || []).reduce((sum, p) => sum + Number(p.amount || 0), 0)

      return { data: data || [], count: data?.length || 0, totalRevenue }
    })

    const response = NextResponse.json({
      success: true,
      ...result,
    })
    // No browser caching — ensures the UI always reflects the latest mutations
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    return response
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}
