/**
 * Type definitions for GymFlow
 * Use these types throughout the application
 */

// Member types
export interface Member {
  id: string
  membership_no: string
  name: string
  phone: string
  address?: string
  city: string
  photo_url?: string
  joining_date: string
  expiry_date?: string
  fee_amount: number
  status: 'Active' | 'Expired' | 'Inactive'
  exemption_month?: string
  created_at?: string
  updated_at?: string
}

export interface CreateMemberRequest {
  name: string
  phone: string
  address?: string
  city: string
  joining_date: string
  expiry_date?: string
  fee_amount: number
  photo_url?: string
}

// Attendance types
export interface Attendance {
  id: string
  member_id: string
  scan_time: string
  date: string
  created_at?: string
}

export interface MarkAttendanceRequest {
  member_id: string
  scan_time?: string
}

// Payment types
export interface Payment {
  id: string
  member_id: string
  amount: number
  payment_date: string
  month: string
  status: 'Paid' | 'Pending'
  created_at?: string
  updated_at?: string
}

export interface RecordPaymentRequest {
  member_id: string
  amount: number
  payment_date: string
  month: string
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  count?: number
}

export interface FingerprintScanRequest {
  fingerprint_template?: string
  member_id?: string
  device_id?: string
  timestamp?: string
}

export interface FingerprintScanResponse extends ApiResponse {
  member?: {
    id: string
    name: string
    membership_no: string
  }
}

// Dashboard types
export interface DashboardStats {
  total_members: number
  present_today: number
  pending_fees: number
  monthly_revenue: number
}

// Configuration types
export interface AppConfig {
  api_url: string
  app_name: string
  app_url: string
}

// Fingerprint Integration Types
export interface FingerprintDevice {
  id: string
  device_name: string
  device_model: string
  ip_address: string
  port: number
  device_number: number
  communication_key: number
  communication_password?: string
  status: 'Online' | 'Offline' | 'Error'
  last_sync?: string
  last_checked_at?: string
  last_response_time_ms?: number
  created_at?: string
  updated_at?: string
}

export interface AttendanceLog {
  id: string
  member_id?: string
  member_name?: string
  device_id: string
  event_type: 'checkin' | 'checkout'
  timestamp: string
  synced_at?: string
}

export interface SyncLog {
  id: string
  device_id: string
  sync_status: 'Success' | 'Failed' | 'Partial'
  records_synced: number
  error_message?: string
  created_at?: string
}

export interface DeviceHealthLog {
  id: string
  device_id: string
  status: 'Online' | 'Offline' | 'Error'
  response_time?: number
  created_at?: string
}

export interface FingerprintSyncPayload {
  device_id: string
  logs: Array<{
    enrollNumber: string
    timestamp: string
    event_type: 'checkin' | 'checkout'
  }>
}
