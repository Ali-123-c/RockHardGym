'use client'

import type { FormEvent, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  CheckCircle2,
  Clock,
  Fingerprint,
  Loader2,
  Network,
  PlugZap,
  Save,
  Server,
  Settings,
  Timer,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react'

type DeviceStatus = 'Online' | 'Offline' | 'Error'

interface DeviceSettings {
  id?: string
  device_name: string
  device_model?: string
  ip_address: string
  port: number
  device_number: number
  communication_key: number
  status?: DeviceStatus
  last_checked_at?: string | null
  last_response_time_ms?: number | null
}

interface HealthLog {
  id: string
  status: DeviceStatus
  response_time: number | null
  created_at: string
}

interface ConnectionResult {
  status: 'Online' | 'Offline'
  pingReachable: boolean
  portReachable: boolean
  responseTime: number | null
  checkedAt: string
  error?: string
}

const defaultDevice: DeviceSettings = {
  device_name: 'ZKTeco K70',
  device_model: 'ZKTeco K70',
  ip_address: '192.168.100.16',
  port: 4370,
  device_number: 1,
  communication_key: 0,
  status: 'Offline',
}

function formatDate(value?: string | null) {
  if (!value) return 'Never'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value))
}

function StatusPill({ status }: { status?: DeviceStatus }) {
  const online = status === 'Online'

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${
        online
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-rose-200 bg-rose-50 text-rose-700'
      }`}
    >
      {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
      {status || 'Offline'}
    </span>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  )
}

export default function DeviceSettingsPage() {
  const [device, setDevice] = useState<DeviceSettings>(defaultDevice)
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [lastResult, setLastResult] = useState<ConnectionResult | null>(null)

  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/device-settings', { cache: 'no-store' })
      const payload = await response.json()

      if (!payload.success) throw new Error(payload.error || 'Unable to load device settings')

      setDevice({
        ...defaultDevice,
        ...payload.device,
        port: Number(payload.device.port ?? defaultDevice.port),
        device_number: Number(payload.device.device_number ?? defaultDevice.device_number),
        communication_key: Number(payload.device.communication_key ?? defaultDevice.communication_key),
      })
      setHealthLogs(payload.health_logs || [])
    } catch (error: any) {
      setNotice({ type: 'error', text: error.message || 'Unable to load device settings' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const healthSummary = useMemo(() => {
    const checkedAt = lastResult?.checkedAt || device.last_checked_at
    const responseTime = lastResult?.responseTime ?? device.last_response_time_ms ?? null
    const status = lastResult?.status || device.status || 'Offline'

    return { checkedAt, responseTime, status }
  }, [device.last_checked_at, device.last_response_time_ms, device.status, lastResult])

  const updateField = (field: keyof DeviceSettings, value: string) => {
    const numericFields = new Set<keyof DeviceSettings>(['port', 'device_number', 'communication_key'])
    setDevice((current) => ({
      ...current,
      [field]: numericFields.has(field) ? Number(value) : value,
    }))
  }

  const saveSettings = async (event?: FormEvent) => {
    event?.preventDefault()
    setSaving(true)
    setNotice(null)

    try {
      const response = await fetch('/api/device-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(device),
      })
      const payload = await response.json()

      if (!payload.success) throw new Error(payload.error || 'Unable to save device settings')

      setDevice((current) => ({ ...current, ...payload.device }))
      setNotice({ type: 'success', text: 'Device settings saved.' })
    } catch (error: any) {
      setNotice({ type: 'error', text: error.message || 'Unable to save device settings' })
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    setTesting(true)
    setNotice(null)

    try {
      let savedDevice = device

      if (!device.id) {
        const response = await fetch('/api/device-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(device),
        })
        const payload = await response.json()
        if (!payload.success) throw new Error(payload.error || 'Unable to save device before testing')
        savedDevice = payload.device
        setDevice(savedDevice)
      }

      const response = await fetch('/api/device-settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedDevice),
      })
      const payload = await response.json()

      if (!payload.success) throw new Error(payload.error || 'Connection test failed')

      setLastResult(payload.result)
      setDevice((current) => ({
        ...current,
        status: payload.result.status,
        last_checked_at: payload.result.checkedAt,
        last_response_time_ms: payload.result.responseTime,
      }))
      setNotice({
        type: payload.result.status === 'Online' ? 'success' : 'error',
        text: payload.message,
      })
      await loadSettings()
    } catch (error: any) {
      setNotice({ type: 'error', text: error.message || 'Connection test failed' })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <section className="border-b border-slate-200 bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
              <Fingerprint className="h-4 w-4" />
              ZKTeco K70
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Device Settings</h1>
            <p className="mt-2 max-w-2xl text-slate-500">
              Configure the fingerprint device, test LAN connectivity, and monitor recent health checks.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill status={healthSummary.status as DeviceStatus} />
            <button
              type="button"
              onClick={testConnection}
              disabled={testing || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
              Test Connection
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.8fr)] lg:px-8">
        <form onSubmit={saveSettings} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-slate-950">
                <Settings className="h-5 w-5 text-indigo-600" />
                Connection Configuration
              </h2>
              <p className="mt-1 text-sm text-slate-500">Default values are prefilled for the K70 on your network.</p>
            </div>
            <button
              type="submit"
              disabled={saving || testing}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>
          </div>

          {notice && (
            <div
              className={`mb-5 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium ${
                notice.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              {notice.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {notice.text}
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Device Name">
              <input
                value={device.device_name}
                onChange={(event) => updateField('device_name', event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                placeholder="ZKTeco K70"
              />
            </Field>
            <Field label="Device IP">
              <input
                value={device.ip_address}
                onChange={(event) => updateField('ip_address', event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-900 transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                placeholder="192.168.100.16"
              />
            </Field>
            <Field label="Device Port">
              <input
                type="number"
                min={1}
                max={65535}
                value={device.port}
                onChange={(event) => updateField('port', event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
              />
            </Field>
            <Field label="Device ID">
              <input
                type="number"
                min={0}
                value={device.device_number}
                onChange={(event) => updateField('device_number', event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
              />
            </Field>
            <Field label="Communication Key">
              <input
                type="number"
                min={0}
                value={device.communication_key}
                onChange={(event) => updateField('communication_key', event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
              />
            </Field>
          </div>
        </form>

        <aside className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-950">
              <Activity className="h-5 w-5 text-indigo-600" />
              Device Health
            </h2>
            <div className="mt-5 grid gap-4">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <Server className="h-4 w-4" />
                  Status
                </span>
                <StatusPill status={healthSummary.status as DeviceStatus} />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <Timer className="h-4 w-4" />
                  Response Time
                </span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  {healthSummary.responseTime === null ? 'N/A' : `${healthSummary.responseTime} ms`}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 p-4">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <Clock className="h-4 w-4" />
                  Last Checked
                </span>
                <span className="text-right text-sm font-semibold text-slate-900">{formatDate(healthSummary.checkedAt)}</span>
              </div>
            </div>

            {lastResult && (
              <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold text-slate-600">
                    <Network className="h-4 w-4" />
                    Ping
                  </span>
                  <span className={lastResult.pingReachable ? 'font-bold text-emerald-600' : 'font-bold text-rose-600'}>
                    {lastResult.pingReachable ? 'Reachable' : 'Unreachable'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold text-slate-600">
                    <PlugZap className="h-4 w-4" />
                    Port {device.port}
                  </span>
                  <span className={lastResult.portReachable ? 'font-bold text-emerald-600' : 'font-bold text-rose-600'}>
                    {lastResult.portReachable ? 'Open' : 'Closed'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-lg font-bold text-slate-950">Recent Health Logs</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {healthLogs.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">No health checks recorded yet.</p>
              ) : (
                healthLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{log.status}</p>
                      <p className="text-xs text-slate-500">{formatDate(log.created_at)}</p>
                    </div>
                    <span className="font-mono text-sm font-semibold text-slate-700">
                      {log.response_time === null ? 'N/A' : `${log.response_time} ms`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </section>
    </main>
  )
}
