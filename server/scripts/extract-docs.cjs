const { readFileSync, writeFileSync } = require('fs')
const { join } = require('path')

const root = join(__dirname, '../../prod/src/pages')

function flatten(s) {
  return String(s)
    .replace(/\{' '\}/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extract(file) {
  const src = readFileSync(join(root, file), 'utf8')
  const m = src.match(/<LegalDocumentLayout title="([^"]+)">([\s\S]*?)<\/LegalDocumentLayout>/)
  if (!m) throw new Error('no match ' + file)
  const title = m[1]
  let body = m[2]
  body = body
    .replace(/<LegalH2>([\s\S]*?)<\/LegalH2>/g, (_, t) => `\n## ${flatten(t)}\n`)
    .replace(/<LegalH3>([\s\S]*?)<\/LegalH3>/g, (_, t) => `\n### ${flatten(t)}\n`)
    .replace(/<LegalP>([\s\S]*?)<\/LegalP>/g, (_, t) => `\n${flatten(t)}\n`)
    .replace(/<LegalUl>([\s\S]*?)<\/LegalUl>/g, (_, t) => `\n${t}\n`)
    .replace(/<LegalLi>([\s\S]*?)<\/LegalLi>/g, (_, t) => `- ${flatten(t)}\n`)
    .replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, (_, href, t) => {
      const text = flatten(t)
      return text === href ? href : `[${text}](${href})`
    })
  body = body.replace(/\{' '\}/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  return { title, content: body }
}

const docs = {
  rules: extract('RulesPage.tsx'),
  privacy: extract('PrivacyPage.tsx'),
  agreement: extract('AgreementPage.tsx'),
}

const outTs = join(__dirname, '../src/lib/default-documents.ts')
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')

const file = `/** Тексты юридических страниц по умолчанию (синхронизируются с сайтом через settings.documents). */
export type DefaultDocument = { key: string; title: string; content: string }

export const DEFAULT_DOCUMENTS: DefaultDocument[] = [
  {
    key: 'rules',
    title: \`${esc(docs.rules.title)}\`,
    content: \`${esc(docs.rules.content)}\`,
  },
  {
    key: 'privacy',
    title: \`${esc(docs.privacy.title)}\`,
    content: \`${esc(docs.privacy.content)}\`,
  },
  {
    key: 'agreement',
    title: \`${esc(docs.agreement.title)}\`,
    content: \`${esc(docs.agreement.content)}\`,
  },
]

export function defaultDocumentByKey(key: string): DefaultDocument | undefined {
  const normalized = key === 'offer' ? 'agreement' : key
  return DEFAULT_DOCUMENTS.find((d) => d.key === normalized)
}
`
writeFileSync(outTs, file, 'utf8')
console.log(
  Object.fromEntries(
    Object.entries(docs).map(([k, v]) => [k, { title: v.title, len: v.content.length }]),
  ),
)
