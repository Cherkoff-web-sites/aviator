import * as React from "react"
import { Link } from "react-router-dom"
import { Plane } from "lucide-react"

import { ADMIN_NAV_MAIN, ADMIN_NAV_SETTINGS_ICON } from "@/data/adminNav"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "Тимофей",
    email: "admin@aviator.local",
    avatar: "",
  },
  navSecondary: [
    {
      title: "Настройки",
      url: "/admin/settings",
      iconSrc: ADMIN_NAV_SETTINGS_ICON,
      iconSlot: "nav_settings",
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Plane className="size-4" aria-hidden />
                </div>
                <span className="min-w-0 flex-1 truncate text-left text-sm font-semibold leading-tight">
                  Aviator
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={ADMIN_NAV_MAIN} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
