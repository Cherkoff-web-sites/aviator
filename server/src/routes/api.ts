import { Router, type Request, type Response, type NextFunction } from 'express'
import { addDays, format, startOfDay } from 'date-fns'
import { readStore, updateStore, newId, resetStoreToDemo } from '../lib/store.js'
import {
  addMinutesToTime,
  buildCalendarDays,
  calendarRangeForRole,
  filterBookingsForRole,
  generateCode,
  getDayStatus,
  toDateKey,
} from '../lib/helpers.js'
import { emitAdmin } from '../lib/socket.js'
import {
  pushNotification,
  notificationsForUser,
  isNotificationVisible,
  notifHref,
  ROLES_STAFF,
} from '../lib/notifications.js'
import {
  formatMaintenanceLabel,
  isDateFullyClosed,
  isSlotBlockedByMaintenance,
  listMaintenance,
  normalizeMaintenance,
} from '../lib/maintenance.js'
import {
  ARCHIVE_SECTION_META,
  canViewArchiveSection,
  clearArchiveEntity,
  listArchiveForRole,
  pushArchive,
  purgeExpiredArchive,
  type ArchiveSectionKey,
} from '../lib/archive.js'
import type {
  Booking,
  CalendarDayStatus,
  Certificate,
  CertificateDesignColor,
  MaintenanceEntry,
  StaffShift,
  User,
  UserRole,
  WaitingEntry,
  WorkHourEntry,
  PriceRow,
  Promo,
} from '../types.js'

const DESIGN_BY_SIM: Record<string, CertificateDesignColor[]> = {
  'boeing-737': ['silver', 'turquoise', 'gold', 'navy'],
  'mi-2': ['coral', 'emerald'],
  combo: ['lilac'],
}

function defaultDesignColor(simulatorSlug: string, preferred?: string): CertificateDesignColor {
  const allowed = DESIGN_BY_SIM[simulatorSlug] ?? DESIGN_BY_SIM['boeing-737']
  if (preferred && (allowed as string[]).includes(preferred)) {
    return preferred as CertificateDesignColor
  }
  return allowed[0]
}

function expireCertificatesInStore(s: { certificates: Certificate[] }) {
  const today = format(startOfDay(new Date()), 'yyyy-MM-dd')
  for (const c of s.certificates) {
    c.paymentStatus = 'PAID'
    if (!c.designColor) c.designColor = defaultDesignColor(c.simulatorSlug)
    if (
      (c.status === 'ACTIVE' || c.status === 'PARTIAL') &&
      c.validTo < today
    ) {
      c.status = 'EXPIRED'
    }
  }
}

export type SessionUser = {
  role: UserRole
  userId: string
}

declare global {
  namespace Express {
    interface Request {
      session?: SessionUser
    }
  }
}

function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
  const role = req.headers['x-role'] as UserRole | undefined
  const userId = req.headers['x-user-id'] as string | undefined
  if (!role || !userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const store = readStore()
  const user = store.users.find((u) => u.id === userId && u.role === role)
  if (!user || !user.isActive) {
    res.status(401).json({ error: user && !user.isActive ? 'ACCOUNT_INACTIVE' : 'Unauthorized' })
    return
  }
  req.session = { role, userId }
  next()
}

function requireRoles(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session || !roles.includes(req.session.role)) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  }
}

