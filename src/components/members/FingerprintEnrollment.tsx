'use client'

import { useCallback, useEffect, useState } from 'react'
import { Fingerprint, Loader2, RefreshCw, Scan, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  memberId: string
  membershipNo: string
  memberName: string
}

export function FingerprintEnrollment({ memberId, membershipNo, memberName }: Props) {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [onDevice, setOnDevice] = useState(false)
  const [deviceUser, setDeviceUser] = useState<{ name: string; userId: string } | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/members/${memberId}/fingerprint`)
      const payload = await response.json()
      if (!payload.success) throw new Error(payload.error)
      setOnDevice(Boolean(payload.device?.onDevice))
      setDeviceUser(payload.device?.user ?? null)
    } catch (error: any) {
      toast.error(error.message || 'Could not check device')
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const runAction = async (action: string, label: string) => {
    setBusy(action)
    try {
      const response = await fetch(`/api/members/${memberId}/fingerprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const payload = await response.json()
      if (!payload.success) throw new Error(payload.error)
      toast.success(payload.message || label)
      await refresh()
    } catch (error: any) {
      toast.error(error.message || `${label} failed`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="glass rounded-3xl border border-slate-200 p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Fingerprint className="h-5 w-5 text-indigo-600" />
            Fingerprint enrollment
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Device User ID must be <span className="font-mono font-semibold text-indigo-700">{membershipNo}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading || Boolean(busy)}
          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          aria-label="Refresh device status"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div
        className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
          onDevice
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-amber-200 bg-amber-50 text-amber-900'
        }`}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking device…
          </span>
        ) : onDevice ? (
          <span>
            On device as ID <span className="font-mono">{deviceUser?.userId || membershipNo}</span>.
            If scans do not mark attendance, ensure member <strong>membership number</strong> equals that ID exactly.
          </span>
        ) : (
          <span>Not on device yet — register below, then scan fingerprint on the ZKTeco.</span>
        )}
      </div>

      <ol className="mb-5 list-decimal space-y-2 pl-5 text-sm text-slate-600">
        <li>Click <strong>Register on device</strong> (creates user ID {membershipNo}).</li>
        <li>Click <strong>Start fingerprint enroll</strong> — device enters enroll mode.</li>
        <li>Scan the <strong>same finger 3 times</strong> on the scanner.</li>
        <li>Member scans daily — attendance appears within ~1 minute (realtime) or click Sync now.</li>
        <li>
          Device user ID and <strong>membership number</strong> must match exactly (e.g. both{' '}
          <span className="font-mono">{membershipNo}</span>).
        </li>
      </ol>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => runAction('register', 'Registered on device')}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
        >
          {busy === 'register' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Register on device
        </button>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => runAction('start-enroll', 'Enrollment started')}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy === 'start-enroll' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
          Start fingerprint enroll
        </button>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => runAction('sync-now', 'Sync complete')}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy === 'sync-now' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Sync attendance now
        </button>
      </div>
    </div>
  )
}
