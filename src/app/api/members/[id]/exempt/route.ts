import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    
    const supabase = getSupabase()
    const now = new Date()
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const { data, error } = await supabase
      .from('members')
      .update({ 
        status: 'Active',
        exemption_month: currentMonthStr
      })
      .eq('id', id)
      .select()
      .single()
      
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      message: 'Member exempted and kept Active',
      data: data
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to exempt member' },
      { status: 500 }
    )
  }
}