function hideFromPilots(req: Request, res: Response, next: NextFunction) {
  if (req.session?.role === 'PILOT') {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  next()
}

function broadcast() {
  emitAdmin('store:updated', { at: new Date().toISOString() })
}

function archiveActor(req: Request) {
  const store = readStore()
  const u = store.users.find((x) => x.id === req.session?.userId)
  return { deletedByUserId: u?.id, deletedByName: u?.fullName }
}

function parseArchiveSection(
  raw: unknown,
  fallback: ArchiveSectionKey,
): ArchiveSectionKey {
  const v = String(raw ?? '')
  if (v && v in ARCHIVE_SECTION_META) return v as ArchiveSectionKey
  return fallback
}

export const apiRouter = Router()

// --- Public ---
apiRouter.get('/health', (_req, res) => res.json({ ok: true }))

apiRouter.get('/public/calendar', (_req, res) => {
  const store = readStore()
  const from = startOfDay(new Date())
  const months = store.settings.bookingWindowMonths ?? 12
  const to = addMonthsSafe(from, months)
  const fromKey = toDateKey(from)
  const toKey = toDateKey(to)
  const days = buildCalendarDays(store, from, to).map((d) => ({
    ...d,
    /** Выходной / скидочный день (бронь доступна) */
    discountDay: d.status === 'HOLIDAY',
    /** День полностью закрыт на сайте (ТО на все тренажёры или BLOCKED) */
    fullyClosed: isDateFullyClosed(store, d.date),
  }))
  const maintenance = listMaintenance(store).filter((m) => m.date >= fromKey && m.date <= toKey)
  res.json({ days, maintenance, bookingWindowMonths: months })
})

apiRouter.get('/public/settings', (_req, res) => {
  const store = readStore()
  res.json({ bookingWindowMonths: store.settings.bookingWindowMonths ?? 12 })
})

apiRouter.get('/public/certificates/validate', (req, res) => {
  const number = String(req.query.number ?? '').trim()
  if (!number) return res.status(400).json({ valid: false })
  const store = readStore()
  const cert = store.certificates.find((c) => c.number === number)
  if (!cert || cert.status !== 'ACTIVE') return res.json({ valid: false })
  const today = format(startOfDay(new Date()), 'yyyy-MM-dd')
  if (cert.validFrom > today || cert.validTo < today) {
    return res.json({ valid: false, reason: 'EXPIRED' })
  }
  res.json({
    valid: true,
    simulatorSlug: cert.simulatorSlug,
    durationMin: cert.durationMin,
    number: cert.number,
    validFrom: cert.validFrom,
    validTo: cert.validTo,
  })
})

apiRouter.get('/public/prices/flights', (_req, res) => {
  res.json(readStore().flightPrices)
})

apiRouter.get('/public/prices/certificates', (_req, res) => {
  res.json(readStore().certPrices)
})

apiRouter.get('/public/promos', (_req, res) => {
  res.json(readStore().promos.filter((p) => p.active))
})

apiRouter.get('/public/contacts', (_req, res) => {
  res.json(readStore().contacts)
})

apiRouter.post('/public/feedback', async (req, res) => {
  const name = String(req.body?.name ?? '').trim()
  const phone = String(req.body?.phone ?? '').trim()
  const message = String(req.body?.message ?? '').trim().slice(0, 500)
  const digits = phone.replace(/\D/g, '')
  if (name.length < 2 || digits.length < 9 || digits.length > 15) {
    res.status(400).json({ error: 'Укажите корректные имя и телефон' })
    return
  }
  const entry = {
    id: newId(),
    name,
    phone,
    message,
    createdAt: new Date().toISOString(),
  }
  await updateStore((s) => {
    if (!Array.isArray(s.feedbackRequests)) s.feedbackRequests = []
    s.feedbackRequests.unshift(entry)
    pushNotification(s, {
      kind: 'feedback',
      title: 'Новая заявка обратной связи',
      body: `${name}, ${phone}${message ? ` — ${message.slice(0, 80)}` : ''}`,
      href: notifHref('/admin', entry.id),
      audienceRoles: ROLES_STAFF,
      meta: { feedbackId: entry.id },
    })
  })
  emitAdmin('feedback:created', entry)
  broadcast()
  res.status(201).json({ ok: true, id: entry.id })
})

apiRouter.post('/public/bookings', async (req, res) => {
  const body = req.body
  if (body.simulatorSlug === 'mi-2' && Number(body.durationMin) > 60) {
    res.status(400).json({ error: 'Для Ми-2 максимальная длительность — 60 минут' })
    return
  }
  const holdExpiresAt = new Date(Date.now() + 30 * 60_000).toISOString()
  const code = generateCode(6)
  const endTime = addMinutesToTime(body.startTime, body.durationMin)
  const notes: string[] = []
  if (body.isBirthdayPromo) notes.push('ДР-15%')
  if (body.isHappyHoursPromo) notes.push('Счастливые часы -10%')
  if (body.certificateNumber) {
    notes.push(`EB-${String(body.simulatorSlug).toUpperCase()}-${body.certificateNumber}`)
  }
  const promoNote = notes.length ? notes.join(', ') : undefined

  let comment = String(body.comment ?? '')
  if (body.isHappyHoursPromo && !comment.includes('«Счастливые часы»')) {
    comment = comment.trim()
      ? `«Счастливые часы». ${comment.trim()}`
      : '«Счастливые часы»'
  }

  const booking: Booking = {
    id: newId(),
    date: body.date,
    startTime: body.startTime,
    endTime,
    durationMin: body.durationMin,
    simulatorSlug: body.simulatorSlug,
    name: body.name,
    phone: body.phone,
    email: body.email,
    status: 'PENDING_CONFIRMATION',
    paid: false,
    paymentMethod: body.paymentMethod ?? 'OFFLINE',
    comment,
    isBirthdayPromo: !!body.isBirthdayPromo,
    birthdayDate: body.birthdayDate,
    certificateNumber: body.certificateNumber,
    promoNote,
    holdExpiresAt,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const storeCheck = readStore()
  if (
    isSlotBlockedByMaintenance(
      storeCheck,
      booking.date,
      booking.startTime,
      booking.durationMin,
      booking.simulatorSlug,
    )
  ) {
    res.status(400).json({ error: 'Выбранные дата/время недоступны (ТО или закрытый день)' })
    return
  }

  await updateStore((s) => {
    s.bookings.push(booking)
    s.pendingCodes.push({
      bookingId: booking.id,
      code,
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      sentAt: new Date().toISOString(),
    })
    const simLabel = booking.simulatorSlug === 'mi-2' ? 'Ми-2' : 'Boeing 737'
    pushNotification(s, {
      kind: 'booking',
      title: 'Новая бронь с сайта',
      body: `${booking.name} · ${booking.date} ${booking.startTime} · ${simLabel} · ${booking.durationMin} мин`,
      href: notifHref('/admin', booking.id, { date: booking.date }),
      audienceRoles: ROLES_STAFF,
      meta: { bookingId: booking.id, date: booking.date },
    })
  })

  console.log(`[BOOKING CODE] ${body.email}: ${code}`)
  broadcast()
  res.status(201).json({ bookingId: booking.id, holdExpiresAt })
})

apiRouter.post('/public/bookings/:id/confirm', async (req, res) => {
  const id = String(req.params.id)
  const code = String(req.body.code ?? '')
  const store = readStore()
  const booking = store.bookings.find((b) => b.id === id)
  if (!booking) return res.status(404).json({ error: 'NOT_FOUND' })
  const match = store.pendingCodes.find(
    (c) => c.bookingId === id && c.code === code,
  )
  if (!match) return res.status(400).json({ error: 'INVALID_CODE' })

  await updateStore((s) => {
    const b = s.bookings.find((x) => x.id === id)
    if (b) {
      b.status = 'CONFIRMED'
      b.holdExpiresAt = undefined
      b.updatedAt = new Date().toISOString()
      pushNotification(s, {
        kind: 'booking',
        title: 'Бронь подтверждена',
        body: `${b.name} · ${b.date} ${b.startTime}`,
        href: notifHref('/admin', b.id, { date: b.date }),
        audienceRoles: ROLES_STAFF,
        meta: { bookingId: b.id, date: b.date },
      })
    }
    s.pendingCodes = s.pendingCodes.filter((c) => c.bookingId !== id)
  })
  broadcast()
  res.json(readStore().bookings.find((b) => b.id === id))
})

apiRouter.post('/public/bookings/:id/resend-code', async (req, res) => {
  const id = String(req.params.id)
  const store = readStore()
  const last = [...store.pendingCodes].reverse().find((c) => c.bookingId === id)
  if (last && Date.now() - new Date(last.sentAt).getTime() < 60_000) {
    return res.status(429).json({ error: 'RESEND_TOO_SOON' })
  }
  const booking = store.bookings.find((b) => b.id === id)
  if (!booking) return res.status(404).json({ error: 'NOT_FOUND' })
  const code = generateCode(6)
  await updateStore((s) => {
    s.pendingCodes.push({
      bookingId: id,
      code,
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      sentAt: new Date().toISOString(),
    })
  })
  console.log(`[BOOKING CODE] ${booking.email}: ${code}`)
  res.json({ ok: true })
})

apiRouter.post('/public/certificates', async (req, res) => {
  const body = req.body
  const store = readStore()
  const number = `№${store.counters.certificate}`
  const today = format(startOfDay(new Date()), 'yyyy-MM-dd')
  const validTo = format(addDays(new Date(), 90), 'yyyy-MM-dd')

  const cert: Certificate = {
    id: newId(),
    number,
    phone: body.phone,
    fullName: `${body.firstName} ${body.lastName}`.trim(),
    durationMin: body.durationMin,
    paymentStatus: 'PAID',
    paymentMethod: body.paymentMethod === 'OFFLINE' ? 'OFFLINE' : 'ONLINE',
    validFrom: today,
    validTo,
    simulatorSlug: body.simulatorSlug,
    status: 'ACTIVE',
    designColor: defaultDesignColor(String(body.simulatorSlug ?? 'boeing-737')),
    comment: body.comment ?? '',
    createdAt: new Date().toISOString(),
  }

  await updateStore((s) => {
    s.certificates.unshift(cert)
    s.counters.certificate += 1
    pushNotification(s, {
      kind: 'certificate',
      title: 'Продан сертификат',
      body: `${cert.number} · ${cert.fullName} · ${cert.durationMin} мин · на сайте`,
      href: notifHref('/admin/certificates', cert.id),
      audienceRoles: ROLES_STAFF,
      meta: { certificateId: cert.id },
    })
  })
  broadcast()
  console.log(`[CERTIFICATE] ${cert.number} for ${cert.fullName}`)
  res.status(201).json(cert)
})

// --- Session info ---
apiRouter.get('/auth/me', sessionMiddleware, (req, res) => {
  const user = readStore().users.find((u) => u.id === req.session!.userId)!
  res.json(user)
})

// --- Admin (authenticated) ---
apiRouter.use('/admin', sessionMiddleware)

apiRouter.get('/admin/bookings', (req, res) => {
  const date = req.query.date ? String(req.query.date) : toDateKey(new Date())
  const store = readStore()
  res.json(filterBookingsForRole(store, req.session!.role, req.session!.userId, date))
})

apiRouter.post('/admin/bookings', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
  const body = req.body
  if (body.simulatorSlug === 'mi-2' && Number(body.durationMin) > 60) {
    res.status(400).json({ error: 'Для Ми-2 максимальная длительность — 60 минут' })
    return
  }
  const booking: Booking = {
    id: body.id ? String(body.id) : newId(),
    date: body.date,
    startTime: body.startTime,
    endTime: body.endTime ?? addMinutesToTime(body.startTime, body.durationMin),
    durationMin: body.durationMin,
    simulatorSlug: body.simulatorSlug,
    name: body.name,
    phone: body.phone,
    email: body.email ?? '',
    status: body.status ?? 'CONFIRMED',
    paid: !!body.paid,
    paymentMethod: body.paymentMethod ?? 'OFFLINE',
    comment: body.comment ?? '',
    isBirthdayPromo: !!body.isBirthdayPromo,
    birthdayDate: body.birthdayDate,
    certificateNumber: body.certificateNumber,
    promoNote: body.promoNote,
    holdExpiresAt: body.holdExpiresAt,
    createdAt: body.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  await updateStore((s) => {
    if (body.id) {
      s.bookings = s.bookings.filter((b) => b.id !== booking.id)
      clearArchiveEntity(s, 'bookings', booking.id)
    }
    s.bookings.push(booking)
    if (!body.id) {
      const simLabel = booking.simulatorSlug === 'mi-2' ? 'Ми-2' : 'Boeing 737'
      pushNotification(s, {
        kind: 'booking',
        title: 'Новая запись в админке',
        body: `${booking.name} · ${booking.date} ${booking.startTime} · ${simLabel}`,
        href: notifHref('/admin', booking.id, { date: booking.date }),
        audienceRoles: ROLES_STAFF,
        meta: { bookingId: booking.id, date: booking.date },
      })
    }
  })
  broadcast()
  res.status(201).json(booking)
})

apiRouter.patch('/admin/bookings/:id', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
  const id = String(req.params.id)
  const body = req.body
  let updated: Booking | undefined
  let rejected = false
  await updateStore((s) => {
    const b = s.bookings.find((x) => x.id === id)
    if (!b) return
    const nextSlug = body.simulatorSlug ?? b.simulatorSlug
    const nextDur = body.durationMin ?? b.durationMin
    if (nextSlug === 'mi-2' && Number(nextDur) > 60) {
      rejected = true
      return
    }
    Object.assign(b, body, { updatedAt: new Date().toISOString() })
    updated = b
  })
  if (rejected) {
    res.status(400).json({ error: 'Для Ми-2 максимальная длительность — 60 минут' })
    return
  }
  broadcast()
  res.json(updated)
})

apiRouter.delete('/admin/bookings/:id', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
  const id = String(req.params.id)
  const actor = archiveActor(req)
  let archived
  await updateStore((s) => {
    const prev = s.bookings.find((b) => b.id === id)
    if (!prev) return
    const sim = prev.simulatorSlug === 'mi-2' ? 'Ми-2' : 'Boeing 737'
    archived = pushArchive(s, {
      section: 'bookings',
      entityId: prev.id,
      title: prev.name,
      summary: `${prev.date} ${prev.startTime}–${prev.endTime} · ${sim} · ${prev.phone}`,
      payload: prev,
      ...actor,
    })
    s.bookings = s.bookings.filter((b) => b.id !== id)
  })
  broadcast()
  res.json({ ok: true, archived })
})

