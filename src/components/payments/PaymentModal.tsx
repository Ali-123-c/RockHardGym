'use client'

import { useState, useEffect } from 'react'
import { X, Save, User, CreditCard, Calendar, Loader2, ChevronDown } from 'lucide-react'

interface FieldProps {
  label: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  span?: boolean
}

function Field({ label, icon: Icon, children, span }: FieldProps) {
  return (
    <div className={`space-y-2 ${span ? 'md:col-span-2' : ''}`}>
      <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest">
        <Icon className="w-3.5 h-3.5 text-indigo-500" />
        {label}
      </label>
      <div className="relative group">
        <div className="absolute -inset-px bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 rounded-xl opacity-0 group-focus-within:opacity-30 blur-sm transition-all duration-400 pointer-events-none" />
        {children}
      </div>
    </div>
  )
}

const inputClass =
  'relative w-full px-4 py-3 bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl focus:outline-none focus:border-indigo-500/50 transition-all duration-300 text-sm'

export function PaymentModal({ onClose, onSuccess, initialMemberId = '' }: any) {
  const [members, setMembers] = useState<any[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  
  const [formData, setFormData] = useState({
    member_id: initialMemberId,
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
  })
  
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await fetch('/api/members')
        const data = await res.json()
        if (data.success) {
          const activeMembers = data.data.filter((m: any) => m.status === 'Active')
          setMembers(activeMembers)
          
          if (initialMemberId) {
            const m = activeMembers.find((x: any) => x.id === initialMemberId)
            if (m) setFormData(prev => ({ ...prev, amount: m.fee_amount.toString() }))
          }
        }
      } catch (error) {
        console.error('Failed to fetch members', error)
      } finally {
        setLoadingMembers(false)
      }
    }
    fetchMembers()
  }, [initialMemberId])

  const set = (key: string, value: any) =>
    setFormData((prev: any) => ({ ...prev, [key]: value }))

  const handleMemberChange = (memberId: string) => {
    const m = members.find(x => x.id === memberId)
    setFormData(prev => ({
      ...prev,
      member_id: memberId,
      amount: m ? m.fee_amount.toString() : ''
    }))
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!formData.member_id) return alert('Please select a member')
    
    setSaving(true)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: formData.member_id,
          amount: parseFloat(formData.amount),
          payment_date: formData.payment_date,
          month: formData.month
        })
      })
      const data = await res.json()
      if (data.success) {
        onSuccess()
      } else {
        alert(data.error || 'Failed to record payment')
      }
    } catch (e) {
      alert('An error occurred')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-2xl flex flex-col bg-slate-50 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />

        <div className="relative flex items-center justify-between px-8 py-6 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Record Payment</h2>
            <p className="text-slate-600 text-sm mt-0.5">Enter payment details for the selected month</p>
          </div>
          <button type="button" onClick={onClose} className="p-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Member" icon={User} span>
              {loadingMembers ? (
                <div className={`${inputClass} flex items-center gap-2 text-slate-500`}>
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading members...
                </div>
              ) : (
                <>
                  <select
                    required
                    value={formData.member_id}
                    onChange={e => handleMemberChange(e.target.value)}
                    className={`${inputClass} appearance-none cursor-pointer pr-10`}
                  >
                    <option value="">Select a member...</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.membership_no})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </>
              )}
            </Field>

            <Field label="Amount (Rs)" icon={CreditCard}>
              <input
                required
                type="number"
                min={0}
                value={formData.amount}
                onChange={e => set('amount', e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Payment Date" icon={Calendar}>
              <input
                required
                type="date"
                value={formData.payment_date}
                onChange={e => set('payment_date', e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="For Month" icon={Calendar} span>
              <input
                required
                type="month"
                value={formData.month}
                onChange={e => set('month', e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.member_id}
              className="group relative flex items-center gap-2.5 px-8 py-3 rounded-xl font-bold text-white text-sm overflow-hidden shadow-[0_0_30px_-8px_rgba(99,102,241,0.6)] hover:shadow-[0_0_50px_-10px_rgba(99,102,241,0.8)] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-size-200% animate-gradient-shift" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/10" />
              {saving ? <Loader2 className="relative w-4 h-4 animate-spin" /> : <Save className="relative w-4 h-4" />}
              <span className="relative">{saving ? 'Saving…' : 'Record Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
