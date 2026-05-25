'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, Calendar, Activity, Plus } from 'lucide-react'
import { ManualAttendanceModal } from '@/components/attendance/ManualAttendanceModal'

export default function AttendancePage() {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [showModal, setShowModal] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const fetchAttendance = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/attendance?date=${date}`)
      const data = await res.json()
      if (data.success) {
        setRecords(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch attendance', error)
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    fetchAttendance()
  }, [fetchAttendance])

  const todayStr = new Date().toISOString().split('T')[0]
  const isToday = date === todayStr

  return (
    <div className="relative min-h-screen bg-[#080810] overflow-hidden">
      {/* Background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[10%] w-[600px] h-[600px] bg-emerald-600/[0.06] rounded-full blur-[130px] animate-orb-move" />
        <div className="absolute bottom-[-15%] right-[5%] w-[500px] h-[500px] bg-teal-600/[0.05] rounded-full blur-[100px] animate-orb-move" style={{ animationDelay: '-4s' }} />
        <div className="absolute inset-0 bg-grid" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Header */}
        <div className={`mb-10 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Attendance</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gradient-white mb-2">
                Daily Log
              </h1>
              <p className="text-slate-400 text-base">
                Track and manage member check-ins in real-time.
              </p>
            </div>
            
            <button
              onClick={() => setShowModal(true)}
              className="group relative flex-shrink-0 flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-white overflow-hidden shadow-[0_0_40px_-12px_rgba(16,185,129,0.6)] hover:shadow-[0_0_60px_-10px_rgba(16,185,129,0.8)] transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 bg-size-200% animate-gradient-shift" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/10" />
              <Plus className="relative w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
              <span className="relative">Manual Entry</span>
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className={`flex flex-wrap items-center justify-between gap-4 mb-8 transition-all duration-500 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Date Picker */}
          <div className="relative">
             <div className="flex items-center glass-dark rounded-xl border border-white/[0.06] focus-within:border-emerald-500/40 transition-colors overflow-hidden">
               <div className="pl-4 pr-2 flex items-center justify-center border-r border-white/[0.06]">
                 <Calendar className="w-4 h-4 text-slate-400" />
               </div>
               <input 
                 type="date"
                 value={date}
                 onChange={e => setDate(e.target.value)}
                 className="bg-transparent text-slate-200 px-4 py-2.5 outline-none text-sm font-medium [color-scheme:dark]"
               />
               {!isToday && (
                 <button 
                   onClick={() => setDate(todayStr)}
                   className="px-4 py-2.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors border-l border-white/[0.06]"
                 >
                   Today
                 </button>
               )}
             </div>
          </div>
          
          {/* Stats Chips */}
          <div className="flex gap-3">
             <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-dark border border-white/[0.06]">
               <Activity className="w-4 h-4 text-slate-400" />
               <span className="text-sm font-bold text-slate-200">{records.length} <span className="font-normal text-slate-500 ml-1">Check-ins</span></span>
             </div>
          </div>
        </div>

        {/* Attendance List */}
        <div className={`glass-dark rounded-3xl border border-white/[0.06] overflow-hidden transition-all duration-500 delay-150 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {loading ? (
             <div className="p-8 space-y-4">
               {[...Array(5)].map((_, i) => (
                 <div key={i} className="h-16 rounded-xl skeleton" />
               ))}
             </div>
          ) : records.length === 0 ? (
             <div className="p-16 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20">
                  <Clock className="w-8 h-8 text-emerald-400 opacity-50" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No check-ins yet</h3>
                <p className="text-slate-400 text-sm max-w-sm">
                  {isToday ? "No members have checked in today. Waiting for the first scan..." : `No attendance records found for ${new Date(date).toLocaleDateString()}.`}
                </p>
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-white/[0.02] border-b border-white/[0.06]">
                  <tr>
                    <th className="px-6 py-4 font-bold tracking-wider">Member</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Time</th>
                    <th className="px-6 py-4 font-bold tracking-wider hidden sm:table-cell">Membership Status</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {records.map((record) => {
                    const member = record.members;
                    const isActive = member.status === 'Active';
                    const initials = member?.name ? member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '??';
                    // Normalize Supabase timestamp (may be "2026-05-24 17:51:00+00" or "...+00:00")
                    // to a proper ISO 8601 string so the browser always parses it as UTC
                    // and toLocaleTimeString converts to the user's local timezone correctly.
                    const rawTime = record.scan_time as string
                    let normalizedTime = rawTime
                      .replace(' ', 'T')                        // space → T separator
                      .replace(/\+00$/, '+00:00')               // +00 → +00:00
                      
                    if (!normalizedTime.includes('Z') && !/[+-]\d{2}:?\d{2}$/.test(normalizedTime)) {
                      normalizedTime += 'Z'
                    }
                    
                    const scanDate = new Date(normalizedTime)
                    const timeStr = isNaN(scanDate.getTime())
                      ? '—'
                      : scanDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    
                    return (
                      <tr key={record.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center border border-emerald-500/20 flex-shrink-0 group-hover:scale-105 transition-transform">
                              <span className="font-black text-emerald-400 text-xs">{initials}</span>
                            </div>
                            <div>
                              <p className="font-bold text-slate-200">{member?.name || 'Unknown'}</p>
                              <p className="text-xs text-slate-500 font-mono mt-0.5">{member?.membership_no || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] font-mono text-slate-300">
                             <Clock className="w-3.5 h-3.5 text-emerald-400" />
                             {timeStr}
                           </div>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                            isActive 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            {member?.status || 'Unknown'}
                          </span>
                        </td>
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
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ManualAttendanceModal 
          onClose={() => setShowModal(false)} 
          onSuccess={fetchAttendance} 
          alreadyMarkedIds={new Set(records.map(r => r.member_id))}
        />
      )}
    </div>
  )
}