apiRouter.get('/admin/calendar', (req, res) => {
  const { from, to } = calendarRangeForRole(req.session!.role)
  const store = readStore()
  res.json({
    days: buildCalendarDays(store, from, to),
    range: { from: toDateKey(from), to: toDateKey(to) },
  })
})

const CALENDAR_STATUS_LABEL: Record<CalendarDayStatus, string> = {
  OPEN: 'открыт',
  HOLIDAY: 'выходной',
  BLOCKED: 'заблокирован',
}

apiRouter.put('/admin/calendar/:date', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
  const date = String(req.params.date)
  const status = req.body.status as CalendarDayStatus
  await updateStore((s) => {
    s.calendar[date] = status
    pushNotification(s, {
      kind: 'calendar',
      title: 'Изменён статус дня',
      body: `${date} → ${CALENDAR_STATUS_LABEL[status] ?? status}`,
      href: '/admin/schedule-settings',
      audienceRoles: ROLES_STAFF,
      meta: { date, status },
    })
  })
  broadcast()
  res.json({ date, status })
})

apiRouter.post('/admin/calendar/toggle-holidays', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
  const { dates } = req.body as { dates: string[] }
  await updateStore((s) => {
    for (const d of dates) {
      const cur = getDayStatus(s, d)
      s.calendar[d] = cur === 'HOLIDAY' ? 'OPEN' : 'HOLIDAY'
    }
    const sample = dates.slice(0, 3).join(', ')
    const more = dates.length > 3 ? ` и ещё ${dates.length - 3}` : ''
    pushNotification(s, {
      kind: 'calendar',
      title: 'Обновлены выходные в календаре',
      body: dates.length ? `${sample}${more}` : 'Без дат',
      href: '/admin/schedule-settings',
      audienceRoles: ROLES_STAFF,
      meta: { count: String(dates.length) },
    })
  })
  broadcast()
  res.json({ ok: true })
})

apiRouter.post('/admin/calendar/toggle-blocked', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
  const { dates } = req.body as { dates: string[] }
  await updateStore((s) => {
    for (const d of dates) {
      const cur = getDayStatus(s, d)
      s.calendar[d] = cur === 'BLOCKED' ? 'OPEN' : 'BLOCKED'
    }
    const sample = dates.slice(0, 3).join(', ')
    const more = dates.length > 3 ? ` и ещё ${dates.length - 3}` : ''
    pushNotification(s, {
      kind: 'calendar',
      title: 'Обновлены блокировки дней',
      body: dates.length ? `${sample}${more}` : 'Без дат',
      href: '/admin/schedule-settings',
      audienceRoles: ROLES_STAFF,
      meta: { count: String(dates.length) },
    })
  })
  broadcast()
  res.json({ ok: true })
})

apiRouter.get('/admin/staff-shifts', (req, res) => {
  const month = String(req.query.month ?? '')
  const store = readStore()
  const rows = store.staffShifts.filter((sh) => sh.date.startsWith(month))
  res.json(
    rows.map((sh) => ({
      ...sh,
      user: store.users.find((u) => u.id === sh.userId),
    })),
  )
})

apiRouter.post('/admin/staff-shifts', async (req, res) => {
  const isPilot = req.session!.role === 'PILOT'
  const store = readStore()
  const userId = isPilot ? req.session!.userId : String(req.body.userId ?? '')
  const user = store.users.find((u) => u.id === userId)
  if (!user) return res.status(400).json({ error: 'USER_REQUIRED' })
  if (isPilot && !user.pilotSimulators.includes(req.body.simulatorSlug)) {
    return res.status(403).json({ error: 'SIMULATOR_FORBIDDEN' })
  }
  const restoreId = typeof req.body.id === 'string' ? req.body.id : ''
  const shift = {
    id: restoreId || newId(),
    date: req.body.date,
    userId,
    simulatorSlug: req.body.simulatorSlug,
    createdAt: req.body.createdAt ?? new Date().toISOString(),
  }
  const simLabel = shift.simulatorSlug === 'mi-2' ? 'Ми-2' : 'Boeing 737'
  const actorId = req.session!.userId
  await updateStore((s) => {
    if (restoreId) {
      s.staffShifts = s.staffShifts.filter((x) => x.id !== shift.id)
      clearArchiveEntity(s, 'staff_shifts', shift.id)
    }
    s.staffShifts.push(shift)
    // Пилоту — только если смену назначил кто-то другой
    if (!restoreId && userId !== actorId) {
      pushNotification(s, {
        kind: 'staff_shift',
        title: 'Вам назначена смена',
        body: `${shift.date} · ${simLabel}`,
        href: notifHref('/admin/staff-schedule', shift.id, { date: shift.date }),
        audienceRoles: ['PILOT'],
        targetUserId: userId,
        meta: { shiftId: shift.id, date: shift.date },
      })
    }
    if (!restoreId && user) {
      pushNotification(s, {
        kind: 'staff_shift',
        title: 'Обновление графика персонала',
        body: `${user.fullName} · ${shift.date} · ${simLabel}`,
        href: notifHref('/admin/staff-schedule', shift.id, { date: shift.date }),
        audienceRoles: ROLES_STAFF,
        meta: { shiftId: shift.id, date: shift.date, userId },
      })
    }
  })
  broadcast()
  res.status(201).json({ ...shift, user })
})

