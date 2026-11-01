import type { DataStore } from '../types.js'
import { newId } from './store.js'

export type AppLogLevel = 'info' | 'warn' | 'error'

const MAX_LOGS = 500

export function pushLog(
  store: DataStore,
  entry: {
    level?: AppLogLevel
    message: string
    context?: string
    meta?: Record<string, string>
  },
) {
  if (!Array.isArray(store.appLogs)) store.appLogs = []
  store.appLogs.unshift({
    id: newId(),
    level: entry.level ?? 'info',
    message: entry.message,
    context: entry.context,
    meta: entry.meta,
    createdAt: new Date().toISOString(),
  })
  if (store.appLogs.length > MAX_LOGS) {
    store.appLogs.length = MAX_LOGS
  }
}
