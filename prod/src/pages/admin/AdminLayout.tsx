import { useEffect, useMemo } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { AppSidebar } from '@/components/app-sidebar'
import { ADMIN_NAV_MAIN } from '@/data/adminNav'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { canAccessRoute } from '@/lib/admin-access'

function CloseMobileSidebarOnNavigate() {
  const { pathname } = useLocation()
  const { setOpenMobile, isMobile } = useSidebar()

  useEffect(() => {
    if (!isMobile) return
    setOpenMobile(false)
  }, [pathname, isMobile, setOpenMobile])

  return null
}

export default function AdminLayout() {
  const { pathname } = useLocation()
  const { session, loading } = useAdminAuth()

  const pageTitle = useMemo(() => {
    if (pathname === '/admin' || pathname === '/admin/') return 'Домашняя страница'
    if (pathname.startsWith('/admin/settings')) return 'Настройки'
    const hit = ADMIN_NAV_MAIN.find((i) => i.to === pathname)
    return hit?.title ?? 'Раздел'
  }, [pathname])

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />
  }

  if (!canAccessRoute(session.role, pathname)) {
    return <Navigate to="/admin" replace />
  }

  return (
    <SidebarProvider className="min-h-svh">
      <CloseMobileSidebarOnNavigate />
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <h1 className="min-w-0 truncate text-lg font-semibold leading-tight text-foreground">
            {pageTitle}
          </h1>
        </header>
        <div className="flex flex-1 flex-col gap-4 bg-muted/30 p-4 pt-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
