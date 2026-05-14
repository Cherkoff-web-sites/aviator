import * as React from 'react'
import { Link, useLocation } from 'react-router-dom'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string
    url: string
    iconSrc: string
    iconSlot?: string
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const { pathname } = useLocation()

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                size="sm"
                isActive={pathname === item.url || pathname.startsWith(`${item.url}/`)}
              >
                <Link to={item.url}>
                  <span
                    className="flex size-4 shrink-0 items-center justify-center"
                    data-admin-nav={item.iconSlot ?? 'nav_settings'}
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
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
