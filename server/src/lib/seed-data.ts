import { addDays, addMonths, format, getDay, startOfDay, startOfMonth, subDays } from 'date-fns'
import type {
  AdminNotification,
  Booking,
  BookingStatus,
  CalendarDayStatus,
  Certificate,
  DataStore,
  FeedbackRequest,
  MaintenanceEntry,
  StaffShift,
  User,
  WaitingEntry,
  WorkHourEntry,
} from '../types.js'

const B737 = 'boeing-737'
const MI2 = 'mi-2'
const HAPPY_TAG = '«Счастливые часы»'

/** Должно совпадать с прайсом на странице «Цены» (prod/src/data/simulators.ts). */
const FLIGHT_PRICES = [
  { durationMin: 30, simulatorSlug: B737, priceByn: 200 },
  { durationMin: 60, simulatorSlug: B737, priceByn: 350 },
  { durationMin: 90, simulatorSlug: B737, priceByn: 480 },
  { durationMin: 120, simulatorSlug: B737, priceByn: 600 },
  { durationMin: 30, simulatorSlug: MI2, priceByn: 170 },
  { durationMin: 60, simulatorSlug: MI2, priceByn: 300 },
]

/** Комбо-сертификат: 30 мин Boeing 737NG + 30 мин Ми-2. */
const COMBO_CERT_PRICE = { durationMin: 60, simulatorSlug: 'combo', priceByn: 370 }

const dk = (d: Date) => format(d, 'yyyy-MM-dd')
const isWeekendDay = (d: Date) => {
  const day = getDay(d)
  return day === 0 || day === 6
}

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Детерминированный ГПСЧ, чтобы демо-данные были одинаковыми при каждом пересоздании. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

const CLIENTS: { name: string; phone: string; email: string }[] = [
  { name: 'Арсений Ковалёв', phone: '+375 29 123-45-67', email: 'arseniy@example.com' },
  { name: 'Мария Лебедева', phone: '+375 33 765-43-21', email: 'maria.l@example.com' },
  { name: 'Дмитрий Орлов', phone: '+375 44 555-12-34', email: 'orlov.d@example.com' },
  { name: 'Екатерина Соколова', phone: '+375 25 900-11-22', email: 'kate.sokol@example.com' },
  { name: 'Павел Новиков', phone: '+7 916 123-45-67', email: 'pavel.n@example.ru' },
  { name: 'Анна Морозова', phone: '+375 29 222-33-44', email: 'anna.m@example.com' },
  { name: 'Игорь Волков', phone: '+375 33 444-55-66', email: 'volkov@example.com' },
  { name: 'Ольга Кузнецова', phone: '+48 512 345 678', email: 'olga.k@example.pl' },
  { name: 'Сергей Павлов', phone: '+375 44 777-88-99', email: 'pavlov.s@example.com' },
  { name: 'Наталья Семёнова', phone: '+375 29 101-20-30', email: 'nsemenova@example.com' },
  { name: 'Алексей Фёдоров', phone: '+375 25 303-40-50', email: 'fedorov.a@example.com' },
  { name: 'Виктория Белова', phone: '+375 33 606-70-80', email: 'vika.belova@example.com' },
]

const COMMENTS = [
  '',
  '',
  'Будем с ребёнком',
  'Первый полёт, нужен подробный инструктаж',
  'Подарок мужу на годовщину',
  'Хотят посадку в Минске',
  'Придут вдвоём, второй будет наблюдать',
  'Просили видеозапись полёта',
]

type BookingSpec = {
  date: string
  start: string
  duration: number
  sim: string
  status: BookingStatus
  paid: boolean
  online?: boolean
  client: number
  comment?: string
  birthday?: string
  cert?: string
  happy?: boolean
  holdMinutes?: number
}

