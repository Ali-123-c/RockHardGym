// DEPRECATED: 10-day absence rule has been removed.
// Attendance is now recorded without any automatic absence threshold checks.
// This cron endpoint is kept as a no-op to avoid breaking any external cron triggers.

import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Absence checking is disabled — attendance is recorded without threshold checks.',
  })
}
