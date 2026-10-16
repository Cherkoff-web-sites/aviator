import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '@/components/ui/button'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && !busy && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[220] bg-black/45" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[221] w-[min(calc(100vw-2rem),420px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background p-5 shadow-xl outline-none">
          <Dialog.Title className="text-base font-semibold text-foreground">{title}</Dialog.Title>
          {description ? (
            <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {description}
            </Dialog.Description>
          ) : null}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={destructive ? 'destructive' : 'default'}
              onClick={onConfirm}
              disabled={busy}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
