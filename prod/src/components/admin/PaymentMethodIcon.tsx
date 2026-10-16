import { cn } from '@/lib/utils'
import type { PaymentMethodValue } from '@/lib/admin-labels'
import { labelOf, PAYMENT_METHOD_OPTIONS } from '@/lib/admin-labels'

/** В таблицах: планета = На сайте, человечек = В офисе. */
export default function PaymentMethodIcon({
  method,
  className,
}: {
  method?: PaymentMethodValue | 'ONLINE' | 'OFFLINE' | null
  className?: string
}) {
  const value = method === 'ONLINE' ? 'ONLINE' : 'OFFLINE'
  const label = labelOf(PAYMENT_METHOD_OPTIONS, value)
  const emoji = value === 'ONLINE' ? '🌐' : '👤'

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex select-none items-center justify-center text-[1.05rem] leading-none',
        className,
      )}
    >
      {emoji}
    </span>
  )
}
