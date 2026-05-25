'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { ArrowLeft, Clock, Activity, Calendar, Phone, MapPin, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function MemberDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params)
  const id = unwrappedParams.id
  
  const [member, setMember] = useState<any>(null)
  const [attendance, setAttendance] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch member, attendance, and payments concurrently
      const [memberRes, attendanceRes, paymentsRes] = await Promise.all([
        fetch(`/api/members/${id}`),
        fetch(`/api/attendance?member_id=${id}`),
        fetch(`/api/payments?member_id=${id}`)
      ])

      const [memberData, attendanceData, paymentsData] = await Promise.all([
        memberRes.json(),
        attendanceRes.json(),
        paymentsRes.json()
      ])

      if (memberData.success) setMember(memberData.data)
      if (attendanceData.success) setAttendance(attendanceData.data)
      if (paymentsData.success) setPayments(paymentsData.data)
    } catch (error) {
      console.error('Failed to fetch member details', error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-900">
        <h2 className="text-2xl font-bold mb-4">Member not found</h2>
        <Link href="/members" className="text-indigo-400 hover:underline flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to members
        </Link>
      </div>
    )
  }

  const initials = member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const isActive = member.status === 'Active'

  // Calculations for current month
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() // 0-11
  const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}` // e.g. "2026-05"

  // 1. Fee Status
  const hasPaidThisMonth = payments.some(p => p.month === currentMonthStr && p.status === 'Paid')

  // 2. Attendance Status
  // Calculate working days (excluding Sundays) from start of month (or join date) to today
  const start = new Date(currentYear, currentMonth, 1)
  if (member.joining_date) {
    const joinDate = new Date(member.joining_date)
    if (joinDate.getFullYear() === currentYear && joinDate.getMonth() === currentMonth) {
      start.setDate(Math.max(1, joinDate.getDate()))
    }
  }

  let workingDays = 0
  const current = new Date(start)
  while (current <= now) {
    if (current.getDay() !== 0) { // 0 is Sunday
      workingDays++
    }
    current.setDate(current.getDate() + 1)
  }

  // Count unique days present this month
  const currentMonthAttendance = attendance.filter(a => a.date && a.date.startsWith(currentMonthStr))
  const uniqueDaysPresent = new Set(currentMonthAttendance.map(a => a.date)).size

  const daysPresent = uniqueDaysPresent
  const daysAbsent = Math.max(0, workingDays - daysPresent)

  return (
    <div className="relative min-h-screen bg-slate-50 overflow-hidden">
      {/* Background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[10%] w-[600px] h-[600px] bg-indigo-600/[0.06] rounded-full blur-[130px] animate-orb-move" />
        <div className="absolute inset-0 bg-grid" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Navigation */}
        <Link 
          href="/members" 
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-8 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Directory
        </Link>

        {/* Profile Header */}
        <div className={`glass rounded-3xl border border-slate-200 p-8 mb-8 relative overflow-hidden transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />
          
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
            <div className="relative flex-shrink-0">
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 p-[3px] shadow-2xl shadow-indigo-500/20">
                <div className="w-full h-full rounded-[21px] bg-white flex items-center justify-center">
                  <span className="text-4xl font-black text-slate-900">{initials}</span>
                </div>
              </div>
              <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center ${isActive ? 'bg-emerald-400' : 'bg-rose-500'}`}>
                {isActive && <CheckCircle2 className="w-4 h-4 text-emerald-950" />}
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2">{member.name}</h1>
                  <p className="text-indigo-400 font-mono font-medium">{member.membership_no}</p>
                </div>
                <span className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border ${
                  isActive 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  {member.status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div className="flex items-center gap-3 text-slate-700">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-slate-500" />
                  </div>
                  {member.phone}
                </div>
                <div className="flex items-center gap-3 text-slate-700">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-slate-500" />
                  </div>
                  {member.city}{member.address ? `, ${member.address}` : ''}
                </div>
                <div className="flex items-center gap-3 text-slate-700">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-slate-500" />
                  </div>
                  Joined: {new Date(member.joining_date).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-3 text-slate-700">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-slate-500" />
                  </div>
                  Expires: {new Date(member.expiry_date).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 transition-all duration-500 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          
          {/* Monthly Fee Card */}
          <div className="glass rounded-3xl border border-slate-200 p-6 relative overflow-hidden group hover:border-indigo-500/20 transition-colors">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-500" /> Current Month Fee
              </h3>
              <span className="text-sm font-medium text-slate-600">{now.toLocaleDateString('default', { month: 'long', year: 'numeric' })}</span>
            </div>
            
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Monthly Amount</p>
                <p className="text-3xl font-black text-slate-900">Rs {member.fee_amount?.toLocaleString()}</p>
              </div>
              
              {hasPaidThisMonth ? (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-bold">Submitted</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-2 rounded-xl">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-bold">Pending</span>
                </div>
              )}
            </div>
          </div>

          {/* Attendance Stats Card */}
          <div className="glass rounded-3xl border border-slate-200 p-6 relative overflow-hidden group hover:border-indigo-500/20 transition-colors">
             <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" /> Attendance this Month
              </h3>
              <span className="text-sm font-medium text-slate-600">{workingDays} Working Days Passed</span>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                <p className="text-3xl font-black text-emerald-500 mb-1">{daysPresent}</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Present</p>
              </div>
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                <p className="text-3xl font-black text-rose-500 mb-1">{daysAbsent}</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Absent</p>
              </div>
            </div>
          </div>

        </div>

        {/* Recent Attendance History */}
        <div className={`glass rounded-3xl border border-slate-200 p-8 transition-all duration-500 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-indigo-500" /> Recent Check-ins
          </h3>

          {attendance.length === 0 ? (
            <p className="text-slate-600 text-center py-8">No attendance records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-600 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-bold tracking-wider">Date</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Time</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {attendance.slice(0, 10).map((record) => {
                    const rawTime = record.scan_time as string
                    let normalizedTime = rawTime
                      .replace(' ', 'T')
                      .replace(/\+00$/, '+00:00')
                    if (!normalizedTime.includes('Z') && !/[+-]\d{2}:?\d{2}$/.test(normalizedTime)) {
                      normalizedTime += 'Z'
                    }
                    const scanDate = new Date(normalizedTime)
                    const timeStr = isNaN(scanDate.getTime()) ? '—' : scanDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    const dateStr = isNaN(scanDate.getTime()) ? record.date : scanDate.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                    
                    return (
                      <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 text-slate-700 font-medium">{dateStr}</td>
                        <td className="px-6 py-4 font-mono text-slate-600">{timeStr}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            Present
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {attendance.length > 10 && (
                <div className="text-center pt-6 pb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Showing last 10 records</span>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