function makeBooking(spec: BookingSpec, idx: number, now: Date): Booking {
  const c = CLIENTS[spec.client % CLIENTS.length]
  const notes: string[] = []
  if (spec.birthday) notes.push('ДР-15%')
  if (spec.happy) notes.push('Счастливые часы -10%')
  if (spec.cert) notes.push(`EB-${spec.sim.toUpperCase()}-${spec.cert}`)

  let comment = spec.comment ?? ''
  if (spec.happy) comment = comment ? `${HAPPY_TAG}. ${comment}` : HAPPY_TAG

  const created = subDays(new Date(`${spec.date}T${spec.start}:00`), 3).toISOString()
  return {
    id: `demo-b-${idx}`,
    date: spec.date,
    startTime: spec.start,
    endTime: addMinutes(spec.start, spec.duration),
    durationMin: spec.duration,
    simulatorSlug: spec.sim,
    name: c.name,
    phone: c.phone,
    email: c.email,
    status: spec.status,
    paid: spec.paid,
    paymentMethod: spec.online ? 'ONLINE' : 'OFFLINE',
    comment,
    isBirthdayPromo: !!spec.birthday,
    birthdayDate: spec.birthday,
    certificateNumber: spec.cert,
    promoNote: notes.length ? notes.join(', ') : undefined,
    holdExpiresAt:
      spec.status === 'PENDING_CONFIRMATION'
        ? new Date(now.getTime() + (spec.holdMinutes ?? 60 * 24 * 7) * 60_000).toISOString()
        : undefined,
    createdAt: created,
    updatedAt: created,
  }
}

/** Сегодня: каждый статус, оба тренажёра, все варианты оплаты и акций. */
function todaySpecs(today: string, base: Date): BookingSpec[] {
  const specs: BookingSpec[] = [
    { date: today, start: '12:00', duration: 30, sim: B737, status: 'DONE', paid: true, online: true, client: 0, comment: 'Будем с ребёнком' },
    { date: today, start: '13:00', duration: 60, sim: B737, status: 'DONE', paid: true, client: 1, cert: '111101' },
    { date: today, start: '14:30', duration: 30, sim: B737, status: 'IN_PROGRESS', paid: true, client: 2, happy: true },
    { date: today, start: '15:30', duration: 90, sim: B737, status: 'CONFIRMED', paid: false, client: 3, comment: 'Подарок мужу на годовщину' },
    { date: today, start: '17:30', duration: 30, sim: B737, status: 'PENDING_CONFIRMATION', paid: false, online: true, client: 4, holdMinutes: 60 * 24 * 3 },
    { date: today, start: '18:30', duration: 30, sim: B737, status: 'CANCELLED', paid: false, client: 5, comment: 'Клиент перенёс на следующую неделю' },
    { date: today, start: '19:00', duration: 120, sim: B737, status: 'WAITING', paid: true, online: true, client: 6, birthday: '15.' + today.slice(5, 7) + '.1990' },
    { date: today, start: '12:00', duration: 30, sim: MI2, status: 'EXPIRED', paid: false, online: true, client: 7, comment: 'Не подтвердил код из письма' },
    { date: today, start: '12:30', duration: 30, sim: MI2, status: 'DONE', paid: true, client: 8 },
    { date: today, start: '13:30', duration: 60, sim: MI2, status: 'IN_PROGRESS', paid: false, client: 9, happy: true, comment: 'Оплата на месте картой' },
    { date: today, start: '15:00', duration: 30, sim: MI2, status: 'CONFIRMED', paid: true, online: true, client: 10, cert: '111103' },
    { date: today, start: '16:00', duration: 60, sim: MI2, status: 'WAITING', paid: false, client: 11, birthday: '02.' + today.slice(5, 7) + '.1985' },
    { date: today, start: '18:00', duration: 30, sim: MI2, status: 'CANCELLED', paid: true, online: true, client: 0, comment: 'Возврат оплаты оформлен' },
    { date: today, start: '20:00', duration: 30, sim: MI2, status: 'PENDING_CONFIRMATION', paid: false, client: 1, holdMinutes: 60 * 24 * 3 },
  ]
  return isWeekendDay(base) ? specs.map((s) => ({ ...s, happy: false })) : specs
}

const SLOTS = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']
const DURATIONS = [30, 30, 30, 60, 60, 90]

