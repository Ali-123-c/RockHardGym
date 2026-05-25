'use client'

import { useState } from 'react'
import {
  X, Save, User, Phone, MapPin, Calendar,
  CreditCard, Hash, Activity, ChevronDown, Loader2
} from 'lucide-react'

interface FieldProps {
  label: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  span?: boolean
}

function Field({ label, icon: Icon, children, span }: FieldProps) {
  return (
    <div className={`space-y-2 ${span ? 'md:col-span-2' : ''}`}>
      <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
        <Icon className="w-3.5 h-3.5 text-indigo-400" />
        {label}
      </label>
      <div className="relative group">
        {/* Focus glow ring */}
        <div className="absolute -inset-px bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 rounded-xl opacity-0 group-focus-within:opacity-30 blur-sm transition-all duration-400 pointer-events-none" />
        {children}
      </div>
    </div>
  )
}

const inputClass =
  'relative w-full px-4 py-3 bg-[#1a1a2e] border border-white/[0.07] text-slate-200 placeholder-slate-600 rounded-xl focus:outline-none focus:border-indigo-500/50 transition-all duration-300 text-sm'

export function MemberForm({ member = null, onSubmit, onClose }: any) {
  const [formData, setFormData] = useState(
    member || {
      name: '',
      phone: '',
      membership_no: '',
      city: '',
      address: '',
      joining_date: new Date().toISOString().split('T')[0],
      expiry_date: new Date(new Date().setMonth(new Date().getMonth() + 1))
        .toISOString()
        .split('T')[0],
      fee_amount: 5000,
      status: 'Active',
    }
  )
  const [saving, setSaving] = useState(false)

  const set = (key: string, value: any) =>
    setFormData((prev: any) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setSaving(true)
    await onSubmit(formData)
    setSaving(false)
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(4,4,12,0.85)', backdropFilter: 'blur(20px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Sheet */}
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#0f0f1a] rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.8)] border border-white/[0.07] overflow-hidden animate-scale-in">

        {/* Colour stripe across top */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />

        {/* Ambient glow */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/15 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-violet-500/10 rounded-full blur-[60px] pointer-events-none" />

        {/* ── Header ── */}
        <div className="relative flex items-center justify-between px-8 py-6 border-b border-white/[0.06] flex-shrink-0">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                {member ? 'Editing' : 'New Registration'}
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {member ? 'Edit Member' : 'Register Member'}
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              {member ? 'Update the member details below' : 'Fill in the details to register a new gym member'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 border border-white/[0.06] hover:border-white/15 transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable form body ── */}
        <form
          onSubmit={handleSubmit}
          className="relative flex-1 overflow-y-auto px-8 py-7 space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <Field label="Full Name" icon={User}>
              <input
                required
                type="text"
                value={formData.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Ali Hassan"
                className={inputClass}
              />
            </Field>

            <Field label="Phone Number" icon={Phone}>
              <input
                required
                type="text"
                value={formData.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="0300 1234567"
                className={inputClass}
              />
            </Field>

            <Field label="Membership No." icon={Hash}>
              <input
                required
                type="text"
                value={formData.membership_no}
                onChange={e => set('membership_no', e.target.value)}
                placeholder="e.g. MEM-1234"
                className={inputClass}
              />
            </Field>

            <Field label="City" icon={MapPin}>
              <input
                required
                type="text"
                value={formData.city}
                onChange={e => set('city', e.target.value)}
                placeholder="Islamabad"
                className={inputClass}
              />
            </Field>

            <Field label="Address (Optional)" icon={MapPin} span>
              <input
                type="text"
                value={formData.address || ''}
                onChange={e => set('address', e.target.value)}
                placeholder="House 1, Street 2, F-8…"
                className={inputClass}
              />
            </Field>

            <Field label="Joining Date" icon={Calendar}>
              <input
                required
                type="date"
                value={formData.joining_date}
                onChange={e => set('joining_date', e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Expiry Date" icon={Calendar}>
              <input
                required
                type="date"
                value={formData.expiry_date}
                onChange={e => set('expiry_date', e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Monthly Fee (Rs)" icon={CreditCard}>
              <input
                required
                type="number"
                min={0}
                value={formData.fee_amount || ''}
                onChange={e => set('fee_amount', e.target.value ? parseInt(e.target.value) : '')}
                className={inputClass}
              />
            </Field>

            <Field label="Status" icon={Activity}>
              <select
                value={formData.status}
                onChange={e => set('status', e.target.value)}
                className={`${inputClass} appearance-none cursor-pointer pr-10`}
              >
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </Field>

          </div>

          {/* ── Footer ── */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.05]">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/15 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="group relative flex items-center gap-2.5 px-8 py-3 rounded-xl font-bold text-white text-sm overflow-hidden shadow-[0_0_30px_-8px_rgba(99,102,241,0.6)] hover:shadow-[0_0_50px_-10px_rgba(99,102,241,0.8)] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-size-200% animate-gradient-shift" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/10" />
              {saving
                ? <Loader2 className="relative w-4 h-4 animate-spin" />
                : <Save className="relative w-4 h-4" />}
              <span className="relative">{saving ? 'Saving…' : 'Save Member'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
