import * as React from 'react'

const STORAGE_KEY = 'aviator_cookie_ok'

export default function CookieConsent() {
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] border-t border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground">
          Мы используем cookie для корректной работы сайта и улучшения сервиса. Продолжая пользоваться
          сайтом, вы соглашаетесь с{' '}
          <a href="/faq" className="font-medium text-primary underline-offset-2 hover:underline">
            политикой обработки данных
          </a>
          .
        </p>
        <button
          type="button"
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, '1')
            setVisible(false)
          }}
        >
          Принять
        </button>
      </div>
    </div>
  )
}
