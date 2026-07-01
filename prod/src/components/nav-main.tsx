import { NavLink, useLocation } from 'react-router-dom'

import type { AdminNavMainItem } from '@/data/adminNav'
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

function navItemIsActive(pathname: string, to: string) {
  if (to === '/admin') return pathname === '/admin' || pathname === '/admin/'
  return pathname === to
}

export function NavMain({ items }: { items: AdminNavMainItem[] }) {
  const { pathname } = useLocation()

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.to}>
            <SidebarMenuButton
              asChild
              isActive={navItemIsActive(pathname, item.to)}
              tooltip={item.title}
            >
              <NavLink to={item.to} end={item.to === '/admin'}>
                <span
                  className="flex size-4 shrink-0 items-center justify-center"
                  data-admin-nav={item.iconSlot}
                  aria-hidden
                >
                  <img
                    src={item.iconSrc}
                    alt=""
                    className="size-4 object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <span>{item.title}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
