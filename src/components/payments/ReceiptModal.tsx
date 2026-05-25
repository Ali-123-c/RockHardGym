'use client'

import { X, Printer, CheckCircle2 } from 'lucide-react'

export function ReceiptModal({ payment, onClose }: any) {
  const handlePrint = () => {
    window.print()
  }

  if (!payment) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in print:bg-white print:p-0 print:absolute print:inset-0"
      style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-md bg-slate-50 print:bg-white rounded-3xl print:rounded-none shadow-2xl print:shadow-none border border-slate-200 print:border-none overflow-hidden animate-scale-in">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-emerald-500 to-teal-500 print:hidden" />

        <div className="flex justify-between items-center p-4 print:hidden border-b border-slate-200">
          <h3 className="text-slate-900 font-bold pl-2">Payment Receipt</h3>
          <button type="button" onClick={onClose} className="p-2 text-slate-500 hover:text-slate-900 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 print:p-10 text-slate-700 print:text-black">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 print:bg-emerald-100 mb-4 border border-emerald-200 print:border-none">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 print:text-emerald-600" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 print:text-black tracking-tight mb-1">ROCK HARD GYM</h1>
            <p className="text-sm text-slate-600 print:text-gray-500 uppercase tracking-widest">Payment Receipt</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex justify-between pb-4 border-b border-slate-200 print:border-gray-200">
              <span className="text-slate-600 print:text-gray-500 text-sm">Receipt No.</span>
              <span className="font-mono text-slate-900 print:text-black">#{payment.id.split('-')[0].toUpperCase()}</span>
            </div>
            <div className="flex justify-between pb-4 border-b border-slate-200 print:border-gray-200">
              <span className="text-slate-600 print:text-gray-500 text-sm">Date</span>
              <span className="text-slate-900 print:text-black font-medium">{new Date(payment.payment_date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between pb-4 border-b border-slate-200 print:border-gray-200">
              <span className="text-slate-600 print:text-gray-500 text-sm">Member</span>
              <div className="text-right">
                <span className="block text-slate-900 print:text-black font-medium">{payment.members?.name}</span>
                <span className="block text-xs font-mono mt-0.5 text-slate-500">{payment.members?.membership_no}</span>
              </div>
            </div>
            <div className="flex justify-between pb-4 border-b border-slate-200 print:border-gray-200">
              <span className="text-slate-600 print:text-gray-500 text-sm">For Month</span>
              <span className="text-slate-900 print:text-black font-medium">{payment.month}</span>
            </div>
          </div>

          <div className="flex items-end justify-between p-4 rounded-2xl bg-emerald-50 print:bg-gray-100 border border-emerald-200 print:border-gray-300">
            <span className="text-emerald-700 print:text-gray-700 font-bold uppercase tracking-widest text-sm">Total Paid</span>
            <span className="text-3xl font-black text-emerald-600 print:text-black">Rs {payment.amount?.toLocaleString()}</span>
          </div>
          
          <div className="mt-8 text-center text-xs text-slate-500 print:text-gray-400">
            Thank you for your payment!
          </div>
        </div>

        <div className="p-4 bg-slate-100 border-t border-slate-200 print:hidden">
          <button 
            type="button"
            onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print Receipt
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          .print\\:absolute {
            visibility: visible !important;
          }
          .print\\:absolute * {
            visibility: visible !important;
          }
        }
      `}} />
    </div>
  )
}