function generatedSpecs(base: Date): BookingSpec[] {
  const rand = rng(737)
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]
  const specs: BookingSpec[] = []

  const addDay = (d: Date, past: boolean) => {
    if (isWeekendDay(d)) return
    const date = dk(d)
    for (const sim of [B737, MI2]) {
      const count = 1 + Math.floor(rand() * (past ? 4 : 3))
      const slots = [...SLOTS].sort(() => rand() - 0.5).slice(0, count).sort()
      let busyUntil = 0
      for (const start of slots) {
        const duration = sim === MI2 ? pick([30, 60]) : pick(DURATIONS)
        const startMin = Number(start.slice(0, 2)) * 60
        if (startMin < busyUntil || startMin + duration > 21 * 60) continue
        busyUntil = startMin + duration
        const r = rand()
        let status: BookingStatus
        if (past) status = r < 0.78 ? 'DONE' : r < 0.93 ? 'CANCELLED' : 'EXPIRED'
        else status = r < 0.6 ? 'CONFIRMED' : r < 0.85 ? 'WAITING' : r < 0.93 ? 'PENDING_CONFIRMATION' : 'CANCELLED'
        const promo = rand()
        const hour = Number(start.slice(0, 2))
        specs.push({
          date,
          start,
          duration,
          sim,
          status,
          paid: past ? status === 'DONE' || rand() < 0.3 : rand() < 0.45,
          online: rand() < 0.4,
          client: Math.floor(rand() * CLIENTS.length),
          comment: pick(COMMENTS),
          happy: promo < 0.15 && hour >= 12 && hour < 15,
          birthday: promo > 0.9 ? `${String(1 + Math.floor(rand() * 27)).padStart(2, '0')}.${format(d, 'MM')}.19${80 + Math.floor(rand() * 20)}` : undefined,
          cert: promo > 0.8 && promo <= 0.9 ? String(111100 + Math.floor(rand() * 10)) : undefined,
        })
      }
    }
  }

  for (let i = 60; i >= 1; i--) addDay(subDays(base, i), true)
  for (let i = 1; i <= 30; i++) addDay(addDays(base, i), false)
  return specs
}

function demoUsers(): User[] {
  return [
    { id: 'u-admin', login: 'admin', password: 'admin123', fullName: 'Тимофей', phone: '+375 29 713 10 01', role: 'ADMIN', isActive: true, color: '#16a34a', pilotSimulators: [] },
    { id: 'u-manager', login: 'manager', password: 'manager123', fullName: 'Иван Менеджеров', phone: '+375 (12) 1234567', role: 'MANAGER', isActive: true, color: '#2563eb', pilotSimulators: [] },
    { id: 'u-manager-2', login: 'manager_olga', password: 'olga123', fullName: 'Ольга Администраторова', phone: '+375 29 555 44 33', role: 'MANAGER', isActive: false, color: '#9333ea', pilotSimulators: [] },
    { id: 'u-pilot-b737', login: 'pilot_b737', password: 'pilot737', fullName: 'Николай', phone: '+375 (12) 1111111', role: 'PILOT', isActive: true, color: '#0891b2', pilotSimulators: [B737] },
    { id: 'u-pilot-mi2', login: 'pilot_mi2', password: 'pilotmi2', fullName: 'Валентин', phone: '+375 (12) 2222222', role: 'PILOT', isActive: true, color: '#ea580c', pilotSimulators: [MI2] },
    { id: 'u-pilot-both', login: 'pilot_universal', password: 'pilotboth', fullName: 'Андрей Универсалов', phone: '+375 33 321 21 21', role: 'PILOT', isActive: true, color: '#db2777', pilotSimulators: [B737, MI2] },
    { id: 'u-pilot-old', login: 'pilot_retired', password: 'retired', fullName: 'Степан (уволен)', phone: '+375 44 000 00 01', role: 'PILOT', isActive: false, color: '#64748b', pilotSimulators: [B737] },
  ]
}

