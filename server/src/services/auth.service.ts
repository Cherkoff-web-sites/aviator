import {
  AuthCodeType,
  CalendarDayStatus,
  Prisma,
  UserRole,
} from '@prisma/client'
import { addMonths, startOfDay, subMonths } from 'date-fns'
import { prisma } from '../lib/prisma.js'
import { generateCode, hashPassword, verifyPassword } from '../lib/auth-utils.js'
import { sendEmail } from '../lib/mailer.js'
import { signToken } from '../lib/jwt.js'
import { authCodeExpiresAt, isWeekend, toDateKey } from '../lib/dates.js'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@737.by'

export async function loginStep1(login: string, password: string, fingerprint: string) {
  const user = await prisma.user.findUnique({ where: { login } })
  if (!user || !user.isActive) throw new Error('INVALID_CREDENTIALS')
  const ok = await verifyPassword(password, user.passwordHash)
  if (!ok) throw new Error('INVALID_CREDENTIALS')

  const trusted = await prisma.trustedDevice.findUnique({
    where: { userId_fingerprint: { userId: user.id, fingerprint } },
  })

  if (user.role === 'ADMIN' || trusted) {
    if (trusted) {
      await prisma.trustedDevice.update({
        where: { id: trusted.id },
        data: { lastUsedAt: new Date() },
      })
    } else if (user.role !== 'ADMIN') {
      await prisma.trustedDevice.create({
        data: { userId: user.id, fingerprint },
      })
    }

    const token = signToken({ sub: user.id, role: user.role, login: user.login })
    return { status: 'OK' as const, token, user: sanitizeUser(user) }
  }

  const code = generateCode(5)
  await prisma.authCode.create({
    data: {
      userId: user.id,
      code,
      type: AuthCodeType.DEVICE_CHANGE,
      expiresAt: authCodeExpiresAt(10),
    },
  })

  await sendEmail(
    ADMIN_EMAIL,
    'Смена устройства — код подтверждения',
    `Сотрудник ${user.fullName} (${user.login}) входит с нового устройства.\nКод для сотрудника: ${code}`,
  )

  await prisma.trustedDevice.deleteMany({ where: { userId: user.id } })

  return { status: 'DEVICE_CHANGE' as const, userId: user.id }
}

export async function loginStep2(userId: string, code: string, fingerprint: string) {
  const authCode = await prisma.authCode.findFirst({
    where: {
      userId,
      code,
      type: { in: [AuthCodeType.LOGIN_2FA, AuthCodeType.DEVICE_CHANGE] },
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!authCode) throw new Error('INVALID_CODE')

  await prisma.authCode.update({ where: { id: authCode.id }, data: { usedAt: new Date() } })

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })

  await prisma.trustedDevice.upsert({
    where: { userId_fingerprint: { userId, fingerprint } },
    create: { userId, fingerprint },
    update: { lastUsedAt: new Date() },
  })

  const token = signToken({ sub: user.id, role: user.role, login: user.login })
  return { token, user: sanitizeUser(user) }
}

export async function createUser(data: {
  login: string
  password: string
  role: UserRole
  fullName: string
  phone?: string
  email?: string
  color?: string
  pilotSimulators?: string[]
}) {
  const passwordHash = await hashPassword(data.password)
  return prisma.user.create({
    data: {
      login: data.login,
      passwordHash,
      role: data.role,
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
      color: data.color,
      pilotSimulators: data.pilotSimulators ?? [],
    },
  })
}

export function sanitizeUser(user: {
  id: string
  login: string
  role: UserRole
  fullName: string
  phone: string | null
  email: string | null
  isActive: boolean
  color: string | null
  pilotSimulators: string[]
}) {
  return {
    id: user.id,
    login: user.login,
    role: user.role,
    fullName: user.fullName,
    phone: user.phone,
    email: user.email,
    isActive: user.isActive,
    color: user.color,
    pilotSimulators: user.pilotSimulators,
  }
}

export function calendarRangeForRole(role: UserRole, anchor = new Date()) {
  const today = startOfDay(anchor)
  if (role === 'PILOT') {
    return { from: today, to: addMonths(today, 2) }
  }
  return { from: subMonths(today, 4), to: addMonths(today, 12) }
}

export async function getCalendarDays(from: Date, to: Date) {
  const rows = await prisma.calendarDay.findMany({
    where: { date: { gte: from, lte: to } },
  })
  const map = new Map(rows.map((r) => [toDateKey(r.date), r.status]))

  const days: { date: string; status: CalendarDayStatus }[] = []
  let cursor = startOfDay(from)
  const end = startOfDay(to)
  while (cursor <= end) {
    const key = toDateKey(cursor)
    let status = map.get(key)
    if (!status) {
      status = isWeekend(cursor) ? CalendarDayStatus.HOLIDAY : CalendarDayStatus.OPEN
    }
    days.push({ date: key, status })
    cursor = new Date(cursor.getTime() + 86400000)
  }
  return days
}

export async function setCalendarDayStatus(
  date: string,
  status: CalendarDayStatus,
  setById: string,
) {
  const day = startOfDay(new Date(date))
  const row = await prisma.calendarDay.upsert({
    where: { date: day },
    create: { date: day, status, setById },
    update: { status, setById },
  })
  return row
}

export function bookingWhereForRole(
  role: UserRole,
  pilotSimulators: string[],
): Prisma.BookingWhereInput {
  if (role === 'PILOT') {
    return { simulatorSlug: { in: pilotSimulators } }
  }
  return {}
}