apiRouter.delete('/admin/staff-shifts/:id', async (req, res) => {
  const id = String(req.params.id)
  const store = readStore()
  const shift = store.staffShifts.find((s) => s.id === id)
  if (!shift) return res.status(404).json({ error: 'NOT_FOUND' })
  if (req.session!.role === 'PILOT' && shift.userId !== req.session!.userId) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const pilot = store.users.find((u) => u.id === shift.userId)
  const simLabel = shift.simulatorSlug === 'mi-2' ? 'Ми-2' : 'Boeing 737'
  const actorId = req.session!.userId
  const actor = archiveActor(req)
  await updateStore((s) => {
    pushArchive(s, {
      section: 'staff_shifts',
      entityId: shift.id,
      title: pilot?.fullName ?? 'Пилот',
      summary: `${shift.date} · ${simLabel}`,
      payload: { ...shift, userName: pilot?.fullName },
      ...actor,
    })
    s.staffShifts = s.staffShifts.filter((x) => x.id !== id)
    if (shift.userId !== actorId) {
      pushNotification(s, {
        kind: 'staff_shift',
        title: 'Смена снята',
        body: `${shift.date} · ${simLabel}`,
        href: notifHref('/admin/staff-schedule', undefined, { date: shift.date }),
        audienceRoles: ['PILOT'],
        targetUserId: shift.userId,
        meta: { date: shift.date },
      })
    }
    pushNotification(s, {
      kind: 'staff_shift',
      title: 'Смена удалена из графика',
      body: `${pilot?.fullName ?? 'Пилот'} · ${shift.date} · ${simLabel}`,
      href: notifHref('/admin/staff-schedule', undefined, { date: shift.date }),
      audienceRoles: ROLES_STAFF,
      meta: { date: shift.date, userId: shift.userId },
    })
  })
  broadcast()
  res.json({ ok: true })
})

apiRouter.get('/admin/notifications', (req, res) => {
  const store = readStore()
  const rows = notificationsForUser(store, req.session!.role, req.session!.userId)
  res.json({
    items: rows,
    unread: rows.filter((n) => !n.read).length,
  })
})

apiRouter.post('/admin/notifications/:id/read', async (req, res) => {
  const id = String(req.params.id)
  const userId = req.session!.userId
  const role = req.session!.role
  await updateStore((s) => {
    const n = (s.notifications ?? []).find((x) => x.id === id)
    if (n && isNotificationVisible(n, role, userId)) {
      n.readBy[userId] = new Date().toISOString()
    }
  })
  broadcast()
  res.json({ ok: true })
})

apiRouter.post('/admin/notifications/read-all', async (req, res) => {
  const userId = req.session!.userId
  const role = req.session!.role
  await updateStore((s) => {
    const now = new Date().toISOString()
    for (const n of s.notifications ?? []) {
      if (isNotificationVisible(n, role, userId) && !n.readBy[userId]) {
        n.readBy[userId] = now
      }
    }
  })
  broadcast()
  res.json({ ok: true })
})

apiRouter.use('/admin', hideFromPilots)

apiRouter.get('/admin/certificates', async (_req, res) => {
  await updateStore((s) => {
    expireCertificatesInStore(s)
  })
  res.json(readStore().certificates)
})

apiRouter.post('/admin/certificates', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
  const body = req.body
  const isRestore = Boolean(body.id)
  // Новые из админки — всегда в офисе и оплачены; restore сохраняет исходный способ
  const paymentMethod = isRestore
    ? body.paymentMethod === 'ONLINE'
      ? 'ONLINE'
      : 'OFFLINE'
    : 'OFFLINE'
  const simulatorSlug = String(body.simulatorSlug ?? 'boeing-737')
  const cert: Certificate = {
    id: isRestore ? String(body.id) : newId(),
    number: body.number ?? `№${readStore().counters.certificate}`,
    phone: body.phone,
    fullName: body.fullName,
    durationMin: body.durationMin,
    paymentStatus: 'PAID',
    paymentMethod,
    validFrom: body.validFrom,
    validTo: body.validTo,
    simulatorSlug,
    status: body.status ?? 'ACTIVE',
    designColor: defaultDesignColor(simulatorSlug, body.designColor),
    comment: body.comment ?? '',
    createdAt: body.createdAt ?? new Date().toISOString(),
  }
  await updateStore((s) => {
    if (body.id) {
      s.certificates = s.certificates.filter((c) => c.id !== cert.id)
      clearArchiveEntity(s, 'certificates', cert.id)
    }
    s.certificates.unshift(cert)
    if (!body.number && !body.id) s.counters.certificate += 1
    expireCertificatesInStore(s)
    if (!body.id) {
      pushNotification(s, {
        kind: 'certificate',
        title: 'Оформлен сертификат',
        body: `${cert.number} · ${cert.fullName} · ${cert.durationMin} мин · ${cert.paymentMethod === 'ONLINE' ? 'на сайте' : 'в офисе'}`,
        href: notifHref('/admin/certificates', cert.id),
        audienceRoles: ROLES_STAFF,
        meta: { certificateId: cert.id },
      })
    }
  })
  broadcast()
  res.status(201).json(cert)
})

apiRouter.patch('/admin/certificates/:id', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
  const id = String(req.params.id)
  let updated: Certificate | undefined
  await updateStore((s) => {
    const c = s.certificates.find((x) => x.id === id)
    if (c) {
      Object.assign(c, req.body)
      // Сертификат не может быть неоплаченным
      c.paymentStatus = 'PAID'
      if (req.body.paymentMethod === 'ONLINE' || req.body.paymentMethod === 'OFFLINE') {
        c.paymentMethod = req.body.paymentMethod
      }
      if (req.body.simulatorSlug || req.body.designColor) {
        c.designColor = defaultDesignColor(c.simulatorSlug, c.designColor)
      }
      expireCertificatesInStore(s)
    }
    updated = c
  })
  broadcast()
  res.json(updated)
})

apiRouter.delete('/admin/certificates/:id', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
  const id = String(req.params.id)
  const actor = archiveActor(req)
  await updateStore((s) => {
    const prev = s.certificates.find((c) => c.id === id)
    if (!prev) return
    pushArchive(s, {
      section: 'certificates',
      entityId: prev.id,
      title: prev.number,
      summary: `${prev.fullName} · ${prev.phone} · ${prev.durationMin} мин`,
      payload: prev,
      ...actor,
    })
    s.certificates = s.certificates.filter((c) => c.id !== id)
  })
  broadcast()
  res.json({ ok: true })
})

apiRouter.get('/admin/waiting-room', (req, res) => {
  const date = req.query.date ? String(req.query.date) : undefined
  let rows = readStore().waitingRoom
  if (date) rows = rows.filter((r) => r.date === date)
  res.json(rows)
})

