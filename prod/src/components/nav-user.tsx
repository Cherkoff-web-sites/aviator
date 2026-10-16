import { Archive, Bell, ChevronsUpDown, ExternalLink, LogOut, User } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { useLiveData } from '@/hooks/useLiveData'
import { canViewArchive } from '@/lib/admin-access'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()
  const { logout, role, user: authUser } = useAdminAuth()
  const navigate = useNavigate()

  const { data: notif } = useLiveData(
    () => apiFetch<{ unread: number }>('/api/admin/notifications'),
    [role, authUser?.id],
  )
  const unread = notif?.unread ?? 0

  const handleLogout = () => {
    logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {user.name.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              {unread > 0 ? (
                <span
                  className={cn(
                    'inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground',
                  )}
                >
                  {unread > 99 ? '99+' : unread}
                </span>
              ) : null}
              <ChevronsUpDown className="ml-auto size-4 shrink-0" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {user.name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem disabled>
                <User />
                Профиль
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/admin/notifications" className="flex cursor-pointer items-center gap-2">
                  <Bell />
                  <span className="flex-1">Уведомления</span>
                  {unread > 0 ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  ) : null}
                </Link>
              </DropdownMenuItem>
              {canViewArchive(role) ? (
                <DropdownMenuItem asChild>
                  <Link to="/admin/archive" className="flex cursor-pointer items-center gap-2">
                    <Archive />
                    Архив
                  </Link>
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/" className="flex cursor-pointer items-center gap-2">
                <ExternalLink />
                На сайт
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              Выйти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
