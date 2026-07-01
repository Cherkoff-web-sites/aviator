import bcrypt from 'bcryptjs'

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export function generateCode(length = 5) {
  const max = 10 ** length
  return String(Math.floor(Math.random() * max)).padStart(length, '0')
}