apiRouter.post('/admin/waiting-room', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
  const restoreId = typeof req.body.id === 'string' ? req.body.id : ''
  const entry = {
    id: restoreId || newId(),
    date: req.body.date,
    line: req.body.line,
    createdAt: req.body.createdAt ?? new Date().toISOString(),
  }
  await updateStore((s) => {
    if (restoreId) {
      s.waitingRoom = s.waitingRoom.filter((w) => w.id !== entry.id)
      clearArchiveEntity(s, 'waiting_room', entry.id)
    }
    s.waitingRoom.unshift(entry)
    if (!restoreId) {
      pushNotification(s, {
        kind: 'waiting_room',
        title: 'Зал ожидания',
        body: `${entry.date}: ${String(entry.line).slice(0, 100)}`,
        href: notifHref('/admin/waiting-room', entry.id, { date: entry.date }),
        audienceRoles: ROLES_STAFF,
        meta: { waitingId: entry.id, date: entry.date },
      })
    }
  })
  broadcast()
  res.status(201).json(entry)
})

apiRouter.patch('/admin/waiting-room/:id', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
  const id = String(req.params.id)
  let updated
  await updateStore((s) => {
    const row = s.waitingRoom.find((w) => w.id === id)
    if (!row) return
    if (req.body.date != null) row.date = String(req.body.date)
    if (req.body.line != null) row.line = String(req.body.line)
    updated = row
  })
  if (!updated) return res.status(404).json({ error: 'NOT_FOUND' })
  broadcast()
  res.json(updated)
})

apiRouter.delete('/admin/waiting-room/:id', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
  const id = String(req.params.id)
  const actor = archiveActor(req)
  await updateStore((s) => {
    const prev = s.waitingRoom.find((w) => w.id === id)
    if (!prev) return
    pushArchive(s, {
      section: 'waiting_room',
      entityId: prev.id,
      title: prev.date,
      summary: String(prev.line).slice(0, 160),
      payload: prev,
      ...actor,
    })
    s.waitingRoom = s.waitingRoom.filter((w) => w.id !== id)
  })
  broadcast()
  res.json({ ok: true })
})

apiRouter.get('/admin/prices/flights', (_req, res) => res.json(readStore().flightPrices))
apiRouter.get('/admin/prices/certificates', (_req, res) => res.json(readStore().certPrices))
apiRouter.get('/admin/promos', (_req, res) => res.json(readStore().promos))

function archiveRemovedPriceRows(
  s: ReturnType<typeof readStore>,
  kind: 'flight_prices' | 'cert_prices',
  prev: PriceRow[],
  next: PriceRow[],
  actor: ReturnType<typeof archiveActor>,
) {
  const nextIds = new Set(next.map((r) => r.id))
  for (const row of prev) {
    if (nextIds.has(row.id)) continue
    pushArchive(s, {
      section: 'prices_promos',
      kind,
      entityId: row.id,
      title: `${row.simulatorSlug} · ${row.durationMin} мин`,
      summary: `${row.priceByn} BYN`,
      payload: row,
      ...actor,
    })
  }
  for (const row of next) {
    clearArchiveEntity(s, 'prices_promos', row.id)
  }
}

apiRouter.put('/admin/prices/flights', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
  const actor = archiveActor(req)
  const rows = req.body.rows as PriceRow[]
  await updateStore((s) => {
    archiveRemovedPriceRows(s, 'flight_prices', s.flightPrices, rows, actor)
    s.flightPrices = rows
  })
  broadcast()
  res.json(readStore().flightPrices)
})

apiRouter.put('/admin/prices/certificates', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
  const actor = archiveActor(req)
  const rows = req.body.rows as PriceRow[]
  await updateStore((s) => {
    archiveRemovedPriceRows(s, 'cert_prices', s.certPrices, rows, actor)
    s.certPrices = rows
  })
  broadcast()
  res.json(readStore().certPrices)
})

apiRouter.put('/admin/promos', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
  const actor = archiveActor(req)
  const rows = req.body.rows as Promo[]
  await updateStore((s) => {
    const nextIds = new Set(rows.map((r) => r.id))
    for (const row of s.promos) {
      if (nextIds.has(row.id)) continue
      pushArchive(s, {
        section: 'prices_promos',
        kind: 'promos',
        entityId: row.id,
        title: row.name,
        summary: `−${row.discountPercent}% · ${row.productType} · ${row.startDate}–${row.endDate}`,
        payload: row,
        ...actor,
      })
    }
    for (const row of rows) clearArchiveEntity(s, 'prices_promos', row.id)
    s.promos = rows
  })
  broadcast()
  res.json(readStore().promos)
})

apiRouter.get('/admin/work-hours', (_req, res) => res.json(readStore().workHours))

apiRouter.post('/admin/work-hours', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
  const restoreId = typeof req.body.id === 'string' ? req.body.id : ''
  const entry = {
    id: restoreId || newId(),
    line: req.body.line,
    createdAt: req.body.createdAt ?? new Date().toISOString(),
  }
  await updateStore((s) => {
    if (restoreId) {
      s.workHours = s.workHours.filter((w) => w.id !== entry.id)
      clearArchiveEntity(s, 'schedule_settings', entry.id)
    }
    s.workHours.unshift(entry)
  })
  broadcast()
  res.status(201).json(entry)
})

apiRouter.delete('/admin/work-hours/:id', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
  const id = String(req.params.id)
  const actor = archiveActor(req)
  await updateStore((s) => {
    const prev = s.workHours.find((w) => w.id === id)
    if (!prev) return
    pushArchive(s, {
      section: 'schedule_settings',
      kind: 'work_hours',
      entityId: prev.id,
      title: 'Время работы',
      summary: prev.line,
      payload: prev,
      ...actor,
    })
    s.workHours = s.workHours.filter((w) => w.id !== id)
  })
  broadcast()
  res.json({ ok: true })
})

apiRouter.get('/admin/pilots', requireRoles('ADMIN', 'MANAGER'), (_req, res) => {
  res.json(readStore().users.filter((u) => u.role === 'PILOT' && u.isActive))
})

apiRouter.get('/admin/accounts', requireRoles('ADMIN'), (_req, res) => {
  res.json(readStore().users)
})

apiRouter.post('/admin/accounts', requireRoles('ADMIN'), async (req, res) => {
  const body = req.body
  const password = String(body.password ?? '').trim()
  if (!password) {
    res.status(400).json({ error: 'PASSWORD_REQUIRED' })
    return
  }
  const role = body.role as UserRole
  const pilotSimulators =
    role === 'PILOT' ? (Array.isArray(body.pilotSimulators) ? body.pilotSimulators : []) : []
  const user = {
    id: typeof body.id === 'string' && body.id ? body.id : newId(),
    login: body.login,
    password,
    fullName: body.fullName,
    phone: body.phone ?? '',
    role,
    isActive: body.isActive ?? true,
    color: body.color ?? '#2563eb',
    pilotSimulators,
  }
  await updateStore((s) => {
    if (s.users.some((u) => u.id === user.id)) {
      return
    }
    clearArchiveEntity(s, 'accounts', user.id)
    s.users.push(user)
  })
  broadcast()
  res.status(201).json(user)
})

