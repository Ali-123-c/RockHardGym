'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CreditCard, Wallet, Receipt, History, AlertCircle, Plus, Search, Loader2
} from 'lucide-react'
import { PaymentModal } from '@/components/payments/PaymentModal'
import { ReceiptModal } from '@/components/payments/ReceiptModal'

export default function PaymentsPage() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending')
  
  const [payments, setPayments] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [initialMemberId, setInitialMemberId] = useState('')
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null)

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [paymentsRes, membersRes] = await Promise.all([
        fetch(`/api/payments?month=${selectedMonth}`),
        fetch('/api/members')
      ])
      
      const paymentsData = await paymentsRes.json()
      const membersData = await membersRes.json()
      
      if (paymentsData.success) setPayments(paymentsData.data)
      if (membersData.success) setMembers(membersData.data.filter((m: any) => m.status === 'Active'))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => { setMounted(true) }, [])

  // Calculate pending members
  // A member is pending if they are active, joined before or during the selected month, and haven't paid yet
  const paidMemberIds = new Set(payments.map(p => p.member_id))
  const pendingMembers = members.filter(m => {
    if (paidMemberIds.has(m.id)) return false
    
    // Check if they joined after the selected month
    if (m.joining_date) {
      const joinMonth = m.joining_date.substring(0, 7)
      if (joinMonth > selectedMonth) return false
    }
    return true
  })

  const filteredPending = pendingMembers.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.membership_no.toLowerCase().includes(search.toLowerCase())
  )

  const filteredHistory = payments.filter(p => 
    p.members?.name.toLowerCase().includes(search.toLowerCase()) || 
    p.members?.membership_no.toLowerCase().includes(search.toLowerCase())
  )

  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0)

  const handleRecordPayment = (memberId = '') => {
    setInitialMemberId(memberId)
    setShowPaymentModal(true)
  }

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false)
    fetchData()
  }

  return (
    <div className="relative min-h-screen bg-[#080810] overflow-hidden">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[10%] w-[600px] h-[600px] bg-violet-600/[0.07] rounded-full blur-[130px] animate-orb-move" />
        <div className="absolute bottom-[-15%] left-[5%] w-[500px] h-[500px] bg-emerald-600/[0.05] rounded-full blur-[100px] animate-orb-move" style={{ animationDelay: '-5s' }} />
        <div className="absolute inset-0 bg-grid" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Header */}
        <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 mb-4">
              <CreditCard className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Finance</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white mb-2">Payments</h1>
            <p className="text-slate-400 text-sm max-w-xl">Manage fee collections, track revenue, and print receipts.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2.5 bg-white/[0.03] border border-white/[0.07] rounded-xl text-white outline-none focus:border-violet-500/50 transition cursor-pointer"
            />
            <button 
              onClick={() => handleRecordPayment()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition shadow-[0_0_20px_-5px_rgba(139,92,246,0.4)]"
            >
              <Plus className="w-4 h-4" /> Record Payment
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 transition-all duration-500 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="glass-dark rounded-3xl border border-emerald-500/20 p-6 flex items-center gap-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition" />
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center relative z-10">
              <Wallet className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Total Revenue</p>
              <h2 className="text-4xl font-black text-white">Rs {totalRevenue.toLocaleString()}</h2>
            </div>
          </div>
          
          <div className="glass-dark rounded-3xl border border-rose-500/20 p-6 flex items-center gap-6 relative overflow-hidden group">
             <div className="absolute inset-0 bg-rose-500/5 group-hover:bg-rose-500/10 transition" />
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center relative z-10">
              <AlertCircle className="w-8 h-8 text-rose-400" />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Pending Collections</p>
              <h2 className="text-4xl font-black text-white">{pendingMembers.length} <span className="text-xl text-slate-500">members</span></h2>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className={`glass-dark rounded-3xl border border-white/[0.06] overflow-hidden transition-all duration-500 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          
          {/* Tabs & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-white/[0.06] gap-4">
            <div className="flex p-1 bg-white/[0.03] rounded-xl border border-white/[0.05] inline-flex">
              <button 
                onClick={() => setActiveTab('pending')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition ${activeTab === 'pending' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <AlertCircle className="w-4 h-4" /> Pending
                <span className="ml-1 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 text-xs">{pendingMembers.length}</span>
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition ${activeTab === 'history' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <History className="w-4 h-4" /> History
                <span className="ml-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs">{payments.length}</span>
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search member..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white/[0.03] border border-white/[0.07] rounded-xl text-sm text-white outline-none focus:border-violet-500/50 transition"
              />
            </div>
          </div>

          {/* Table Area */}
          <div className="overflow-x-auto min-h-[300px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-violet-500" />
                <p>Loading data...</p>
              </div>
            ) : activeTab === 'pending' ? (
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-white/[0.02] text-slate-400 border-b border-white/[0.06]">
                  <tr>
                    <th className="px-6 py-4 font-bold">Member</th>
                    <th className="px-6 py-4 font-bold">Fee Amount</th>
                    <th className="px-6 py-4 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredPending.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                        {search ? 'No pending members found for search.' : 'All members have paid for this month! 🎉'}
                      </td>
                    </tr>
                  ) : filteredPending.map(m => (
                    <tr key={m.id} className="hover:bg-white/[0.02] transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white mb-0.5">{m.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{m.membership_no}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-rose-400">
                        Rs {m.fee_amount?.toLocaleString() || 0}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleRecordPayment(m.id)}
                          className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white font-bold transition text-xs"
                        >
                          Mark Paid
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-white/[0.02] text-slate-400 border-b border-white/[0.06]">
                  <tr>
                    <th className="px-6 py-4 font-bold">Member</th>
                    <th className="px-6 py-4 font-bold">Amount Paid</th>
                    <th className="px-6 py-4 font-bold">Date</th>
                    <th className="px-6 py-4 font-bold text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                        {search ? 'No payments found for search.' : 'No payments recorded for this month yet.'}
                      </td>
                    </tr>
                  ) : filteredHistory.map(p => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white mb-0.5">{p.members?.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{p.members?.membership_no}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-400">
                        Rs {p.amount?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(p.payment_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setSelectedReceipt(p)}
                          className="p-2 rounded-lg bg-white/[0.05] text-slate-300 hover:text-white hover:bg-white/[0.1] transition border border-white/[0.05] inline-flex"
                          title="View Receipt"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {showPaymentModal && (
        <PaymentModal 
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
          initialMemberId={initialMemberId}
        />
      )}

      {selectedReceipt && (
        <ReceiptModal 
          payment={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  )
}
