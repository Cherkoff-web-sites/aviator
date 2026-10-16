import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { createSeedStore } from '../lib/seed-data.js'
import { backupStore, STORE_PATH } from '../lib/store.js'

const demo = !process.argv.includes('--empty')
const store = createSeedStore({ demo })

mkdirSync(dirname(STORE_PATH), { recursive: true })
const backup = backupStore()
if (backup) console.log(`[seed] Предыдущая база сохранена в ${backup}`)
writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8')

console.log(
  `[seed] ${demo ? 'Демо-данные' : 'Пустая база'} записаны в ${STORE_PATH}: ` +
    `${store.bookings.length} броней, ${store.certificates.length} сертификатов, ` +
    `${store.staffShifts.length} смен, ${store.users.length} аккаунтов`,
)