apiRouter.patch('/admin/accounts/:id', requireRoles('ADMIN'), async (req, res) => {
  const id = String(req.params.id)
  let updated
  await updateStore((s) => {
    const u = s.users.find((x) => x.id === id)
    if (!u) return
    const body = { ...req.body } as Record<string, unknown>
    const nextPassword = typeof body.password === 'string' ? body.password.trim() : ''
    if (!nextPassword) delete body.password
    else body.password = nextPassword
    if (body.role && body.role !== 'PILOT') body.pilotSimulators = []
    Object.assign(u, body)
    updated = u
  })
  broadcast()
  res.json(updated)
})

apiRouter.delete('/admin/accounts/:id', requireRoles('ADMIN'), async (req, res) => {
  const id = String(req.params.id)
  if (id === req.session!.userId) {
    res.status(400).json({ error: 'CANNOT_DELETE_SELF' })
    return
  }
  const actor = archiveActor(req)
  let removed: User | undefined
  await updateStore((s) => {
    const idx = s.users.findIndex((x) => x.id === id)
    if (idx < 0) return
    removed = s.users[idx]
    pushArchive(s, {
      section: 'accounts',
      entityId: removed.id,
      title: removed.fullName,
      summary: `${removed.login} · ${removed.role}${removed.isActive ? '' : ' · неактивен'}`,
      payload: removed,
      ...actor,
    })
    s.users.splice(idx, 1)
  })
  if (!removed) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  broadcast()
  res.json(removed)
})

apiRouter.get('/admin/settings/option-lists', requireRoles('ADMIN'), (_req, res) => {
  res.json(readStore().optionLists)
})

apiRouter.put('/admin/settings/option-lists/:key', requireRoles('ADMIN'), async (req, res) => {
  const key = String(req.params.key) as keyof ReturnType<typeof readStore>['optionLists']
  const rows = req.body.rows
  await updateStore((s) => {
    if (key in s.optionLists) {
      ;(s.optionLists as Record<string, unknown>)[key] = rows
    }
  })
  broadcast()
  res.json(readStore().optionLists)
})

apiRouter.get('/admin/settings/documents', requireRoles('ADMIN'), (_req, res) => {
  res.json(readStore().documents)
})

apiRouter.patch('/admin/settings/documents/:key', requireRoles('ADMIN'), async (req, res) => {
  const key = String(req.params.key)
  let doc
  await updateStore((s) => {
    doc = s.documents.find((d) => d.key === key)
    if (doc) doc.content = req.body.content
  })
  broadcast()
  res.json(doc)
})

apiRouter.get('/admin/settings/contacts', requireRoles('ADMIN'), (_req, res) => {
  res.json(readStore().contacts)
})

apiRouter.put('/admin/settings/contacts', requireRoles('ADMIN'), async (req, res) => {
  await updateStore((s) => {
    s.contacts = req.body
  })
  broadcast()
  res.json(readStore().contacts)
})

apiRouter.get('/admin/settings/gallery/:slug', requireRoles('ADMIN'), (req, res) => {
  const slug = String(req.params.slug)
  res.json(readStore().gallery[slug] ?? [])
})

apiRouter.post('/admin/settings/gallery/:slug', requireRoles('ADMIN'), async (req, res) => {
  const slug = String(req.params.slug)
  const url = String(req.body.url)
  await updateStore((s) => {
    if (!s.gallery[slug]) s.gallery[slug] = []
    s.gallery[slug].push(url)
  })
  broadcast()
  res.json(readStore().gallery[slug])
})

type SeriesPoint = { label: string; value: number; date: string; summary: string }

function emptySeriesPoint(): SeriesPoint {
  const date = format(new Date(), 'yyyy-MM-dd')
  return { label: date.slice(5), value: 0, date, summary: 'Нет данных за этот день' }
}

function parseDateKey(raw: unknown): string | undefined {
  const s = String(raw ?? '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined
}

function parsePeriodRange(query: { from?: unknown; to?: unknown }): { from?: string; to?: string } {
  const from = parseDateKey(query.from)
  const to = parseDateKey(query.to)
  if (from && to && from > to) return { from: to, to: from }
  return { from, to }
}

function inPeriod(dateKey: string, from?: string, to?: string) {
  if (from && dateKey < from) return false
  if (to && dateKey > to) return false
  return true
}

function eachDateKey(from: string, to: string): string[] {
  const out: string[] = []
  let cursor = from
  while (cursor <= to) {
    out.push(cursor)
    const d = new Date(`${cursor}T12:00:00`)
    d.setDate(d.getDate() + 1)
    cursor = format(d, 'yyyy-MM-dd')
    if (out.length > 800) break
  }
  return out
}

function fillSeriesRange(series: SeriesPoint[], from?: string, to?: string): SeriesPoint[] {
  if (!from || !to) return series.length ? series : [emptySeriesPoint()]
  const byDate = new Map(series.map((p) => [p.date, p]))
  return eachDateKey(from, to).map((date) => {
    const hit = byDate.get(date)
    if (hit) return hit
    return { label: date.slice(5), value: 0, date, summary: 'Нет данных за этот день' }
  })
}

function seriesFromBookings(rows: { date: string; simulatorSlug: string; durationMin: number; paid: boolean; status: string }[]): SeriesPoint[] {
  const byDate = new Map<string, typeof rows>()
  for (const row of rows) {
    const list = byDate.get(row.date) ?? []
    list.push(row)
    byDate.set(row.date, list)
  }
  const series = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayRows]) => {
      const b737 = dayRows.filter((r) => r.simulatorSlug === 'boeing-737').length
      const mi2 = dayRows.filter((r) => r.simulatorSlug === 'mi-2').length
      const paid = dayRows.filter((r) => r.paid).length
      const parts = [`${dayRows.length} полёт${dayRows.length === 1 ? '' : dayRows.length < 5 ? 'а' : 'ов'}`]
      if (b737) parts.push(`${b737} Boeing`)
      if (mi2) parts.push(`${mi2} Ми-2`)
      parts.push(`${paid} оплачено`)
      const mins = [...new Set(dayRows.map((r) => r.durationMin))].sort((a, b) => a - b)
      if (mins.length) parts.push(mins.map((m) => `${m} мин`).join(', '))
      return { label: date.slice(5), value: dayRows.length, date, summary: parts.join(' · ') }
    })
  return series.length ? series : [emptySeriesPoint()]
}

function seriesFromCertificates(
  rows: { date: string; simulatorSlug: string; durationMin: number; paymentMethod?: string }[],
): SeriesPoint[] {
  const byDate = new Map<string, typeof rows>()
  for (const row of rows) {
    const list = byDate.get(row.date) ?? []
    list.push(row)
    byDate.set(row.date, list)
  }
  const series = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayRows]) => {
      const online = dayRows.filter((r) => r.paymentMethod === 'ONLINE').length
      const offline = dayRows.length - online
      const parts = [
        `${dayRows.length} сертификат${dayRows.length === 1 ? '' : dayRows.length < 5 ? 'а' : 'ов'}`,
      ]
      if (online) parts.push(`${online} на сайте`)
      if (offline) parts.push(`${offline} в офисе`)
      const mins = [...new Set(dayRows.map((r) => r.durationMin))].sort((a, b) => a - b)
      if (mins.length) parts.push(mins.map((m) => `${m} мин`).join(', '))
      return { label: date.slice(5), value: dayRows.length, date, summary: parts.join(' · ') }
    })
  return series.length ? series : [emptySeriesPoint()]
}

function parseSimulatorFilter(raw: unknown): string | undefined {
  if (raw == null || raw === '' || raw === 'all') return undefined
  return String(raw)
}

