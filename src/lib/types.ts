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
