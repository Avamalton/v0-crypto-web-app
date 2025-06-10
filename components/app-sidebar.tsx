"use client"

import type * as React from "react"
import { useAuth } from "@/components/auth-provider"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Home,
  TrendingUp,
  TrendingDown,
  Store,
  History,
  CreditCard,
  BarChart3,
  Settings,
  Coins,
  LogOut,
  UserCircleIcon,
  ChevronUp,
} from "lucide-react"
import Link from "next/link"

// Navigation data
const navigationData = {
  main: [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
    { title: "Market", url: "/market", icon: Store },
  ],
  trading: [
    { title: "Buy Crypto", url: "/buy", icon: TrendingUp },
    { title: "Sell Crypto", url: "/sell", icon: TrendingDown },
    { title: "Order History", url: "/orders", icon: History },
  ],
  support: [
    { title: "Payment Guide", url: "/payment-instructions", icon: CreditCard },
  ],
  user: [
    { title: "Your Profile", url: "/profile", icon: UserCircleIcon },
  ],
  admin: [
    { title: "Admin Panel", url: "/admin", icon: Settings },
    { title: "Market Ads", url: "/admin/market", icon: Store },
    { title: "Manage Tokens", url: "/admin/tokens", icon: Coins },
  ],
}

// Utility for rendering a group
const renderNavGroup = (
  label: string,
  items: typeof navigationData.main,
  isActive: (url: string) => boolean
) => (
  <SidebarGroup>
    <SidebarGroupLabel>{label}</SidebarGroupLabel>
    <SidebarGroupContent>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild isActive={isActive(item.url)}>
              <Link href={item.url}>
                <item.icon />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
)

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { user, userProfile, signOut } = useAuth()
  const pathname = usePathname()

  const isActive = (url: string) =>
    pathname === url || pathname.startsWith(`${url}/`)

  const getInitial = () =>
    userProfile?.username?.[0]?.toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    "U"

  return (
    <Sidebar variant="inset" {...props}>
      {/* Header */}
      <SidebarHeader>
        <div className="flex items-center space-x-3 px-3 py-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <Coins className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              CryptoTrade
            </h2>
            <p className="text-xs text-muted-foreground">Trading Platform</p>
          </div>
        </div>
      </SidebarHeader>

      {/* Content */}
      <SidebarContent>
        {renderNavGroup("Main", navigationData.main, isActive)}
        {renderNavGroup("Trading", navigationData.trading, isActive)}
        {renderNavGroup("Support", navigationData.support, isActive)}
        {renderNavGroup("Profile", navigationData.user, isActive)}

        {/* Admin only */}
        {userProfile?.is_admin && (
          <SidebarGroup>
            <SidebarGroupLabel>
              <div className="flex items-center space-x-2">
                <span>Admin</span>
                <Badge variant="secondary" className="text-xs">
                  Admin
                </Badge>
              </div>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationData.admin.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                      {getInitial()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {userProfile?.username || user?.email?.split("@")[0] || "User"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem onClick={signOut} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Optional rail (remove if unused) */}
      <SidebarRail />
    </Sidebar>
  )
}