function parseDurationFilter(raw: unknown): number | undefined {
  if (raw == null || raw === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

apiRouter.get('/admin/analytics/overview', (req, res) => {
  const store = readStore()
  const { from, to } = parsePeriodRange(req.query)
  const confirmed = store.bookings.filter((b) => {
    if (b.status !== 'CONFIRMED' && b.status !== 'DONE') return false
    return inPeriod(b.date, from, to)
  })
  const certs = store.certificates.filter((c) => {
    if (c.status === 'CANCELLED') return false
    const date = c.createdAt ? c.createdAt.slice(0, 10) : c.validFrom
    return inPeriod(date, from, to)
  })
  res.json({
    total: confirmed.length,
    b737: confirmed.filter((b) => b.simulatorSlug === 'boeing-737').length,
    mi2: confirmed.filter((b) => b.simulatorSlug === 'mi-2').length,
    certificates: certs.length,
  })
})

/** Серия + итог по полётам. ?simulator=&durationMin=&from=&to= */
apiRouter.get('/admin/analytics/flights', (req, res) => {
  const store = readStore()
  const slug = parseSimulatorFilter(req.query.simulator)
  const durationMin = parseDurationFilter(req.query.durationMin)
  const { from, to } = parsePeriodRange(req.query)
  const rows = store.bookings.filter((b) => {
    if (b.status === 'CANCELLED' || b.status === 'EXPIRED') return false
    if (slug && b.simulatorSlug !== slug) return false
    if (durationMin != null && b.durationMin !== durationMin) return false
    if (!inPeriod(b.date, from, to)) return false
    return true
  })
  res.json({
    total: rows.length,
    series: fillSeriesRange(seriesFromBookings(rows), from, to),
    from: from ?? null,
    to: to ?? null,
  })
})

/** Серия + итог по сертификатам. ?simulator=&durationMin=&from=&to= */
apiRouter.get('/admin/analytics/certificates', (req, res) => {
  const store = readStore()
  const slug = parseSimulatorFilter(req.query.simulator)
  const durationMin = parseDurationFilter(req.query.durationMin)
  const { from, to } = parsePeriodRange(req.query)
  const rows = store.certificates
    .filter((c) => {
      if (c.status === 'CANCELLED') return false
      if (slug && c.simulatorSlug !== slug) return false
      if (durationMin != null && c.durationMin !== durationMin) return false
      const date = c.createdAt ? c.createdAt.slice(0, 10) : c.validFrom
      return inPeriod(date, from, to)
    })
    .map((c) => ({
      date: c.createdAt ? c.createdAt.slice(0, 10) : c.validFrom,
      simulatorSlug: c.simulatorSlug,
      durationMin: c.durationMin,
      paymentMethod: c.paymentMethod,
    }))
  res.json({
    total: rows.length,
    series: fillSeriesRange(seriesFromCertificates(rows), from, to),
    from: from ?? null,
    to: to ?? null,
  })
})

apiRouter.get('/admin/analytics/series', (req, res) => {
  const store = readStore()
  const slug = parseSimulatorFilter(req.query.simulator)
  const durationMin = parseDurationFilter(req.query.durationMin)
  const { from, to } = parsePeriodRange(req.query)
  const rows = store.bookings.filter((b) => {
    if (b.status === 'CANCELLED' || b.status === 'EXPIRED') return false
    if (slug && b.simulatorSlug !== slug) return false
    if (durationMin != null && b.durationMin !== durationMin) return false
    if (!inPeriod(b.date, from, to)) return false
    return true
  })
  res.json(fillSeriesRange(seriesFromBookings(rows), from, to))
})

apiRouter.post('/admin/demo-data', requireRoles('ADMIN'), async (_req, res) => {
  const store = await resetStoreToDemo()
  broadcast()
  res.json({
    ok: true,
    bookings: store.bookings.length,
    certificates: store.certificates.length,
    staffShifts: store.staffShifts.length,
  })
})

apiRouter.get('/admin/maintenance', (_req, res) => {
  const store = readStore()
  const items = listMaintenance(store).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
  const blockedDates = Object.entries(store.calendar)
    .filter(([, status]) => status === 'BLOCKED')
    .map(([date]) => date)
    .sort()
  res.json({ items, blockedDates })
})

apiRouter.post('/admin/maintenance', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
  const date = String(req.body.date ?? req.body.plannedAt?.slice?.(0, 10) ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'DATE_REQUIRED' })
  }
  const simulatorSlug =
    req.body.simulatorSlug === 'boeing-737' || req.body.simulatorSlug === 'mi-2'
      ? req.body.simulatorSlug
      : null
  const startTime = req.body.startTime ? String(req.body.startTime).slice(0, 5) : null
  const endTime = req.body.endTime ? String(req.body.endTime).slice(0, 5) : null
  if ((startTime && !endTime) || (!startTime && endTime)) {
    return res.status(400).json({ error: 'TIME_RANGE_INCOMPLETE' })
  }
  if (startTime && endTime && startTime >= endTime) {
    return res.status(400).json({ error: 'TIME_RANGE_INVALID' })
  }

  const restoreId = typeof req.body.id === 'string' ? req.body.id : ''
  const entry: MaintenanceEntry = {
    id: restoreId || newId(),
    date,
    simulatorSlug,
    startTime,
    endTime,
    notes: String(req.body.notes ?? ''),
    createdAt: req.body.createdAt ?? new Date().toISOString(),
    plannedAt: `${date}T12:00:00.000Z`,
  }

  const archiveSection = parseArchiveSection(
    req.body.archiveSection,
    startTime && endTime && !simulatorSlug ? 'schedule_settings' : 'maintenance',
  )

  await updateStore((s) => {
    if (restoreId) {
      s.maintenance = (s.maintenance ?? []).filter((m) => m.id !== entry.id)
      clearArchiveEntity(s, 'maintenance', entry.id)
      clearArchiveEntity(s, 'schedule_settings', entry.id)
    }
    s.maintenance.unshift(entry)
    // Полный день на все тренажёры → день закрыт в календаре сайта
    if (!simulatorSlug && !startTime && !endTime) {
      s.calendar[date] = 'BLOCKED'
    }
    if (!restoreId) {
      pushNotification(s, {
        kind: 'maintenance',
        title: 'Запланировано ТО',
        body: `${formatMaintenanceLabel(entry)}${entry.notes ? ` — ${entry.notes.slice(0, 80)}` : ''}`,
        href: notifHref(
          archiveSection === 'schedule_settings' ? '/admin/schedule-settings' : '/admin/maintenance',
          entry.id,
        ),
        audienceRoles: ROLES_STAFF,
        meta: { maintenanceId: entry.id, date },
      })
    }
  })
  broadcast()
  res.status(201).json(normalizeMaintenance(entry))
})

