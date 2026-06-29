import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAdminAuth } from '@/contexts/AdminAuthContext'

export default function AdminLoginPage() {
  const { login, verifyCode, pendingUserId, loading } = useAdminAuth()
  const navigate = useNavigate()
  const [loginName, setLoginName] = React.useState('admin')
  const [password, setPassword] = React.useState('admin123')
  const [code, setCode] = React.useState('')
  const [error, setError] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const result = await login(loginName, password)
      if (result === 'OK') navigate('/admin')
    } catch {
      setError('Неверный логин или пароль')
    } finally {
      setSubmitting(false)
    }
  }

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await verifyCode(code)
      navigate('/admin')
    } catch {
      setError('Неверный код. Попросите код у администратора.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold">Вход в админ-панель</h1>
        {!pendingUserId ? (
          <form onSubmit={onLogin} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Логин</label>
              <Input value={loginName} onChange={(e) => setLoginName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Пароль</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={submitting}>Войти</Button>
          </form>
        ) : (
          <form onSubmit={onVerify} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Код отправлен администратору — введите его.</p>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Код" maxLength={6} />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={submitting}>Подтвердить</Button>
          </form>
        )}
      </div>
    </div>
  )
}
