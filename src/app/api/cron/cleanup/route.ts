import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  // Authenticate Cron Job
  const authHeader = request.headers.get('authorization')
  if (
    process.env.CRON_SECRET && 
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Delete all members where status is 'Inactive'
    const { data, error } = await supabase
      .from('members')
      .delete()
      .eq('status', 'Inactive')
      .select()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: `Successfully cleaned up ${data?.length || 0} inactive members`,
      deleted_count: data?.length || 0
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to clean up inactive members' },
      { status: 500 }
    )
  }
}
