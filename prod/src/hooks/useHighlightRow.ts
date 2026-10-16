import * as React from 'react'
import { useSearchParams } from 'react-router-dom'

import { cn } from '@/lib/utils'

const HIGHLIGHT_CLASS =
  'bg-primary/10 ring-2 ring-inset ring-primary/50 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25)]'

/**
 * Подсветка строки по `?highlight=<id>` после перехода из уведомления.
 */
export function useHighlightRow(ready = true) {
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightId = searchParams.get('highlight')

  React.useEffect(() => {
    if (!highlightId || !ready) return
    const frame = window.requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-highlight-id="${CSS.escape(highlightId)}"]`,
      )
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    const timer = window.setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('highlight')
          return next
        },
        { replace: true },
      )
    }, 8000)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [highlightId, ready, setSearchParams])

  const rowProps = React.useCallback(
    (id: string, className?: string) => ({
      'data-highlight-id': id,
      className: cn(className, highlightId === id && HIGHLIGHT_CLASS),
    }),
    [highlightId],
  )

  return { highlightId, rowProps, isHighlighted: (id: string) => highlightId === id }
}
