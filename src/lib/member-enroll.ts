/** Match device user PIN / enroll ID to GymFlow membership_no. */

export interface MemberRow {
  id: string
  membership_no: string
  name: string
}

function addKey(set: Set<string>, value: string) {
  const trimmed = value.trim()
  if (!trimmed) return
  set.add(trimmed)
  set.add(trimmed.toLowerCase())
}

export function normalizeEnrollKey(value: string | number | null | undefined): string {
  const raw = String(value ?? '')
    .replace(/\0/g, '')
    .trim()
  if (!raw) return ''
  if (/^\d+$/.test(raw)) {
    return String(parseInt(raw, 10))
  }
  return raw
}

export function enrollLookupKeys(value: string | number | null | undefined): string[] {
  const raw = String(value ?? '')
    .replace(/\0/g, '')
    .trim()
  if (!raw) return []

  const keys = new Set<string>()
  addKey(keys, raw)

  const normalized = normalizeEnrollKey(raw)
  if (normalized) addKey(keys, normalized)

  if (/^\d+$/.test(raw)) {
    addKey(keys, raw.padStart(Math.max(raw.length, 4), '0'))
  }

  return [...keys]
}

export function buildMemberLookupMap(members: MemberRow[]): Map<string, MemberRow> {
  const map = new Map<string, MemberRow>()

  for (const member of members) {
    for (const key of enrollLookupKeys(member.membership_no)) {
      map.set(key, member)
      map.set(key.toLowerCase(), member)
    }
  }

  return map
}

export function resolveMemberForEnroll(
  map: Map<string, MemberRow>,
  enrollNumber: string | number | null | undefined
): MemberRow | undefined {
  for (const key of enrollLookupKeys(enrollNumber)) {
    const member = map.get(key) ?? map.get(key.toLowerCase())
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

export function isUnmatchedEnroll(
  unmatched: string[] | undefined,
  enrollNumber: string
): boolean {
  if (!unmatched?.length) return false
  const keys = new Set(enrollLookupKeys(enrollNumber).map((k) => k.toLowerCase()))
  return unmatched.some((u) => keys.has(normalizeEnrollKey(u).toLowerCase()))
}