function demoCertificates(base: Date, nowIso: string): Certificate[] {
  const d = (n: number) => dk(addDays(base, n))
  const rows: Omit<Certificate, 'id' | 'createdAt'>[] = [
    { number: '№111100', phone: '+375 29 123-45-67', fullName: 'Никита Швепс', durationMin: 30, paymentStatus: 'PAID', paymentMethod: 'ONLINE', validFrom: d(-10), validTo: d(80), simulatorSlug: B737, status: 'ACTIVE', designColor: 'silver', comment: 'Оформлен на сайте' },
    { number: '№111101', phone: '+375 33 765-43-21', fullName: 'Мария Лебедева', durationMin: 60, paymentStatus: 'PAID', paymentMethod: 'ONLINE', validFrom: d(-60), validTo: d(30), simulatorSlug: B737, status: 'USED', designColor: 'turquoise', comment: 'Полёт выполнен сегодня' },
    { number: '№111102', phone: '+375 44 555-12-34', fullName: 'Дмитрий Орлов', durationMin: 120, paymentStatus: 'PAID', paymentMethod: 'ONLINE', validFrom: d(-40), validTo: d(50), simulatorSlug: B737, status: 'PARTIAL', designColor: 'gold', comment: 'Использовано 60 из 120 минут' },
    { number: '№111103', phone: '+375 25 303-40-50', fullName: 'Алексей Фёдоров', durationMin: 30, paymentStatus: 'PAID', paymentMethod: 'OFFLINE', validFrom: d(-5), validTo: d(85), simulatorSlug: MI2, status: 'ACTIVE', designColor: 'coral', comment: 'Оформлен в офисе' },
    { number: '№111104', phone: '+375 29 222-33-44', fullName: 'Анна Морозова', durationMin: 60, paymentStatus: 'PAID', paymentMethod: 'ONLINE', validFrom: d(0), validTo: d(5), simulatorSlug: MI2, status: 'ACTIVE', designColor: 'emerald', comment: 'Оплачен на сайте, скоро истекает' },
    { number: '№111105', phone: '+375 33 444-55-66', fullName: 'Игорь Волков', durationMin: 60, paymentStatus: 'PAID', paymentMethod: 'ONLINE', validFrom: d(-200), validTo: d(-20), simulatorSlug: B737, status: 'EXPIRED', designColor: 'navy', comment: 'Не воспользовался вовремя' },
    { number: '№111106', phone: '+48 512 345 678', fullName: 'Ольга Кузнецова', durationMin: 30, paymentStatus: 'PAID', paymentMethod: 'OFFLINE', validFrom: d(-15), validTo: d(75), simulatorSlug: MI2, status: 'CANCELLED', designColor: 'coral', comment: 'Отказ клиента' },
    { number: '№111107', phone: '+375 44 777-88-99', fullName: 'Сергей Павлов', durationMin: 60, paymentStatus: 'PAID', paymentMethod: 'ONLINE', validFrom: d(-3), validTo: d(87), simulatorSlug: 'combo', status: 'ACTIVE', designColor: 'lilac', comment: 'Комбо: 30 мин Boeing + 30 мин Ми-2, сайт' },
    { number: '№111108', phone: '+375 29 101-20-30', fullName: 'Наталья Семёнова', durationMin: 60, paymentStatus: 'PAID', paymentMethod: 'ONLINE', validFrom: d(-100), validTo: d(-1), simulatorSlug: 'combo', status: 'EXPIRED', designColor: 'lilac', comment: 'Истёк вчера' },
    { number: '№111109', phone: '+375 33 606-70-80', fullName: 'Виктория Белова', durationMin: 90, paymentStatus: 'PAID', paymentMethod: 'OFFLINE', validFrom: d(-30), validTo: d(20), simulatorSlug: B737, status: 'PARTIAL', designColor: 'gold', comment: 'Остаток 30 минут' },
    { number: '№111110', phone: '+375 25 900-11-22', fullName: 'Екатерина Соколова', durationMin: 30, paymentStatus: 'PAID', paymentMethod: 'ONLINE', validFrom: d(-120), validTo: d(-30), simulatorSlug: MI2, status: 'USED', designColor: 'emerald', comment: '' },
    { number: '№111111', phone: '+7 916 123-45-67', fullName: 'Павел Новиков', durationMin: 120, paymentStatus: 'PAID', paymentMethod: 'OFFLINE', validFrom: d(1), validTo: d(91), simulatorSlug: B737, status: 'ACTIVE', designColor: 'navy', comment: 'Корпоративный подарок, оформлен в офисе' },
  ]
  return rows.map((row, i) => ({ id: `demo-c-${i}`, createdAt: nowIso, ...row }))
}

