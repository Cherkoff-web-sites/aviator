import * as React from 'react'
import { Undo2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

export type UndoAction = {
  label: string
  run: () => Promise<void>
}

type UndoState = {
  action: UndoAction | null
  pushUndo: (action: UndoAction) => void
  clearUndo: () => void
  undo: () => Promise<void>
  undoing: boolean
}

const AdminUndoContext = React.createContext<UndoState | null>(null)

const UNDO_TTL_MS = 60_000

export function AdminUndoProvider({ children }: { children: React.ReactNode }) {
  const [action, setAction] = React.useState<UndoAction | null>(null)
  const [undoing, setUndoing] = React.useState(false)
  const timerRef = React.useRef<number | null>(null)

  const clearUndo = React.useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = null
    setAction(null)
  }, [])

  const pushUndo = React.useCallback(
    (next: UndoAction) => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
      setAction(next)
      timerRef.current = window.setTimeout(() => {
        setAction(null)
        timerRef.current = null
      }, UNDO_TTL_MS)
    },
    [],
  )

  const undo = React.useCallback(async () => {
    if (!action || undoing) return
    setUndoing(true)
    try {
      await action.run()
      clearUndo()
    } finally {
      setUndoing(false)
    }
  }, [action, undoing, clearUndo])

  React.useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
  }, [])

  const value = React.useMemo(
    () => ({ action, pushUndo, clearUndo, undo, undoing }),
    [action, pushUndo, clearUndo, undo, undoing],
  )

  return <AdminUndoContext.Provider value={value}>{children}</AdminUndoContext.Provider>
}

export function useAdminUndo() {
  const ctx = React.useContext(AdminUndoContext)
  if (!ctx) throw new Error('useAdminUndo requires AdminUndoProvider')
  return ctx
}

/** Кнопка в шапке: отменить последнее действие. */
export function AdminUndoButton() {
  const { action, undo, undoing } = useAdminUndo()
  if (!action) return null

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="ml-auto h-9 shrink-0 gap-2 border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100 dark:hover:bg-amber-950"
      onClick={() => void undo()}
      disabled={undoing}
      title={action.label}
    >
      <Undo2 className="size-4 shrink-0" />
      <span className="max-w-[220px] truncate text-left">
        {undoing ? 'Отмена…' : 'Отменить прошлое действие'}
      </span>
    </Button>
  )
}
