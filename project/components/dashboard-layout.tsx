"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useTheme } from "./theme-provider"
import { UserButton } from "@clerk/nextjs"
import { Home, FolderOpen, Users, Settings, Moon, Sun, Menu, X, BarChart3, Calendar } from "lucide-react"

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
  const { theme, setTheme } = useTheme()

  return (
    <div className="relative min-h-screen overflow-hidden bg-lavender-50/60 dark:bg-outer_space-600">
      {/* Decorative gradient orbs — glass panels need something colorful
          behind them to actually show the frosted blur effect, otherwise
          backdrop-blur on a flat background is invisible. */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-gradient-to-br from-lavender-300/40 to-lavender-100/0 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-mint-300/30 to-mint-100/0 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-gradient-to-br from-lavender-200/30 to-transparent blur-3xl" />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 backdrop-blur-sm bg-black/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — flush drawer on mobile, floating "pixel" tile on desktop:
          chunky rounded corners + a crisp, un-blurred offset shadow instead
          of a soft blur, so it reads as a little tile sitting above the bg. */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 lg:inset-y-4 lg:left-4 lg:h-[calc(100vh-2rem)]
         transform transition-transform duration-300 ease-in-out lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div
          className="h-full flex flex-col overflow-hidden
           bg-white/70 dark:bg-outer_space-500/60 backdrop-blur-xl backdrop-saturate-150
            border-r border-white/50 dark:border-white/10
             lg:border-r-0 lg:border-2 lg:border-white/50 dark:lg:border-white/10
              lg:rounded-3xl lg:shadow-[4px_4px_0_0_rgba(139,124,246,0.14)]
               dark:lg:shadow-[4px_4px_0_0_rgba(0,0,0,0.35)]"
        >
          <div className="flex items-center justify-between h-16 px-6 border-b border-white/50 dark:border-white/10 shrink-0">
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-bold text-lavender-700 dark:text-lavender-300"
            >
              <span className="h-7 w-7 rounded-xl bg-gradient-to-br from-lavender-400 to-mint-400" />
              TaskFlow
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-xl hover:bg-lavender-50 dark:hover:bg-paynes_gray-400"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="mt-6 px-3 overflow-y-auto">
            <ul className="space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="flex items-center px-3 py-2 text-sm font-medium rounded-xl text-outer_space-500 dark:text-platinum-500 hover:bg-lavender-100 hover:text-lavender-700 dark:hover:bg-paynes_gray-400 transition-colors"
                  >
                    <item.icon className="mr-3" size={20} />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content, offset to clear the floating sidebar + its gap */}
      <div className="lg:pl-64 lg:ml-4">
        {/* Top bar — flush sticky bar on mobile, floating pixel pill on desktop */}
        <div
          className="sticky top-0 z-30 flex h-16 items-center gap-x-4 px-4 sm:gap-x-6 sm:px-6
           bg-white/70 dark:bg-outer_space-500/60 backdrop-blur-xl backdrop-saturate-150
            border-b border-white/50 dark:border-white/10
             lg:top-4 lg:mx-4 lg:mb-2 lg:h-14 lg:border-2 lg:border-white/50 dark:lg:border-white/10
              lg:rounded-2xl lg:shadow-[4px_4px_0_0_rgba(139,124,246,0.14)] dark:lg:shadow-[4px_4px_0_0_rgba(0,0,0,0.35)]
               lg:px-6"
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-lavender-50 dark:hover:bg-paynes_gray-400"
          >
            <Menu size={20} />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <button
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="p-2 rounded-xl bg-lavender-100/70 dark:bg-paynes_gray-500/60 backdrop-blur-sm text-lavender-700 dark:text-platinum-500 hover:bg-lavender-200/80 dark:hover:bg-paynes_gray-400 transition-colors"
              >
                {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
              </button>

              <UserButton />
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6 px-4 sm:px-6 lg:pl-8 lg:pr-0">{children}</main>
      </div>
    </div>
  )
}