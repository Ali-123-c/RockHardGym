'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  BarChart3, Users, Clock, DollarSign,
  ArrowRight, Zap, TrendingUp, Shield,
  UserPlus, CalendarCheck, Wallet
} from 'lucide-react'

// ── Animated count-up hook ──────────────────────────────────────
function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0)
  const startTime = useRef<number | null>(null)

  useEffect(() => {
    if (target === 0) return
    const step = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const progress = Math.min((timestamp - startTime.current) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(ease * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])

  return count
}

// ── Types ───────────────────────────────────────────────────────
interface Stats {
  totalMembers: number
  activeMembers: number
  pendingFees: number
  monthlyRevenue: number
}

// ── Stat Card ───────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  suffix = '',
  prefix = '',
  gradientFrom,
  gradientTo,
  glowColor,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  suffix?: string
  prefix?: string
  gradientFrom: string
  gradientTo: string
  glowColor: string
  delay?: number
}) {
  const displayed = useCountUp(value)

  return (
    <div
      className="relative group rounded-2xl p-6 glass card-hover overflow-hidden animate-slide-up opacity-0 border border-slate-200"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      {/* Animated border glow on hover */}
      <div
        className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
        style={{
          background: `linear-gradient(135deg, ${glowColor}15, transparent 60%)`,
        }}
      />

      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px] opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${glowColor}, transparent)` }}
      />

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            {label}
          </p>
          <p className="text-3xl font-black text-slate-900 tracking-tight">
            {prefix}{displayed.toLocaleString()}{suffix}
          </p>
        </div>

        {/* Icon with glow */}
        <div className="relative flex-shrink-0 ml-4">
          <div
            className="absolute inset-0 rounded-2xl blur-lg opacity-50 group-hover:opacity-80 transition-opacity duration-300 animate-glow-pulse"
            style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
          />
          <div
            className="relative w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg animate-float"
            style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      <div className="relative mt-4 pt-4 border-t border-white/5 flex items-center gap-2">
        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-xs text-emerald-400 font-medium">Live data</span>
      </div>
    </div>
  )
}

// ── Quick Action Card ────────────────────────────────────────────
function ActionCard({
  href,
  label,
  description,
  icon: Icon,
  gradientFrom,
  gradientTo,
  delay = 0,
}: {
  href: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  gradientFrom: string
  gradientTo: string
  delay?: number
}) {
  return (
    <Link
      href={href}
      className="group relative glass rounded-2xl p-6 card-hover flex items-center gap-5 overflow-hidden animate-slide-up opacity-0 border border-slate-200 hover:border-slate-300"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      {/* Hover background sweep */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `linear-gradient(135deg, ${gradientFrom}10, ${gradientTo}05)` }}
      />

      <div className="relative flex-shrink-0">
        <div
          className="absolute inset-0 rounded-xl blur-lg opacity-0 group-hover:opacity-60 transition-opacity duration-300"
          style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
        />
        <div
          className="relative w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110"
          style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>

      <div className="relative flex-1 min-w-0">
        <p className="font-bold text-slate-900 text-sm">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5 truncate">{description}</p>
      </div>

      <ArrowRight className="relative w-4 h-4 text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
    </Link>
  )
}

// ── Main Dashboard ───────────────────────────────────────────────
export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalMembers: 0,
    activeMembers: 0,
    pendingFees: 0,
    monthlyRevenue: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/members')
        const data = await res.json()
        if (data.success && Array.isArray(data.data)) {
          const members = data.data
          const active = members.filter((m: any) => m.status === 'Active').length
          const revenue = members
            .filter((m: any) => m.status === 'Active')
            .reduce((sum: number, m: any) => sum + (m.fee_amount || 0), 0)
          setStats({
            totalMembers: members.length,
            activeMembers: active,
            pendingFees: members.length - active,
            monthlyRevenue: revenue,
          })
        }
      } catch {
        // Keep zeros if API unavailable
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  return (
    <div className="relative min-h-screen bg-slate-50 overflow-hidden">

      {/* ── Ambient background orbs ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] bg-indigo-600/[0.08] rounded-full blur-[120px] animate-orb-move" />
        <div className="absolute top-[30%] right-[-15%] w-[600px] h-[600px] bg-violet-600/[0.06] rounded-full blur-[120px] animate-orb-move" style={{ animationDelay: '-4s' }} />
        <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-fuchsia-700/[0.05] rounded-full blur-[100px] animate-orb-move" style={{ animationDelay: '-2s' }} />
        {/* Grid */}
        <div className="absolute inset-0 bg-grid opacity-100" />
        {/* Radial vignette */}
        <div className="absolute inset-0 bg-radial-dark" style={{ background: 'radial-gradient(ellipse at 50% 0%, transparent 60%, #f8fafc 100%)' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ── Hero Header ── */}
        <div className="mb-12 animate-slide-down">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-5">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Dashboard</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 mb-4 leading-tight">
            Welcome to<br />
            <span className="text-gradient">ROCK HARD GYM</span>
          </h1>
          <p className="text-slate-600 text-lg max-w-xl leading-relaxed">
            Your all-in-one gym management platform. Track members, attendance, and revenue in real time.
          </p>
        </div>

        {/* ── Stat Cards ── */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              Overview
            </h2>
            <span className="text-xs text-slate-600 font-medium uppercase tracking-wider">Live</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-36 rounded-2xl skeleton" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <StatCard
                icon={Users}
                label="Total Members"
                value={stats.totalMembers}
                gradientFrom="#6366f1"
                gradientTo="#8b5cf6"
                glowColor="#6366f1"
                delay={0}
              />
              <StatCard
                icon={Shield}
                label="Active Members"
                value={stats.activeMembers}
                gradientFrom="#10b981"
                gradientTo="#059669"
                glowColor="#10b981"
                delay={80}
              />
              <StatCard
                icon={Clock}
                label="Pending Fees"
                value={stats.pendingFees}
                gradientFrom="#f59e0b"
                gradientTo="#d97706"
                glowColor="#f59e0b"
                delay={160}
              />
              <StatCard
                icon={DollarSign}
                label="Monthly Revenue"
                value={stats.monthlyRevenue}
                prefix="Rs "
                gradientFrom="#a855f7"
                gradientTo="#7c3aed"
                glowColor="#a855f7"
                delay={240}
              />
            </div>
          )}
        </section>

        {/* ── Quick Actions ── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-violet-400" />
              Quick Actions
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActionCard
              href="/members"
              label="Add New Member"
              description="Register a new gym member"
              icon={UserPlus}
              gradientFrom="#6366f1"
              gradientTo="#8b5cf6"
              delay={320}
            />
            <ActionCard
              href="/attendance"
              label="Mark Attendance"
              description="Log today's check-ins"
              icon={CalendarCheck}
              gradientFrom="#10b981"
              gradientTo="#059669"
              delay={400}
            />
            <ActionCard
              href="/payments"
              label="View Pending Fees"
              description="Collect outstanding payments"
              icon={Wallet}
              gradientFrom="#a855f7"
              gradientTo="#7c3aed"
              delay={480}
            />
          </div>
        </section>

        {/* ── Footer note ── */}
        <div className="mt-16 text-center animate-fade-in opacity-0" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
          <p className="text-slate-700 text-xs">
            ROCK HARD GYM &copy; {new Date().getFullYear()} &mdash; Built for performance
          </p>
        </div>
      </div>
    </div>
  )
}
