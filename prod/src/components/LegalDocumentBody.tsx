import { Fragment, type ReactNode } from 'react'

import { LegalH2, LegalH3, LegalLi, LegalP, LegalUl } from './LegalDocumentLayout'

type Block =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }

function parseBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let para: string[] = []
  let list: string[] = []

  const flushPara = () => {
    if (!para.length) return
    const text = para.join(' ').trim()
    if (text) blocks.push({ type: 'p', text })
    para = []
  }
  const flushList = () => {
    if (!list.length) return
    blocks.push({ type: 'ul', items: list })
    list = []
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    const trimmed = line.trim()
    if (!trimmed) {
      flushList()
      flushPara()
      continue
    }
    if (trimmed.startsWith('## ')) {
      flushList()
      flushPara()
      blocks.push({ type: 'h2', text: trimmed.slice(3).trim() })
      continue
    }
    if (trimmed.startsWith('### ')) {
      flushList()
      flushPara()
      blocks.push({ type: 'h3', text: trimmed.slice(4).trim() })
      continue
    }
    if (trimmed.startsWith('- ')) {
      flushPara()
      list.push(trimmed.slice(2).trim())
      continue
    }
    flushList()
    para.push(trimmed)
  }
  flushList()
  flushPara()
  return blocks
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s]+)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    if (m[1] && m[2]) {
      nodes.push(
        <a key={`a-${i++}`} href={m[2]} className="text-[#4da3ff] underline-offset-2 hover:underline">
          {m[1]}
        </a>,
      )
    } else if (m[3]) {
      nodes.push(
        <a key={`a-${i++}`} href={m[3]} className="text-[#4da3ff] underline-offset-2 hover:underline">
          {m[3]}
        </a>,
      )
    }
    last = m.index + m[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

/** Рендер текста документа из настроек (## / ### / - списки / ссылки). */
function LegalDocumentBody({ content }: { content: string }) {
  const blocks = parseBlocks(content)
  return (
    <>
      {blocks.map((block, idx) => {
        if (block.type === 'h2') return <LegalH2 key={idx}>{renderInline(block.text)}</LegalH2>
        if (block.type === 'h3') return <LegalH3 key={idx}>{renderInline(block.text)}</LegalH3>
        if (block.type === 'ul') {
          return (
            <LegalUl key={idx}>
              {block.items.map((item, j) => (
                <LegalLi key={j}>{renderInline(item)}</LegalLi>
              ))}
            </LegalUl>
          )
        }
        return (
          <LegalP key={idx}>
            <Fragment>{renderInline(block.text)}</Fragment>
          </LegalP>
        )
      })}
    </>
  )
}

export default LegalDocumentBody