function demoCalendar(base: Date): Record<string, CalendarDayStatus> {
  const cal: Record<string, CalendarDayStatus> = {}
  const nextWeekday = (from: number) => {
    let d = addDays(base, from)
    while (isWeekendDay(d)) d = addDays(d, 1)
    return d
  }
  cal[dk(nextWeekday(3))] = 'BLOCKED'
  cal[dk(nextWeekday(10))] = 'HOLIDAY'
  cal[dk(nextWeekday(17))] = 'BLOCKED'
  cal[dk(nextWeekday(24))] = 'BLOCKED'
  let sat = addDays(base, 1)
  while (getDay(sat) !== 6) sat = addDays(sat, 1)
  cal[dk(sat)] = 'OPEN'
  cal[dk(nextWeekday(-14))] = 'HOLIDAY'
  return cal
}

function demoShifts(base: Date, nowIso: string): StaffShift[] {
  const shifts: StaffShift[] = [
    {
      id: 'demo-s-highlight-b737',
      date: dk(addDays(base, 1)),
      userId: 'u-pilot-b737',
      simulatorSlug: B737,
      createdAt: nowIso,
    },
    {
      id: 'demo-s-highlight-mi2',
      date: dk(addDays(base, 2)),
      userId: 'u-pilot-mi2',
      simulatorSlug: MI2,
      createdAt: nowIso,
    },
    {
      id: 'demo-s-highlight-both',
      date: dk(addDays(base, 0)),
      userId: 'u-pilot-both',
      simulatorSlug: B737,
      createdAt: nowIso,
    },
  ]
  const start = startOfMonth(base)
  const end = addMonths(start, 2)
  let i = 100
  for (let d = start; d < end; d = addDays(d, 1)) {
    if (isWeekendDay(d)) continue
    const day = d.getDate()
    const date = dk(d)
    const push = (userId: string, simulatorSlug: string) =>
      shifts.push({ id: `demo-s-${i++}`, date, userId, simulatorSlug, createdAt: nowIso })
    push(day % 3 === 0 ? 'u-pilot-both' : 'u-pilot-b737', B737)
    push(day % 4 === 0 ? 'u-pilot-both' : 'u-pilot-mi2', MI2)
    if (day % 5 === 0) push('u-manager', B737)
  }
  return shifts
}

function demoWaiting(base: Date, nowIso: string): WaitingEntry[] {
  const rows: [number, string][] = [
    [0, 'Мария, +375 33 765-43-21 — хочет Boeing 737 на 60 минут, любое время после 17:00'],
    [0, 'Игорь, +375 33 444-55-66 — Ми-2, 30 минут, если кто-то отменит до 16:00'],
    [0, 'Семья Петровых, +375 29 888-77-66 — двое детей, Boeing, 30+30 минут'],
    [1, 'Ольга, +48 512 345 678 — сертификат №111107 (комбо), удобно утром'],
    [1, 'Сергей, +375 44 777-88-99 — Boeing 120 минут, день рождения'],
    [2, 'Анна, +375 29 222-33-44 — Ми-2 60 минут, «Счастливые часы»'],
    [-1, 'Дмитрий, +375 44 555-12-34 — записан, перенесён из листа ожидания'],
  ]
  return rows.map(([offset, line], i) => ({ id: `demo-w-${i}`, date: dk(addDays(base, offset)), line, createdAt: nowIso }))
}

function demoWorkHours(nowIso: string): WorkHourEntry[] {
  return [
    'Пн–Пт: 12:00 – 21:00',
    'Сб–Вс: выходной (работаем по предварительной записи)',
    'Счастливые часы: будни 12:00 – 15:00, скидка 10%',
    'Технический перерыв: 15:00 – 15:15',
    '31 декабря: сокращённый день до 17:00',
  ].map((line, i) => ({ id: `demo-wh-${i}`, line, createdAt: nowIso }))
}

