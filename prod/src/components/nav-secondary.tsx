import * as React from 'react'
import { Link, useLocation } from 'react-router-dom'

import type { SecondaryNavItem } from '@/lib/admin-access'
import { cn } from '@/lib/utils'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export function NavSecondary({
  items,
  badges,
  ...props
}: {
  items: SecondaryNavItem[]
  badges?: Partial<Record<'feedback', number>>
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const { pathname } = useLocation()

  if (items.length === 0) return null

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const count = item.badgeKey ? (badges?.[item.badgeKey] ?? 0) : 0
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  asChild
                  size="sm"
                  isActive={pathname === item.url || pathname.startsWith(`${item.url}/`)}
                >
                  <Link to={item.url} className="flex items-center gap-2">
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
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    {count > 0 ? (
                      <span
                        className={cn(
                          'inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground',
                        )}
                      >
                        {count > 99 ? '99+' : count}
                      </span>
                    ) : null}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
