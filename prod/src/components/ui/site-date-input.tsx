import * as React from 'react'

import { Input } from '@/components/ui/input'
import { isoToSiteDateDisplay, parseSiteDateToIso } from '@/lib/admin-date'
import { cn } from '@/lib/utils'

type SiteDateInputProps = Omit<
  React.ComponentProps<'input'>,
  'type' | 'value' | 'onChange' | 'defaultValue'
> & {
  /** Значение API: `yyyy-MM-dd` или пусто */
  value: string
  /** Колбэк с ISO `yyyy-MM-dd` (или '' если очистили / ещё не распарсили) */
  onValueChange: (iso: string) => void
}

/**
 * Поле даты: на экране всегда ДД.ММ.ГГГГ, в value наружу — ISO yyyy-MM-dd.
 */
export function SiteDateInput({
  value,
  onValueChange,
  className,
  placeholder = 'ДД.ММ.ГГГГ',
  onBlur,
  ...rest
}: SiteDateInputProps) {
  const [text, setText] = React.useState(() => isoToSiteDateDisplay(value))

  React.useEffect(() => {
    setText(isoToSiteDateDisplay(value))
  }, [value])

  return (
    <Input
      {...rest}
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      className={cn('tabular-nums', className)}
      value={text}
      onChange={(e) => {
        const next = e.target.value
        setText(next)
        const iso = parseSiteDateToIso(next)
        // Пока ввод неполный — не затираем сохранённый ISO пустой строкой
        if (iso) onValueChange(iso)
        else if (!next.trim()) onValueChange('')
      }}
      onBlur={(e) => {
        const iso = parseSiteDateToIso(text)
        if (iso) {
          setText(isoToSiteDateDisplay(iso))
          onValueChange(iso)
        } else if (!text.trim()) {
          setText('')
          onValueChange('')
        } else {
          // Невалидно — вернуть отображение из текущего ISO
          setText(isoToSiteDateDisplay(value))
        }
        onBlur?.(e)
      }}
    />
  )
}