/** Блокировка интервала на диапазоне дат — оба тренажёра. */
apiRouter.post('/admin/maintenance/range', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
  const from = String(req.body.from ?? '').trim()
  const to = String(req.body.to ?? req.body.from ?? '').trim()
  const startTime = String(req.body.startTime ?? '').slice(0, 5)
  const endTime = String(req.body.endTime ?? '').slice(0, 5)
  const notes = String(req.body.notes ?? 'Блокировка интервала')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).json({ error: 'DATE_RANGE_REQUIRED' })
  }
  if (!startTime || !endTime || startTime >= endTime) {
    return res.status(400).json({ error: 'TIME_RANGE_INVALID' })
  }
  if (from > to) {
    return res.status(400).json({ error: 'DATE_RANGE_INVALID' })
  }

  const created: MaintenanceEntry[] = []
  let cursor = from
  const nowIso = new Date().toISOString()
  while (cursor <= to) {
    created.push({
      id: newId(),
      date: cursor,
      simulatorSlug: null,
      startTime,
      endTime,
      notes,
      createdAt: nowIso,
      plannedAt: `${cursor}T12:00:00.000Z`,
    })
    const d = new Date(`${cursor}T12:00:00`)
    d.setDate(d.getDate() + 1)
    cursor = format(d, 'yyyy-MM-dd')
  }

  await updateStore((s) => {
    for (const entry of created) s.maintenance.unshift(entry)
    pushNotification(s, {
      kind: 'maintenance',
      title: 'Заблокирован интервал',
      body: `${from}–${to} · ${startTime}–${endTime} · оба тренажёра (${created.length} дн.)`,
      href: '/admin/schedule-settings',
      audienceRoles: ROLES_STAFF,
      meta: { from, to, startTime, endTime, count: String(created.length) },
    })
  })
  broadcast()
  res.status(201).json({ items: created.map(normalizeMaintenance) })
})

apiRouter.delete('/admin/maintenance/:id', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
  const id = String(req.params.id)
  const actor = archiveActor(req)
  const section = parseArchiveSection(req.query.archiveSection, 'maintenance')
  await updateStore((s) => {
    const prev = listMaintenance(s).find((m) => m.id === id)
    if (!prev) return
    pushArchive(s, {
      section,
      kind: 'maintenance',
      entityId: prev.id,
      title: formatMaintenanceLabel(prev),
      summary: prev.notes || formatMaintenanceLabel(prev),
      payload: prev,
      ...actor,
    })
    s.maintenance = (s.maintenance ?? []).filter((m) => m.id !== id)
    if (prev && !prev.simulatorSlug && !prev.startTime && !prev.endTime) {
      const stillFullDay = listMaintenance(s).some(
        (m) => m.date === prev.date && !m.simulatorSlug && !m.startTime && !m.endTime,
      )
      if (!stillFullDay && s.calendar[prev.date] === 'BLOCKED') {
        delete s.calendar[prev.date]
      }
    }
  })
  broadcast()
  res.json({ ok: true })
})

// --- Архив удалений (админ + менеджер, секции по доступу) ---
apiRouter.get('/admin/archive', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
  const role = req.session!.role
  await updateStore((s) => {
    purgeExpiredArchive(s)
  })
  const store = readStore()
  const items = listArchiveForRole(store, role)
  const sectionOrder = Object.keys(ARCHIVE_SECTION_META) as ArchiveSectionKey[]
  const sections = sectionOrder
    .filter((key) => canViewArchiveSection(role, key))
    .map((key) => ({
      key,
      title: ARCHIVE_SECTION_META[key].title,
      sourcePath: ARCHIVE_SECTION_META[key].sourcePath,
      items: items.filter((e) => e.section === key),
    }))
  res.json({
    retentionDays: 30,
    sections,
    total: items.length,
  })
})

apiRouter.post('/admin/archive/:id/restore', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
  const id = String(req.params.id)
  const role = req.session!.role
  const store = readStore()
  purgeExpiredArchive(store)
  const entry = (store.archive ?? []).find((e) => e.id === id)
  if (!entry) return res.status(404).json({ error: 'NOT_FOUND' })
  if (!canViewArchiveSection(role, entry.section as ArchiveSectionKey)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  let error: string | undefined
  await updateStore((s) => {
    const payload = entry.payload as Record<string, unknown>
    const entityId = entry.entityId

    const exists = (arr: { id: string }[]) => arr.some((x) => x.id === entityId)

    switch (entry.section) {
      case 'bookings': {
        if (exists(s.bookings)) {
          error = 'ALREADY_EXISTS'
          return
        }
        s.bookings.push(payload as unknown as Booking)
        break
      }
      case 'certificates': {
        if (exists(s.certificates)) {
          error = 'ALREADY_EXISTS'
          return
        }
        s.certificates.unshift(payload as unknown as Certificate)
        break
      }
      case 'waiting_room': {
        if (exists(s.waitingRoom)) {
          error = 'ALREADY_EXISTS'
          return
        }
        s.waitingRoom.unshift(payload as unknown as WaitingEntry)
        break
      }
      case 'staff_shifts': {
        if (exists(s.staffShifts)) {
          error = 'ALREADY_EXISTS'
          return
        }
        const { userName: _u, ...shift } = payload as StaffShift & { userName?: string }
        s.staffShifts.push(shift)
        break
      }
      case 'maintenance':
      case 'schedule_settings': {
        if (entry.kind === 'work_hours') {
          if (exists(s.workHours)) {
            error = 'ALREADY_EXISTS'
            return
          }
          s.workHours.unshift(payload as unknown as WorkHourEntry)
        } else {
          if (exists(s.maintenance ?? [])) {
            error = 'ALREADY_EXISTS'
            return
          }
          const m = normalizeMaintenance(payload as unknown as MaintenanceEntry)
          s.maintenance.unshift(m)
          if (!m.simulatorSlug && !m.startTime && !m.endTime) {
            s.calendar[m.date] = 'BLOCKED'
          }
        }
        break
      }
      case 'accounts': {
        if (role !== 'ADMIN') {
          error = 'Forbidden'
          return
        }
        if (exists(s.users)) {
          error = 'ALREADY_EXISTS'
          return
        }
        s.users.push(payload as unknown as User)
        break
      }
      case 'prices_promos': {
        if (entry.kind === 'flight_prices') {
          if (exists(s.flightPrices)) {
            error = 'ALREADY_EXISTS'
            return
          }
          s.flightPrices.push(payload as unknown as PriceRow)
        } else if (entry.kind === 'cert_prices') {
          if (exists(s.certPrices)) {
            error = 'ALREADY_EXISTS'
            return
          }
          s.certPrices.push(payload as unknown as PriceRow)
        } else if (entry.kind === 'promos') {
          if (exists(s.promos)) {
            error = 'ALREADY_EXISTS'
            return
          }
          s.promos.push(payload as unknown as Promo)
        }
        break
      }
      default:
        error = 'UNKNOWN_SECTION'
        return
    }

    s.archive = (s.archive ?? []).filter((e) => e.id !== id)
  })

  if (error === 'Forbidden') return res.status(403).json({ error })
  if (error === 'ALREADY_EXISTS') return res.status(409).json({ error })
  if (error) return res.status(400).json({ error })

  broadcast()
  res.json({ ok: true })
})

apiRouter.delete('/admin/archive/:id', requireRoles('ADMIN', 'MANAGER'), async (req, res) => {
  const id = String(req.params.id)
  const role = req.session!.role
  const store = readStore()
  const entry = (store.archive ?? []).find((e) => e.id === id)
  if (!entry) return res.status(404).json({ error: 'NOT_FOUND' })
  if (!canViewArchiveSection(role, entry.section as ArchiveSectionKey)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  await updateStore((s) => {
    s.archive = (s.archive ?? []).filter((e) => e.id !== id)
  })
  broadcast()
  res.json({ ok: true })
})

function subMonthsSafe(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() - n, d.getDate())
}

function addMonthsSafe(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate())
}

// Expire stale bookings periodically
setInterval(() => {
  void updateStore((s) => {
    const now = new Date().toISOString()
    for (const b of s.bookings) {
      if (b.status === 'PENDING_CONFIRMATION' && b.holdExpiresAt && b.holdExpiresAt < now) {
        b.status = 'EXPIRED'
      }
    }
  })
}, 30_000)
