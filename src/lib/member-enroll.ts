/** Match device user PIN / enroll ID to GymFlow membership_no. */

export interface MemberRow {
  id: string
  membership_no: string
  name: string
}

export function normalizeEnrollKey(value: string | number | null | undefined): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  if (/^\d+$/.test(raw)) {
    return String(parseInt(raw, 10))
  }
  return raw
}

export function enrollLookupKeys(value: string | number | null | undefined): string[] {
  const raw = String(value ?? '').trim()
  if (!raw) return []

  const keys = new Set<string>([raw])
  const normalized = normalizeEnrollKey(raw)
  if (normalized) keys.add(normalized)

  if (/^\d+$/.test(raw)) {
    keys.add(raw.padStart(raw.length < 4 ? 4 : raw.length, '0'))
  }

  return [...keys]
}

export function buildMemberLookupMap(members: MemberRow[]): Map<string, MemberRow> {
  const map = new Map<string, MemberRow>()

  for (const member of members) {
    for (const key of enrollLookupKeys(member.membership_no)) {
      map.set(key, member)
    }
  }

  return map
}

export function resolveMemberForEnroll(
  map: Map<string, MemberRow>,
  enrollNumber: string | number | null | undefined
): MemberRow | undefined {
  for (const key of enrollLookupKeys(enrollNumber)) {
    const member = map.get(key)
    if (member) return member
  }
  return undefined
}

export function localDateFromTimestamp(
  isoTimestamp: string,
  timeZone = process.env.GYM_TIMEZONE || 'Asia/Karachi'
): string {
  const date = new Date(isoTimestamp)
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().split('T')[0]
  }

  return date.toLocaleDateString('en-CA', { timeZone })
}
