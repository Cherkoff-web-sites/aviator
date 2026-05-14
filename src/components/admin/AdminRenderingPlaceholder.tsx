import { Loader2 } from 'lucide-react'

export default function AdminRenderingPlaceholder() {
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>Rendering</span>
      <Loader2
        className="size-4 shrink-0 animate-spin opacity-80"
        aria-hidden
      />
    </p>
  )
}
