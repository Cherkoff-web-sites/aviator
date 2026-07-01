import {
  CertificateStatus,
  PaymentStatus,
  PrismaClient,
  PromoType,
  UserRole,
} from '@prisma/client'
import { addDays, startOfDay } from 'date-fns'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function hash(password: string) {
  return bcrypt.hash(password, 10)
}

async function main() {
  const adminPass = await hash('admin123')
  const managerPass = await hash('manager123')
  const pilotPass = await hash('pilot123')

  await prisma.user.upsert({
    where: { login: 'admin' },
    update: {},
    create: {
      login: 'admin',
      passwordHash: adminPass,
      role: UserRole.ADMIN,
      fullName: 'Тимофей Админ',
      email: 'admin@737.by',
      phone: '+375 29 713 10 01',
    },
  })

  await prisma.user.upsert({
    where: { login: 'admin2' },
    update: {},
    create: {
      login: 'admin2',
      passwordHash: adminPass,
      role: UserRole.ADMIN,
      fullName: 'Админ 2',
      email: 'admin@737.by',
    },
  })

  await prisma.user.upsert({
    where: { login: 'manager' },
    update: {},
    create: {
      login: 'manager',
      passwordHash: managerPass,
      role: UserRole.MANAGER,
      fullName: 'Менеджер Иван',
      phone: '+375 (12) 1234567',
    },
  })

  await prisma.user.upsert({
    where: { login: 'pilot_b737' },
    update: {},
    create: {
      login: 'pilot_b737',
      passwordHash: pilotPass,
      role: UserRole.PILOT,
      fullName: 'Николай',
      color: '#2563eb',
      pilotSimulators: ['boeing-737'],
    },
  })

  await prisma.user.upsert({
    where: { login: 'pilot_mi2' },
    update: {},
    create: {
      login: 'pilot_mi2',
      passwordHash: pilotPass,
      role: UserRole.PILOT,
      fullName: 'Валентин',
      color: '#ea580c',
      pilotSimulators: ['mi-2'],
    },
  })

  const flightPrices = [
    { durationMin: 30, simulatorSlug: 'mi-2', priceByn: 170, sortOrder: 1 },
    { durationMin: 30, simulatorSlug: 'boeing-737', priceByn: 170, sortOrder: 1 },
    { durationMin: 60, simulatorSlug: 'mi-2', priceByn: 300, sortOrder: 2 },
    { durationMin: 60, simulatorSlug: 'boeing-737', priceByn: 300, sortOrder: 2 },
    { durationMin: 90, simulatorSlug: 'boeing-737', priceByn: 400, sortOrder: 3 },
    { durationMin: 120, simulatorSlug: 'boeing-737', priceByn: 450, sortOrder: 4 },
  ]

  for (const p of flightPrices) {
    await prisma.flightPrice.upsert({
      where: {
        durationMin_simulatorSlug: {
          durationMin: p.durationMin,
          simulatorSlug: p.simulatorSlug,
        },
      },
      update: { priceByn: p.priceByn },
      create: p,
    })
  }

  await prisma.promo.createMany({
    skipDuplicates: true,
    data: [
      {
        name: 'День рождения',
        discountPercent: 15,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2027-12-31'),
        productType: 'Boeing',
        promoType: PromoType.BIRTHDAY,
      },
      {
        name: 'Счастливые часы',
        discountPercent: 10,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2027-12-31'),
        productType: 'Ми-2',
        promoType: PromoType.HAPPY_HOURS,
      },
    ],
  })

  await prisma.settingDocument.createMany({
    skipDuplicates: true,
    data: [
      { key: 'privacy', title: 'Политика конфиденциальности', content: '' },
      { key: 'offer', title: 'Договор оферты', content: '' },
    ],
  })

  await prisma.settingContact.deleteMany()
  await prisma.settingContact.create({
    data: {
      phone: '+375 (12) 1234567',
      email: 'info@gmail.com',
      hours: '12:00 - 21:00 по мск',
    },
  })

  await prisma.siteSetting.upsert({
    where: { key: 'booking_window_months' },
    update: {},
    create: { key: 'booking_window_months', value: '3' },
  })

  const today = startOfDay(new Date())
  await prisma.booking.createMany({
    data: [
      {
        date: today,
        startTime: '12:00',
        endTime: '12:30',
        durationMin: 30,
        simulatorSlug: 'boeing-737',
        name: 'Арсений',
        phone: '+375 (12) 1234567',
        email: 'client1@example.com',
        status: 'CONFIRMED',
        paid: false,
        paymentMethod: 'OFFLINE',
        comment: 'Будем с ребенком',
      },
      {
        date: today,
        startTime: '13:00',
        endTime: '13:45',
        durationMin: 45,
        simulatorSlug: 'mi-2',
        name: 'Никита',
        phone: '+375 (12) 1234567',
        email: 'client2@example.com',
        status: 'DONE',
        paid: false,
        paymentMethod: 'OFFLINE',
        comment: 'Подарок жене',
      },
    ],
  })

  await prisma.certificate.createMany({
    data: [
      {
        number: '№111111',
        phone: '+375 (12) 1234567',
        fullName: 'Никита Швепс',
        durationMin: 30,
        paymentStatus: PaymentStatus.PAID,
        validFrom: today,
        validTo: addDays(today, 90),
        simulatorSlug: 'boeing-737',
        status: CertificateStatus.ACTIVE,
        comment: 'Придут с ребенком',
      },
    ],
  })

  await prisma.optionListItem.createMany({
    skipDuplicates: true,
    data: [
      { category: 'duration', value: '30', label: '30 минут', sortOrder: 1 },
      { category: 'duration', value: '60', label: '60 минут', sortOrder: 2 },
      { category: 'duration', value: '90', label: '90 минут', sortOrder: 3 },
      { category: 'duration', value: '120', label: '120 минут', sortOrder: 4 },
      { category: 'simulator', value: 'boeing-737', label: 'Boeing 737', sortOrder: 1 },
      { category: 'simulator', value: 'mi-2', label: 'Ми-2', sortOrder: 2 },
    ],
  })

  console.log('Seed complete')
  console.log('Admin: admin / admin123, admin2 / admin123')
  console.log('Manager: manager / manager123')
  console.log('Pilots: pilot_b737 / pilot123, pilot_mi2 / pilot123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