function demoMaintenance(base: Date, nowIso: string): MaintenanceEntry[] {
  const d = (n: number) => dk(addDays(base, n))
  return [
    {
      id: 'demo-m-0',
      date: d(3),
      simulatorSlug: 'boeing-737',
      startTime: '12:00',
      endTime: '16:00',
      notes: 'Плановое ТО Boeing 737: калибровка штурвала (полдня)',
      createdAt: nowIso,
      plannedAt: addDays(base, 3).toISOString(),
    },
    {
      id: 'demo-m-1',
      date: d(17),
      simulatorSlug: 'mi-2',
      startTime: null,
      endTime: null,
      notes: 'Обновление ПО визуализации Ми-2 — весь день',
      createdAt: nowIso,
      plannedAt: addDays(base, 17).toISOString(),
    },
    {
      id: 'demo-m-2',
      date: d(10),
      simulatorSlug: null,
      startTime: null,
      endTime: null,
      notes: 'Полное закрытие зала: профилактика электрики',
      createdAt: nowIso,
      plannedAt: addDays(base, 10).toISOString(),
    },
    {
      id: 'demo-m-3',
      date: dk(subDays(base, 12)),
      simulatorSlug: 'boeing-737',
      startTime: null,
      endTime: null,
      notes: 'Замена проектора в кабине Boeing (выполнено)',
      createdAt: nowIso,
      plannedAt: subDays(base, 12).toISOString(),
    },
  ]
}

function demoNotifications(base: Date, now: Date): AdminNotification[] {
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString()
  const d = (n: number) => dk(addDays(base, n))
  return [
    {
      id: 'demo-n-0',
      kind: 'booking',
      title: 'Новая бронь с сайта',
      body: `Арсений Ковалёв · ${d(0)} 12:00 · Boeing 737 · 30 мин`,
      href: `/admin?date=${d(0)}&highlight=demo-b-0`,
      audienceRoles: ['ADMIN', 'MANAGER'],
      readBy: {},
      createdAt: ago(12),
      meta: { bookingId: 'demo-b-0', date: d(0) },
    },
    {
      id: 'demo-n-1',
      kind: 'certificate',
      title: 'Продан сертификат',
      body: '№111100 · Никита Швепс · 30 мин · на сайте',
      href: '/admin/certificates?highlight=demo-c-0',
      audienceRoles: ['ADMIN', 'MANAGER'],
      readBy: {},
      createdAt: ago(45),
      meta: { certificateId: 'demo-c-0' },
    },
    {
      id: 'demo-n-2',
      kind: 'maintenance',
      title: 'Запланировано ТО',
      body: `${d(3)} · Boeing 737 · 12:00–16:00 — калибровка штурвала`,
      href: '/admin/maintenance?highlight=demo-m-0',
      audienceRoles: ['ADMIN', 'MANAGER'],
      readBy: {},
      createdAt: ago(90),
      meta: { maintenanceId: 'demo-m-0' },
    },
    {
      id: 'demo-n-3',
      kind: 'staff_shift',
      title: 'Обновление графика персонала',
      body: `Николай · ${d(1)} · Boeing 737`,
      href: `/admin/staff-schedule?date=${d(1)}&highlight=demo-s-highlight-b737`,
      audienceRoles: ['ADMIN', 'MANAGER'],
      readBy: {},
      createdAt: ago(120),
      meta: { userId: 'u-pilot-b737', date: d(1), shiftId: 'demo-s-highlight-b737' },
    },
    {
      id: 'demo-n-4',
      kind: 'staff_shift',
      title: 'Вам назначена смена',
      body: `${d(1)} · Boeing 737`,
      href: `/admin/staff-schedule?date=${d(1)}&highlight=demo-s-highlight-b737`,
      audienceRoles: ['PILOT'],
      targetUserId: 'u-pilot-b737',
      readBy: {},
      createdAt: ago(120),
      meta: { shiftId: 'demo-s-highlight-b737', date: d(1) },
    },
    {
      id: 'demo-n-5',
      kind: 'staff_shift',
      title: 'Вам назначена смена',
      body: `${d(2)} · Ми-2`,
      href: `/admin/staff-schedule?date=${d(2)}&highlight=demo-s-highlight-mi2`,
      audienceRoles: ['PILOT'],
      targetUserId: 'u-pilot-mi2',
      readBy: {},
      createdAt: ago(180),
      meta: { shiftId: 'demo-s-highlight-mi2', date: d(2) },
    },
    {
      id: 'demo-n-6',
      kind: 'waiting_room',
      title: 'Зал ожидания',
      body: `${d(0)}: Мария хочет Boeing 737 на 60 минут после 17:00`,
      href: `/admin/waiting-room?date=${d(0)}&highlight=demo-w-0`,
      audienceRoles: ['ADMIN', 'MANAGER'],
      readBy: { 'u-admin': ago(30) },
      createdAt: ago(200),
      meta: { waitingId: 'demo-w-0', date: d(0) },
    },
    {
      id: 'demo-n-7',
      kind: 'feedback',
      title: 'Новая заявка обратной связи',
      body: 'Алина, +375 29 404-50-60 — групповой полёт на 5 человек',
      href: '/admin?highlight=demo-f-0',
      audienceRoles: ['ADMIN', 'MANAGER'],
      readBy: {},
      createdAt: ago(15),
      meta: { feedbackId: 'demo-f-0' },
    },
    {
      id: 'demo-n-8',
      kind: 'booking',
      title: 'Бронь подтверждена',
      body: `Мария Лебедева · ${d(0)} 13:00`,
      href: `/admin?date=${d(0)}&highlight=demo-b-1`,
      audienceRoles: ['ADMIN', 'MANAGER'],
      readBy: { 'u-manager': ago(10) },
      createdAt: ago(25),
      meta: { bookingId: 'demo-b-1', date: d(0) },
    },
    {
      id: 'demo-n-9',
      kind: 'calendar',
      title: 'Изменён статус дня',
      body: `${d(5)} → выходной`,
      href: '/admin/schedule-settings',
      audienceRoles: ['ADMIN', 'MANAGER'],
      readBy: {},
      createdAt: ago(300),
    },
    {
      id: 'demo-n-10',
      kind: 'staff_shift',
      title: 'Вам назначена смена',
      body: `${d(0)} · Boeing 737`,
      href: `/admin/staff-schedule?date=${d(0)}&highlight=demo-s-highlight-both`,
      audienceRoles: ['PILOT'],
      targetUserId: 'u-pilot-both',
      readBy: {},
      createdAt: ago(60),
      meta: { shiftId: 'demo-s-highlight-both', date: d(0) },
    },
  ]
}

