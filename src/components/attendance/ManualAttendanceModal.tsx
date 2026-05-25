'use client'

import { useState, useEffect } from 'react'
import { X, Search, UserCheck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export function ManualAttendanceModal({ onClose, onSuccess, alreadyMarkedIds }: { onClose: () => void, onSuccess: () => void, alreadyMarkedIds?: Set<string> }) {
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState<string | null>(null)
  // Track members marked in this session so admin can see who's done
  const [markedIds, setMarkedIds] = useState<Set<string>>(alreadyMarkedIds || new Set())
  const [reviewMember, setReviewMember] = useState<any>(null)

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await fetch('/api/members')
        const data = await res.json()
        if (data.success) {
          setMembers(data.data.filter((m: any) => m.status === 'Active'))
        }
      } catch (error) {
        console.error('Failed to fetch members', error)
      } finally {
        setLoading(false)
      }
    }
    fetchMembers()
  }, [])

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.phone.includes(search) ||
    m.membership_no.toLowerCase().includes(search.toLowerCase())
  )

  const handleMarkAttendance = async (memberId: string) => {
    if (markedIds.has(memberId)) return
    setSubmitting(memberId)
    try {
      // Send local date + timezone so the server stores the correct calendar date
      // regardless of its own UTC offset.
      const localDate = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local tz
      const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          local_date: localDate,
          client_timezone: clientTimezone,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        // Mark as done in this session — keep modal open for more entries
        setMarkedIds(prev => new Set(prev).add(memberId))
        onSuccess() // refresh the attendance list in the background
      } else if (data.error === 'requires_admin_review') {
        const m = members.find(m => m.id === memberId)
        setReviewMember(m)
      } else {
        alert(data.message || data.error || 'Failed to mark attendance')
      }
    } catch (error) {
      console.error('Error marking attendance', error)
      alert('An error occurred')
    } finally {
      setSubmitting(null)
    }
  }

  const handleKeepActive = async () => {
    if (!reviewMember) return
    try {
      const res = await fetch(`/api/members/${reviewMember.id}/exempt`, { method: 'POST' })
      if (res.ok) {
        const exemptedMemberId = reviewMember.id
        setReviewMember(null)
        // Try marking attendance again automatically
        handleMarkAttendance(exemptedMemberId)
      } else {
        alert('Failed to exempt member')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleMakeInactive = () => {
    setMembers(prev => prev.filter(m => m.id !== reviewMember?.id))
    setReviewMember(null)
  }

  const markedCount = markedIds.size

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(4,4,12,0.85)', backdropFilter: 'blur(20px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col bg-[#0f0f1a] rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.8)] border border-white/[0.07] overflow-hidden animate-scale-in">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />

        {/* Admin Review Overlay */}
        {reviewMember && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 bg-[#0f0f1a]/95 backdrop-blur-md text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-6 border border-rose-500/20">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="text-2xl font-black text-white mb-3">Review Required</h3>
            <p className="text-slate-300 text-sm mb-8 max-w-sm leading-relaxed">
              <strong className="text-white">{reviewMember.name}</strong> has been absent for 10 or more days this month. 
              Their status has automatically been set to <strong className="text-rose-400">Inactive</strong>.
            </p>
            <div className="flex gap-3 w-full max-w-xs">
              <button 
                onClick={handleMakeInactive}
                className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 font-semibold transition"
              >
                Keep Inactive
              </button>
              <button 
                onClick={handleKeepActive}
                className="flex-1 py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold border border-emerald-500/30 transition shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.6)]"
              >
                Exempt & Active
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06] flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" /> Mark Attendance
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {markedCount > 0
                ? <span className="text-emerald-400 font-semibold">{markedCount} member{markedCount > 1 ? 's' : ''} marked ✓ — keep going or close</span>
                : 'Search for a member to mark them present'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4 flex-1 overflow-hidden">
          <div className="relative group flex-shrink-0">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl blur opacity-0 group-focus-within:opacity-20 transition duration-500" />
            <div className="relative flex items-center bg-[#1a1a2e] rounded-xl border border-white/[0.07] group-focus-within:border-emerald-500/40 transition-colors">
              <Search className="absolute left-3.5 w-4 h-4 text-slate-500" />
              <input
                autoFocus
                type="text"
                placeholder="Search by name, ID or phone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-transparent text-slate-200 placeholder-slate-500 outline-none text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-500 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                <p className="text-sm">Loading active members...</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                No members found matching &ldquo;{search}&rdquo;
              </div>
            ) : (
              filteredMembers.map(member => {
                const isMarked = markedIds.has(member.id)
                const isSubmitting = submitting === member.id

                return (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition group ${
                      isMarked
                        ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
                        : 'border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div>
                      <p className={`font-semibold text-sm ${isMarked ? 'text-emerald-300' : 'text-slate-200'}`}>
                        {member.name}
                        {isMarked && <span className="ml-2 text-xs font-normal text-emerald-500">● Present</span>}
                      </p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{member.membership_no} • {member.phone}</p>
                    </div>
                    <button
                      onClick={() => handleMarkAttendance(member.id)}
                      disabled={isMarked || submitting !== null}
                      className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                        isMarked
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white disabled:opacity-50'
                      }`}
                    >
                      {isSubmitting
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <CheckCircle2 className="w-4 h-4" />
                      }
                      {isMarked ? 'Marked' : 'Mark'}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Footer: Done button */}
        <div className="px-6 pb-5 flex-shrink-0 border-t border-white/[0.06] pt-4">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] text-slate-300 text-sm font-semibold border border-white/[0.06] transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
