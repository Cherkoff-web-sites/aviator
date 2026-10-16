import * as React from 'react'
import { apiFetch } from '@/lib/api'

export type PublicContacts = {
  phone: string
  email: string
  hours: string
}

const FALLBACK: PublicContacts = {
  phone: '+375 29 713 10 01',
  email: 'aviator@737.by',
  hours: 'С 12.00 до 22.00 ежедневно',
}

let cache: PublicContacts | null = null
let inflight: Promise<PublicContacts> | null = null

async function loadContacts(): Promise<PublicContacts> {
  if (cache) return cache
  if (!inflight) {
    inflight = apiFetch<PublicContacts>('/api/public/contacts')
      .then((data) => {
        cache = {
          phone: data.phone?.trim() || FALLBACK.phone,
          email: data.email?.trim() || FALLBACK.email,
          hours: data.hours?.trim() || FALLBACK.hours,
        }
        return cache
      })
      .catch(() => FALLBACK)
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

export function phoneToTelHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, '')
  return `tel:${digits.startsWith('+') ? digits : `+${digits}`}`
}

export function usePublicContacts() {
  const [contacts, setContacts] = React.useState<PublicContacts>(cache ?? FALLBACK)

  React.useEffect(() => {
    let alive = true
    void loadContacts().then((c) => {
      if (alive) setContacts(c)
    })
    return () => {
      alive = false
    }
  }, [])

  return contacts
}
