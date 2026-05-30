'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { 
  Fingerprint, Signal, SignalZero, SignalHigh, 
  RefreshCw, Activity, Clock, ShieldCheck,
  Server, HardDrive, Wifi, WifiOff, AlertCircle, Users
} from 'lucide-react'

const formatDate = (date: Date, pattern: 'hh:mm a' | 'MMM d, yyyy HH:mm:ss' | 'HH:mm:ss') => {
  if (pattern === 'hh:mm a') {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date)
  }

  if (pattern === 'HH:mm:ss') {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date)
  }

  const monthDayYear = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
  const time = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)

  return `${monthDayYear} ${time}`
}

export default function FingerprintDashboard() {
  const [supabase] = useState(() => createClient())
  const [devices, setDevices] = useState<any[]>([])
  const [syncLogs, setSyncLogs] = useState<any[]>([])
  const [attendanceToday, setAttendanceToday] = useState(0)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      // Fetch devices
      const { data: dData } = await supabase.from('fingerprint_devices').select('*').order('created_at', { ascending: false })
      if (dData) setDevices(dData)

      // Fetch logs
      const { data: lData } = await supabase.from('sync_logs').select('*').order('created_at', { ascending: false }).limit(5)
      if (lData) setSyncLogs(lData)

      // Fetch today's attendance
      const today = new Date().toISOString().split('T')[0]
      const { count } = await supabase
        .from('attendance_logs')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', `${today}T00:00:00.000Z`)
      
      setAttendanceToday(count || 0)
    } catch (err) {
      console.error('Error fetching data', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
    // Setup realtime subscription for logs
    const channel = supabase
      .channel('fingerprint_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_logs' }, () => {
        fetchData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sync_logs' }, () => {
        fetchData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fingerprint_devices' }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData, supabase])

  const handleManualSync = async () => {
    setSyncing(true)
    // In a real scenario, this would trigger the Bridge service or API.
    // For now, we simulate the action feedback.
    setTimeout(() => {
      setSyncing(false)
      fetchData()
    }, 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Header section */}
      <div className="bg-white border-b border-slate-200 pt-8 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-xl">
                <Fingerprint className="w-8 h-8 text-indigo-600" />
              </div>
              Device Management
            </h1>
            <p className="mt-2 text-slate-500 max-w-2xl text-lg">
              Monitor and manage biometric attendance devices connected to the network.
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleManualSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border-2 border-indigo-100 text-indigo-600 font-semibold hover:bg-indigo-50 hover:border-indigo-200 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Manual Sync'}
            </button>
            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95">
              <Server className="w-5 h-5" />
              Add Device
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center gap-5 hover:shadow-md transition-shadow">
            <div className="p-4 bg-emerald-100 rounded-2xl">
              <SignalHigh className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Active Devices</p>
              <p className="text-3xl font-bold text-slate-900">{devices.filter(d => d.status === 'Online').length} <span className="text-lg text-slate-400 font-medium">/ {devices.length}</span></p>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center gap-5 hover:shadow-md transition-shadow">
            <div className="p-4 bg-blue-100 rounded-2xl">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Today&apos;s Check-ins</p>
              <p className="text-3xl font-bold text-slate-900">{attendanceToday}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center gap-5 hover:shadow-md transition-shadow">
            <div className="p-4 bg-purple-100 rounded-2xl">
              <Activity className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Last Network Sync</p>
              <p className="text-xl font-bold text-slate-900">
                {devices[0]?.last_sync ? formatDate(new Date(devices[0].last_sync), 'hh:mm a') : 'Never'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Devices */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-slate-400" />
              Connected Hardware
            </h2>
            
            {devices.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">No devices configured</h3>
                <p className="text-slate-500 mt-1">Add a ZKTeco K70 to start recording biometric attendance.</p>
              </div>
            ) : (
              devices.map(device => (
                <div key={device.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${device.status === 'Online' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-bold text-slate-900">{device.device_name}</h3>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          device.status === 'Online' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {device.status === 'Online' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                          {device.status}
                        </span>
                      </div>
                      <p className="text-slate-500 text-sm flex items-center gap-2">
                        <span>{device.device_model}</span>
                        <span>•</span>
                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{device.ip_address}:{device.port}</span>
                      </p>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <button className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition-colors">
                        Configure
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Last Sync</p>
                      <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {device.last_sync ? formatDate(new Date(device.last_sync), 'MMM d, yyyy HH:mm:ss') : 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Sync Schedule</p>
                      <p className="text-sm font-semibold text-slate-700">Every 5 minutes</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sidebar - Sync Logs */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-400" />
              Recent Sync Activity
            </h2>
            
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              {syncLogs.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-slate-500">No sync logs available.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {syncLogs.map((log) => (
                    <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${
                          log.sync_status === 'Success' ? 'bg-emerald-100 text-emerald-800' : 
                          log.sync_status === 'Partial' ? 'bg-amber-100 text-amber-800' : 
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {log.sync_status}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {formatDate(new Date(log.created_at), 'HH:mm:ss')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">
                        <span className="font-semibold text-slate-900">{log.records_synced}</span> records synced
                      </p>
                      {log.error_message && (
                        <p className="text-xs text-rose-600 mt-1 flex items-start gap-1">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          {log.error_message}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View All Logs</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