function demoFeedback(now: Date): FeedbackRequest[] {
  const rows: [number, string, string, string][] = [
    [15, 'Алина', '+375 29 404-50-60', 'Перезвоните, пожалуйста, хочу узнать про групповой полёт на 5 человек'],
    [90, 'Виктор', '+375 33 909-80-70', ''],
    [60 * 26, 'Марина', '+7 925 111-22-33', 'Можно ли оплатить сертификат по безналу от юрлица?'],
    [60 * 72, 'Константин', '+375 44 123-00-99', 'Есть ли ограничения по возрасту для ребёнка 7 лет?'],
  ]
  return rows.map(([minutesAgo, name, phone, message], i) => ({
    id: `demo-f-${i}`,
    name,
    phone,
    message,
    createdAt: new Date(now.getTime() - minutesAgo * 60_000).toISOString(),
  }))
}

const PRIVACY_TEXT = `1. Общие положения
Настоящая политика определяет порядок обработки персональных данных клиентов авиатренажёрного центра «Авиатор».

2. Какие данные мы собираем
Имя, номер телефона, адрес электронной почты, дата рождения (для акции «День рождения»).

3. Цели обработки
Запись на полёт, подтверждение брони, оформление подарочных сертификатов, обратная связь.

4. Срок хранения
Данные хранятся не дольше, чем это необходимо для целей обработки.`

const OFFER_TEXT = `1. Предмет договора
Исполнитель оказывает услуги полёта на авиатренажёре, Заказчик оплачивает их в соответствии с прайсом.

2. Порядок бронирования
Бронь подтверждается кодом из письма. Неподтверждённая бронь снимается через 30 минут.

3. Отмена и перенос
Перенос возможен не позднее чем за 24 часа до полёта.

4. Сертификаты
Срок действия подарочного сертификата — 90 дней с даты оформления.`

