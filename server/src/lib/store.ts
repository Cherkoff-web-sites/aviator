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
  return raw
}

export function readStore(): DataStore {
  ensureFile()
  return normalizeStore(JSON.parse(readFileSync(STORE_PATH, 'utf8')) as DataStore)
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

/** Полностью заменяет базу демо-данными, рассчитанными от сегодняшнего дня. */
export async function resetStoreToDemo(): Promise<DataStore> {
  writeQueue = writeQueue.then(() => {
    backupStore()
    ensureFile()
    writeStore(createSeedStore({ demo: true }))
  })
  await writeQueue
  return readStore()
}

export function newId() {
  return randomUUID()
}
