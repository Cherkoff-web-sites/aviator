import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  copyFileSync,
  readdirSync,
  unlinkSync,
} from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import type { DataStore } from '../types.js'
import { createSeedStore } from './seed-data.js'
import { normalizeDocuments } from './documents.js'
import { normalizeSiteImages } from './site-images.js'

const __dir = dirname(fileURLToPath(import.meta.url))
export const STORE_PATH = process.env.STORE_PATH ?? join(__dir, '../../data/store.json')

const MAX_BACKUPS = 5

let writeQueue: Promise<void> = Promise.resolve()

function ensureFile() {
  const dir = dirname(STORE_PATH)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  if (!existsSync(STORE_PATH)) {
    writeFileSync(STORE_PATH, JSON.stringify(createSeedStore(), null, 2), 'utf8')
  }
}

function normalizeStore(raw: DataStore): DataStore {
  if (Array.isArray(raw.users)) {
    for (const u of raw.users) {
      if (typeof u.password !== 'string') u.password = 'changeme'
      if (!Array.isArray(u.pilotSimulators)) u.pilotSimulators = []
    }
  }
  if (!Array.isArray(raw.archive)) raw.archive = []
  if (!Array.isArray(raw.appLogs)) raw.appLogs = []
  if (!Array.isArray(raw.pilotHours)) raw.pilotHours = []
  if (!raw.settings) raw.settings = { bookingWindowMonths: 12 }
  if (typeof raw.settings.bookingGapMin !== 'number') raw.settings.bookingGapMin = 15
  if (!raw.settings.footerSocialLinks) raw.settings.footerSocialLinks = {}
  if (!raw.optionLists || typeof raw.optionLists !== 'object') raw.optionLists = {}
  if (!Array.isArray(raw.optionLists.duration)) {
    raw.optionLists.duration = [
      { id: 'd-30', value: '30', label: '30 минут', sortOrder: 1 },
      { id: 'd-60', value: '60', label: '60 минут', sortOrder: 2 },
      { id: 'd-90', value: '90', label: '90 минут', sortOrder: 3 },
      { id: 'd-120', value: '120', label: '120 минут', sortOrder: 4 },
    ]
  }
  if (!Array.isArray(raw.optionLists.simulator)) {
    raw.optionLists.simulator = [
      { id: 's-b737', value: 'boeing-737', label: 'Boeing 737', sortOrder: 1 },
      { id: 's-mi2', value: 'mi-2', label: 'Ми-2', sortOrder: 2 },
    ]
  }
  if (!Array.isArray(raw.optionLists.cert_duration)) {
    raw.optionLists.cert_duration = raw.optionLists.duration.map((r, i) => ({
      ...r,
      id: `cd-${r.value || i}`,
    }))
  }
  if (!Array.isArray(raw.optionLists.cert_simulator)) {
    raw.optionLists.cert_simulator = [
      ...raw.optionLists.simulator.map((r) => ({ ...r, id: `cs-${r.value}` })),
      { id: 'cs-combo', value: 'combo', label: 'Boeing + Ми-2', sortOrder: 3 },
    ]
  }
  raw.siteImages = normalizeSiteImages(raw.siteImages)
  raw.documents = normalizeDocuments(raw.documents)
  return raw
}

export function readStore(): DataStore {
  ensureFile()
  const raw = JSON.parse(readFileSync(STORE_PATH, 'utf8')) as DataStore
  const beforeDocs = JSON.stringify(raw.documents ?? null)
  const store = normalizeStore(raw)
  // Один раз перезаписываем stub-документы полными текстами страниц
  if (JSON.stringify(store.documents) !== beforeDocs) {
    writeStore(store)
  }
  return store
}

export function writeStore(data: DataStore) {
  writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8')
}

export async function updateStore(mutator: (store: DataStore) => void): Promise<DataStore> {
  writeQueue = writeQueue.then(() => {
    const store = readStore()
    mutator(store)
    writeStore(store)
  })
  await writeQueue
  return readStore()
}