export function createSeedStore(options: { demo?: boolean } = { demo: true }): DataStore {
  const now = new Date()
  const nowIso = now.toISOString()
  const base = startOfDay(now)
  const today = dk(base)
  const demo = options.demo !== false

  const bookings = demo
    ? [...todaySpecs(today, base), ...generatedSpecs(base)]
        // Ми-2: только 30 и 60 минут — как на странице «Цены»
        .filter((spec) => !(spec.sim === MI2 && spec.duration > 60))
        .map((spec, i) => makeBooking(spec, i, now))
    : []

  const maintenance = demo ? demoMaintenance(base, nowIso) : []
  const calendar = demo ? demoCalendar(base) : {}
  // Полный день ТО на весь зал → дата закрыта на сайте
  for (const m of maintenance) {
    if (!m.simulatorSlug && !m.startTime && !m.endTime) {
      calendar[m.date] = 'BLOCKED'
    }
  }

  return {
    version: 1,
    users: demo ? demoUsers() : demoUsers().filter((u) => ['u-admin', 'u-manager', 'u-pilot-b737', 'u-pilot-mi2'].includes(u.id)),
    bookings,
    calendar,
    staffShifts: demo ? demoShifts(base, nowIso) : [],
    certificates: demo
      ? demoCertificates(base, nowIso).filter(
          (c) => !(c.simulatorSlug === MI2 && c.durationMin > 60) && !(c.simulatorSlug === 'combo' && c.durationMin !== 60),
        )
      : [],
    waitingRoom: demo ? demoWaiting(base, nowIso) : [],
    flightPrices: FLIGHT_PRICES.map((p, i) => ({ id: `fp-${i + 1}`, ...p })),
    certPrices: [...FLIGHT_PRICES, COMBO_CERT_PRICE].map((p, i) => ({ id: `cp-${i + 1}`, ...p })),
    promos: [
      { id: 'pr-1', name: 'День рождения', discountPercent: 15, startDate: dk(subDays(base, 365)), endDate: dk(addDays(base, 365)), productType: 'Boeing 737, Ми-2', promoType: 'BIRTHDAY', active: true },
      { id: 'pr-2', name: 'Счастливые часы', discountPercent: 10, startDate: dk(subDays(base, 365)), endDate: dk(addDays(base, 365)), productType: 'Boeing 737, Ми-2', promoType: 'HAPPY_HOURS', active: true },
    ],
    documents: [
      { key: 'privacy', title: 'Политика конфиденциальности', content: demo ? PRIVACY_TEXT : '' },
      { key: 'offer', title: 'Договор оферты', content: demo ? OFFER_TEXT : '' },
    ],
    contacts: {
      phone: '+375 29 713 10 01',
      email: 'aviator@737.by',
      hours: 'С 12.00 до 22.00 ежедневно',
    },
    gallery: {
      [B737]: demo
        ? ['/assets/simulator/boeing_737.webp', '/assets/simulator/photo_sm_1.webp', '/assets/simulator/photo_sm_2.webp', '/assets/simulator/photo_sm_3.webp']
        : [],
      [MI2]: demo
        ? ['/assets/simulator/mi_2.webp', '/assets/simulator/photo_sm_mi2_1.png', '/assets/simulator/photo_sm_mi2_2.png', '/assets/simulator/photo_sm_mi2_3.png']
        : [],
      'summer-school': demo ? ['/assets/simulator/school.webp', '/assets/simulator/sm_1.webp', '/assets/simulator/sm_2.webp'] : [],
    },
    workHours: demo ? demoWorkHours(nowIso) : [],
    maintenance,
    optionLists: {
      duration: [
        { id: 'd-30', value: '30', label: '30 минут', sortOrder: 1 },
        { id: 'd-60', value: '60', label: '60 минут', sortOrder: 2 },
        { id: 'd-90', value: '90', label: '90 минут', sortOrder: 3 },
        { id: 'd-120', value: '120', label: '120 минут', sortOrder: 4 },
      ],
      simulator: [
        { id: 's-b737', value: B737, label: 'Boeing 737', sortOrder: 1 },
        { id: 's-mi2', value: MI2, label: 'Ми-2', sortOrder: 2 },
      ],
    },
    settings: { bookingWindowMonths: 12 },
    counters: { certificate: 111112 },
    pendingCodes: [],
    feedbackRequests: demo ? demoFeedback(now) : [],
    notifications: demo ? demoNotifications(base, now) : [],
    archive: [],
  }
}
