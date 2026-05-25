'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, UserPlus, Edit2, Trash2, Clock, Phone, MapPin, Activity, Users, X, Eye } from 'lucide-react'
import Link from 'next/link'
import { MemberForm } from '@/components/members/MemberForm'

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingMember, setEditingMember] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/members${search ? `?search=${search}` : ''}`)
      const data = await res.json()
      if (data.success) setMembers(data.data)
    } catch (error) {
      console.error('Failed to fetch members', error)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const handleSaveMember = async (formData: any) => {
    try {
      const url = editingMember ? `/api/members/${formData.id}` : '/api/members'
      const method = editingMember ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setShowForm(false)
        setEditingMember(null)
        fetchMembers()
      } else {
        alert('Failed to save member')
      }
    } catch (error) {
      console.error('Error saving member', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this member?')) return
    try {
      await fetch(`/api/members/${id}`, { method: 'DELETE' })
      fetchMembers()
    } catch (error) {
      console.error('Error deleting member', error)
    }
  }

  const activeCount = members.filter(m => m.status === 'Active').length
  const expiredCount = members.length - activeCount

  return (
    <div className="relative min-h-screen bg-[#080810] overflow-hidden">

      {/* ── Background orbs ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/[0.07] rounded-full blur-[130px] animate-orb-move" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-violet-600/[0.05] rounded-full blur-[100px] animate-orb-move" style={{ animationDelay: '-3s' }} />
        <div className="absolute inset-0 bg-grid" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ── Page Header ── */}
        <div className={`mb-10 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Members</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gradient-white mb-2">
                Member Directory
              </h1>
              <p className="text-slate-400 text-base">
                Manage your gym members and track their membership status.
              </p>
            </div>
            <button
              onClick={() => { setEditingMember(null); setShowForm(true) }}
              className="group relative flex-shrink-0 flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-white overflow-hidden shadow-[0_0_40px_-12px_rgba(99,102,241,0.6)] hover:shadow-[0_0_60px_-10px_rgba(99,102,241,0.8)] transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-size-200% animate-gradient-shift" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/10" />
              <Plus className="relative w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
              <span className="relative">Add Member</span>
            </button>
          </div>
        </div>

        {/* ── Summary chips ── */}
        <div className={`flex flex-wrap gap-3 mb-8 transition-all duration-500 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-dark border border-white/[0.06]">
            <Users className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-300">{members.length} Total</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold text-emerald-400">{activeCount} Active</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/20">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span className="text-sm font-semibold text-rose-400">{expiredCount} Expired</span>
          </div>
        </div>

        {/* ── Search Bar ── */}
        <div className={`mb-8 transition-all duration-500 delay-150 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="relative group max-w-lg">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-2xl blur opacity-0 group-focus-within:opacity-25 transition duration-500" />
            <div className="relative flex items-center glass-dark rounded-2xl border border-white/[0.06] group-focus-within:border-indigo-500/40 transition-colors duration-300">
              <Search className="absolute left-4 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors duration-300" />
              <input
                type="text"
                placeholder="Search members by name, phone, ID…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-12 pr-10 py-3.5 bg-transparent text-slate-200 placeholder-slate-600 outline-none rounded-2xl text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Members Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-52 rounded-2xl skeleton" />
            ))}
          </div>
        ) : members.length === 0 ? (
          /* Empty State */
          <div className="glass-dark rounded-3xl border border-white/[0.06] p-16 text-center relative overflow-hidden animate-scale-in">
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
            <div className="relative">
              <div className="w-24 h-24 mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/30 to-fuchsia-500/30 rounded-3xl blur-xl animate-glow-pulse" />
                <div className="relative w-full h-full bg-gradient-to-tr from-indigo-500/20 to-fuchsia-500/20 rounded-3xl flex items-center justify-center border border-white/10">
                  <UserPlus className="w-10 h-10 text-indigo-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {search ? 'No results found' : 'No members yet'}
              </h3>
              <p className="text-slate-400 max-w-sm mx-auto text-sm leading-relaxed">
                {search
                  ? `No members match "${search}". Try a different search term.`
                  : 'Get started by registering your first gym member.'}
              </p>
              {!search && (
                <button
                  onClick={() => { setEditingMember(null); setShowForm(true) }}
                  className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/25 transition-all duration-300 text-sm font-semibold"
                >
                  <Plus className="w-4 h-4" /> Add your first member
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Members Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {members.map((member, index) => {
              const isActive = member.status === 'Active'
              const initials = member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
              const expiryDate = new Date(member.expiry_date)
              const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              const isExpiringSoon = isActive && daysLeft <= 7 && daysLeft > 0

              return (
                <div
                  key={member.id}
                  className="group relative glass-dark rounded-2xl border border-white/[0.06] p-6 hover:border-indigo-500/25 card-hover flex flex-col overflow-hidden animate-slide-up opacity-0"
                  style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'forwards' }}
                >
                  {/* Hover shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/0 via-indigo-600/0 to-violet-600/0 group-hover:from-indigo-600/5 group-hover:to-violet-600/5 transition-all duration-500 rounded-2xl pointer-events-none" />

                  {/* Top accent line per status */}
                  <div className={`absolute top-0 left-6 right-6 h-[1px] ${isActive ? 'bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent' : 'bg-gradient-to-r from-transparent via-rose-500/30 to-transparent'}`} />

                  {/* Action buttons */}
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                    <Link
                      href={`/members/${member.id}`}
                      className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-xl transition-all duration-200 border border-emerald-500/20"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => { setEditingMember(member); setShowForm(true) }}
                      className="p-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-xl transition-all duration-200 border border-indigo-500/20"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(member.id)}
                      className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all duration-200 border border-rose-500/20"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Avatar + Name */}
                  <div className="flex items-center gap-4 mb-5">
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-[2px] shadow-lg shadow-indigo-500/20">
                        <div className="w-full h-full rounded-[14px] bg-[#0f0f1a] flex items-center justify-center">
                          <span className="text-base font-black text-gradient">{initials}</span>
                        </div>
                      </div>
                      {/* Status dot */}
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0f0f1a] ${isActive ? 'bg-emerald-400' : 'bg-rose-500'} ${isActive ? 'shadow-[0_0_8px_rgba(52,211,153,0.6)]' : ''}`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-100 group-hover:text-white transition-colors truncate">{member.name}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{member.membership_no}</p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2.5 flex-1 mb-5">
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <span className="truncate">{member.phone}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <span className="truncate">{member.city}{member.address ? ` — ${member.address}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <span className={isExpiringSoon ? 'text-amber-400 font-semibold' : 'text-slate-400'}>
                        Expires {expiryDate.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {isExpiringSoon && <span className="ml-1.5 text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-500/20">Soon</span>}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-4 border-t border-white/[0.05] flex items-center justify-between mt-auto">
                    <div>
                      <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mb-0.5">Monthly Fee</p>
                      <p className="text-lg font-black text-slate-200">Rs {member.fee_amount?.toLocaleString()}</p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest border ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_12px_-3px_rgba(52,211,153,0.3)]'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {member.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Member Form Modal ── */}
      {showForm && (
        <MemberForm
          member={editingMember}
          onSubmit={handleSaveMember}
          onClose={() => { setShowForm(false); setEditingMember(null) }}
        />
      )}
    </div>
  )
}