/** Копирует текущую базу в `store.backup-<время>.json` рядом с ней. */
export function backupStore(): string | null {
  if (!existsSync(STORE_PATH)) return null
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backup = STORE_PATH.replace(/\.json$/, `.backup-${stamp}.json`)
  copyFileSync(STORE_PATH, backup)
  const dir = dirname(STORE_PATH)
  const prefix = `${basename(STORE_PATH, '.json')}.backup-`
  const old = readdirSync(dir)
    .filter((f) => f.startsWith(prefix))
    .sort()
    .slice(0, -MAX_BACKUPS)
  for (const f of old) unlinkSync(join(dir, f))
  return backup
}

function isDemoId(id: string) {
  return id.startsWith('demo-')
}

/**
 * Заполняет демо-данными. Сохраняет настройки/цены/контакты/медиа/документы/пользователей.
 * Интервал между бронями берётся из settings.bookingGapMin.
 */
export async function fillDemoData(): Promise<DataStore> {
  writeQueue = writeQueue.then(() => {
    backupStore()
    const prev = readStore()
    const gapMin = typeof prev.settings?.bookingGapMin === 'number' ? prev.settings.bookingGapMin : 15
    const seeded = createSeedStore({ demo: true, bookingGapMin: gapMin })
    seeded.users = prev.users?.length ? prev.users : seeded.users
    seeded.settings = {
      ...seeded.settings,
      ...prev.settings,
      bookingGapMin: gapMin,
    }
    seeded.contacts = prev.contacts ?? seeded.contacts
    seeded.documents = prev.documents?.length ? prev.documents : seeded.documents
    seeded.siteImages = prev.siteImages ?? seeded.siteImages
    seeded.flightPrices = prev.flightPrices?.length ? prev.flightPrices : seeded.flightPrices
    seeded.certPrices = prev.certPrices?.length ? prev.certPrices : seeded.certPrices
    seeded.promos = prev.promos?.length ? prev.promos : seeded.promos
    seeded.optionLists = prev.optionLists ?? seeded.optionLists
    seeded.appLogs = prev.appLogs ?? []
    writeStore(seeded)
  })
  await writeQueue
  return readStore()
}

/** @deprecated Используйте fillDemoData */
export async function resetStoreToDemo(): Promise<DataStore> {
  return fillDemoData()
}

/**
 * Удаляет демо-записи (id с префиксом demo-), чтобы не смешивать со свежими данными.
 * Настройки, цены, пользователи и медиа не трогаются.
 */
export async function clearDemoData(): Promise<{
  removed: { bookings: number; certificates: number; staffShifts: number; other: number }
}> {
  let removed = { bookings: 0, certificates: 0, staffShifts: 0, other: 0 }
  writeQueue = writeQueue.then(() => {
    backupStore()
    const store = readStore()
    const beforeB = store.bookings.length
    const beforeC = store.certificates.length
    const beforeS = store.staffShifts.length
    store.bookings = store.bookings.filter((b) => !isDemoId(b.id))
    store.certificates = store.certificates.filter((c) => !isDemoId(c.id))
    store.staffShifts = store.staffShifts.filter((s) => !isDemoId(s.id))
    const beforeW = store.waitingRoom.length
    store.waitingRoom = store.waitingRoom.filter((w) => !isDemoId(w.id))
    const beforeM = store.maintenance.length
    store.maintenance = store.maintenance.filter((m) => !isDemoId(m.id))
    const beforeN = (store.notifications ?? []).length
    store.notifications = (store.notifications ?? []).filter((n) => !isDemoId(n.id))
    const beforeF = (store.feedbackRequests ?? []).length
    store.feedbackRequests = (store.feedbackRequests ?? []).filter((f) => !isDemoId(f.id))
    const beforeWh = store.workHours.length
    store.workHours = store.workHours.filter((w) => !isDemoId(w.id))
    removed = {
      bookings: beforeB - store.bookings.length,
      certificates: beforeC - store.certificates.length,
      staffShifts: beforeS - store.staffShifts.length,
      other:
        beforeW -
        store.waitingRoom.length +
        (beforeM - store.maintenance.length) +
        (beforeN - (store.notifications?.length ?? 0)) +
        (beforeF - (store.feedbackRequests?.length ?? 0)) +
        (beforeWh - store.workHours.length),
    }
    writeStore(store)
  })
  await writeQueue
  return { removed }
}

export function newId() {
  return randomUUID()
}
