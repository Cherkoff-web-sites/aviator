import { DEFAULT_DOCUMENTS, defaultDocumentByKey } from './default-documents.js'

export type StoreDocument = { key: string; title: string; content: string }

const PUBLIC_KEYS = ['rules', 'privacy', 'agreement'] as const

/** Старые короткие демо-заглушки — заменяем полным текстом страниц. */
function looksLikeStub(content: string): boolean {
  const t = content.trim()
  if (!t) return true
  if (t.length < 400) return true
  if (t.startsWith('1. Общие положения') && t.includes('авиатренажёрного центра «Авиатор»') && t.length < 800) {
    return true
  }
  if (t.startsWith('1. Предмет договора') && t.includes('Исполнитель оказывает услуги полёта') && t.length < 800) {
    return true
  }
  return false
}

/** Гарантирует rules / privacy / agreement с полным текстом по умолчанию. */
export function normalizeDocuments(raw: unknown): StoreDocument[] {
  const list = Array.isArray(raw) ? [...(raw as StoreDocument[])] : []
  const byKey = new Map<string, StoreDocument>()

  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    let key = String((item as StoreDocument).key ?? '').trim()
    if (!key) continue
    if (key === 'offer') key = 'agreement'
    const title = String((item as StoreDocument).title ?? '').trim()
    const content = String((item as StoreDocument).content ?? '')
    const prev = byKey.get(key)
    // Предпочитаем более длинный контент (полный текст vs stub)
    if (!prev || content.length >= (prev.content?.length ?? 0)) {
      byKey.set(key, { key, title: title || prev?.title || key, content })
    }
  }

  for (const key of PUBLIC_KEYS) {
    const def = defaultDocumentByKey(key)!
    const cur = byKey.get(key)
    if (!cur) {
      byKey.set(key, { ...def })
      continue
    }
    if (looksLikeStub(cur.content)) {
      byKey.set(key, {
        key,
        title: cur.title?.trim() || def.title,
        content: def.content,
      })
    } else if (!cur.title?.trim()) {
      byKey.set(key, { ...cur, title: def.title })
    }
  }

  // Публичный порядок + прочие кастомные ключи в конце
  const ordered: StoreDocument[] = PUBLIC_KEYS.map((k) => byKey.get(k)!)
  for (const [key, doc] of byKey) {
    if (!(PUBLIC_KEYS as readonly string[]).includes(key)) ordered.push(doc)
  }
  return ordered
}

export function getDocument(docs: StoreDocument[], key: string): StoreDocument | undefined {
  const normalized = key === 'offer' ? 'agreement' : key
  return docs.find((d) => d.key === normalized) ?? defaultDocumentByKey(normalized)
}

export { DEFAULT_DOCUMENTS }
