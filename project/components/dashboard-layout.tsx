"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "./theme-provider"
import { CommandPalette } from "./command-palette"
import { NotificationBell } from "./notification-bell"
import { useCommandPaletteStore } from "@/stores/command-palette-store"
import { UserButton } from "@clerk/nextjs"
import {
  Home,
  FolderOpen,
  Users,
  Settings,
  Moon,
  Sun,
  Menu,
  X,
  BarChart3,
  Calendar,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Projects", href: "/projects", icon: FolderOpen },
  { name: "Team", href: "/team", icon: Users },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Desktop-only icon-rail collapse — mobile always uses the full drawer
  // width regardless of this, via the `lg:` prefix on every class it drives.
  const [collapsed, setCollapsed] = useState(false)
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const openCommandPalette = useCommandPaletteStore((s) => s.open)

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — flush against the edge, flat, single hairline border.
          No floating tile, no blur, no shadow: a plain panel that sits
          directly on the page like Claude's sidebar. */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 ${collapsed ? "lg:w-[68px]" : "lg:w-60"}
         bg-surface dark:bg-surface-dark border-r border-line dark:border-line-dark
          transform transition-all duration-200 ease-in-out lg:translate-x-0
           ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Brand row — when collapsed, the toggle moves to the left of the
            logo instead of sitting pinned against the right edge. */}
        <div
          className={`flex items-center justify-between h-14 shrink-0 px-3 border-b border-line dark:border-line-dark ${
            collapsed ? "lg:justify-start lg:gap-1.5" : ""
          }`}
        >
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={`hidden lg:flex p-1.5 rounded-md hover:bg-paper dark:hover:bg-paper-dark text-slate dark:text-slate-dark shrink-0 ${
              collapsed ? "lg:order-first" : "lg:order-last"
            }`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          <Link href="/" className="flex items-center gap-2 min-w-0 overflow-hidden">
            <span className="h-6 w-6 rounded-md bg-primary shrink-0" />
            <span
              className={`text-base font-semibold text-ink dark:text-paper truncate ${collapsed ? "lg:hidden" : ""}`}
            >
              WIP
            </span>
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-md hover:bg-paper dark:hover:bg-paper-dark text-slate dark:text-slate-dark shrink-0"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search trigger — opens the command palette (click or ⌘K/Ctrl+K
            from anywhere). Styled like a disabled search input rather than
            a nav row so it reads as "type here", not "go here". */}
        <div className={`px-2.5 pt-2.5 ${collapsed ? "lg:px-1.5" : ""}`}>
          <button
            onClick={openCommandPalette}
            title="Search (⌘K)"
            className={`flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-sm text-slate dark:text-slate-dark border border-line dark:border-line-dark hover:bg-paper dark:hover:bg-paper-dark transition-colors ${
              collapsed ? "lg:justify-center lg:px-0" : ""
            }`}
          >
            <Search size={16} className="shrink-0" />
            <span className={`truncate ${collapsed ? "lg:hidden" : ""}`}>Search</span>
            <kbd
              className={`ml-auto hidden lg:inline-block shrink-0 text-[10px] border border-line dark:border-line-dark rounded px-1 py-0.5 ${
                collapsed ? "lg:hidden" : ""
              }`}
            >
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Nav — plain rows, active item gets a quiet fill, nothing else does */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3">
          <ul className="space-y-0.5">
            {navigation.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(`${item.href}/`)
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-slate dark:text-slate-dark hover:bg-paper dark:hover:bg-paper-dark hover:text-ink dark:hover:text-paper"
                    }`}
                  >
                    <item.icon size={18} className="shrink-0" />
                    <span className={`truncate ${collapsed ? "lg:hidden" : ""}`}>{item.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Account row — pinned to the bottom, like Claude's sidebar */}
        <div
          className={`shrink-0 border-t border-line dark:border-line-dark p-2.5 flex items-center justify-between ${
            collapsed ? "lg:flex-col lg:justify-center lg:gap-2" : ""
          }`}
        >
          <div className="flex items-center gap-1">
            <UserButton />
            <NotificationBell dropdownPosition="bottom" />
          </div>
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="p-2 rounded-md text-slate dark:text-slate-dark hover:bg-paper dark:hover:bg-paper-dark transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
          </button>
        </div>
      </div>

      {/* Main content, offset to clear the flush sidebar */}
      <div className={`transition-all duration-200 ${collapsed ? "lg:pl-[68px]" : "lg:pl-60"}`}>
        {/* Mobile-only top bar: just the drawer trigger. No persistent
            desktop chrome — content starts right under the sidebar. */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-line dark:border-line-dark lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-md hover:bg-paper dark:hover:bg-paper-dark text-slate dark:text-slate-dark"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center -mr-2">
            <NotificationBell dropdownPosition="top" />
            <button
              onClick={openCommandPalette}
              className="p-2 rounded-md hover:bg-paper dark:hover:bg-paper-dark text-slate dark:text-slate-dark"
              aria-label="Search"
            >
              <Search size={19} />
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="py-4 px-4 sm:px-6">{children}</main>
      </div>

      <CommandPalette />
    </div>
  )
}