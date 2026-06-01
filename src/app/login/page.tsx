'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { Lock, Mail, Key, Loader2, ArrowRight } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (searchParams?.get('error') !== 'admin_required') return

    setError('Admin access required. Please sign in with the configured super admin account.')
    supabase.auth.signOut()
  }, [searchParams, supabase])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.push('/')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-violet-600/[0.05] rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-fuchsia-600/[0.05] rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-grid opacity-20" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="glass rounded-3xl border border-slate-200 overflow-hidden shadow-2xl">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500" />
          
          <div className="p-8">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-6 shadow-inner mx-auto">
              <Lock className="w-8 h-8 text-violet-400" />
            </div>
            
            <h1 className="text-2xl font-black text-slate-900 text-center tracking-tight mb-2">
              ROCK HARD GYM Admin
            </h1>
            <p className="text-slate-600 text-sm text-center mb-8">
              Sign in with the configured super admin account.
            </p>

            {error && (
              <div className="p-4 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm text-center font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-300 text-slate-900 rounded-xl focus:outline-none focus:border-violet-500/50 transition-all text-sm"
                    placeholder="admin@gym.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2 ml-1">Password</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-300 text-slate-900 rounded-xl focus:outline-none focus:border-violet-500/50 transition-all text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full group relative flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white overflow-hidden shadow-[0_0_20px_-5px_rgba(139,92,246,0.5)] hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.7)] transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity bg-white" />
                {loading ? <Loader2 className="relative w-5 h-5 animate-spin" /> : (
                  <>
                    <span className="relative">Secure Login</span>
                    <ArrowRight className="relative w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
