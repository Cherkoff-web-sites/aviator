import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const __dir = dirname(fileURLToPath(import.meta.url))

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? join(__dir, '../../data/uploads')

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

export function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })
}

/** Сохраняет data URL и возвращает публичный путь `/uploads/...`. */
export function saveDataUrlUpload(dataUrl: string): { url: string; filename: string } {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl.trim())
  if (!match) {
    throw new Error('Ожидается data URL вида data:image/...;base64,...')
  }
  const mime = match[1].toLowerCase()
  const ext = MIME_EXT[mime]
  if (!ext) {
    throw new Error(`Неподдерживаемый тип файла: ${mime}`)
  }
  const buf = Buffer.from(match[2], 'base64')
  if (buf.length > 40 * 1024 * 1024) {
    throw new Error('Файл слишком большой (макс. 40 МБ)')
  }
  ensureUploadDir()
  const filename = `${randomUUID()}${ext}`
  writeFileSync(join(UPLOAD_DIR, filename), buf)
  return { url: `/uploads/${filename}`, filename }
}
