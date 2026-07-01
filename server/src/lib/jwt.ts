import jwt from 'jsonwebtoken'
import type { UserRole } from '@prisma/client'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me'

export type JwtPayload = {
  sub: string
  role: UserRole
  login: string
}

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload
}
