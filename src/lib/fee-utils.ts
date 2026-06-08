/**
 * Shared utility for fee status calculation.
 * 
 * Determines whether a member's fee is "paid", "pending", or "upcoming" for the current month.
 * 
 * Logic:
 * - A member's fee is "due" on the same day-of-month as their joining_date.
 * - If today is past that day and they haven't paid for the current month → "pending"
 * - If they have paid → "paid"
 * - If today is before their due day → "upcoming" (not yet due)
 * - If they joined this month and their joining day is today or later → "upcoming"
 */

export type FeeStatus = 'paid' | 'pending' | 'upcoming'

export interface GetFeeStatusInput {
  joiningDate: string
  memberId: string
  paidMemberIds: Set<string>
  /** Optional reference date (defaults to now) — useful for testing */
  now?: Date
}

export function getFeeStatus({
  joiningDate,
  memberId,
  paidMemberIds,
  now: referenceDate,
}: GetFeeStatusInput): FeeStatus {
  // If member has paid, return paid immediately
  if (paidMemberIds.has(memberId)) return 'paid'

  const now = referenceDate || new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const joinDate = new Date(joiningDate)
  const joinMonth = `${joinDate.getFullYear()}-${String(joinDate.getMonth() + 1).padStart(2, '0')}`

  // If the member joined AFTER the current month (future join), not applicable
  if (joinMonth > currentMonth) return 'upcoming'

  // Same month join — check if today is past their joining day
  if (joinMonth === currentMonth) {
    const joinDay = joinDate.getDate()
    if (now.getDate() >= joinDay) {
      return 'pending'
    }
    return 'upcoming'
  }

  // Joined in a previous month — fee is due on the same day each month
  const dueDay = joinDate.getDate()
  const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  // Clamp due day to days in current month (e.g. 31 in February → 28/29)
  const effectiveDueDay = Math.min(dueDay, daysInCurrentMonth)

  if (now.getDate() >= effectiveDueDay) {
    return 'pending'
  }

  return 'upcoming'
}
