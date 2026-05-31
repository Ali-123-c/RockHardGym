/** Encode a 72-byte ZKTeco user record (inverse of decodeUserData72). */
export function encodeUserData72(params: {
  uid: number
  role?: number
  password?: string
  name: string
  cardno?: number
  userId: string
}) {
  const buf = Buffer.alloc(72, 0)
  buf.writeUInt16LE(params.uid, 0)
  buf.writeUInt8(params.role ?? 0, 2)
  Buffer.from((params.password ?? '').slice(0, 8), 'ascii').copy(buf, 3)
  Buffer.from(params.name.slice(0, 24), 'ascii').copy(buf, 11)
  buf.writeUInt32LE(params.cardno ?? 0, 35)
  Buffer.from(params.userId.slice(0, 9), 'ascii').copy(buf, 48)
  return buf
}
