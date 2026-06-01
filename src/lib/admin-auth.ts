import type { User } from '@supabase/supabase-js'

const ADMIN_ROLES = new Set(['admin', 'super_admin'])

export function getConfiguredAdminEmails() {
  return (process.env.SUPER_ADMIN_EMAILS || process.env.SUPER_ADMIN_EMAIL || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminUser(user: Pick<User, 'email' | 'app_metadata'> | null) {
  if (!user) return false

  const role = typeof user.app_metadata?.role === 'string'
    ? user.app_metadata.role.toLowerCase()
    : ''

  if (ADMIN_ROLES.has(role)) return true

  const email = user.email?.toLowerCase()
  return Boolean(email && getConfiguredAdminEmails().includes(email))
}
