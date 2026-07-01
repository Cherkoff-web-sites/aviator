import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import type { DataStore } from '../types.js'
import { createSeedStore } from './seed-data.js'

const __dir = dirname(fileURLToPath(import.meta.url))
export const STORE_PATH = process.env.STORE_PATH ?? join(__dir, '../../data/store.json')

let writeQueue: Promise<void> = Promise.resolve()

function ensureFile() {
  const dir = dirname(STORE_PATH)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  if (!existsSync(STORE_PATH)) {
    writeFileSync(STORE_PATH, JSON.stringify(createSeedStore(), null, 2), 'utf8')
  }
}

export function readStore(): DataStore {
  ensureFile()
  return JSON.parse(readFileSync(STORE_PATH, 'utf8')) as DataStore
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

export function newId() {
  return randomUUID()
}
