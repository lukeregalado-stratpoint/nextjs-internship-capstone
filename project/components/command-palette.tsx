"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useClerk } from "@clerk/nextjs"
import {
  Search,
  Home,
  FolderOpen,
  Users,
  Settings,
  BarChart3,
  Calendar,
  ListChecks,
  Moon,
  Sun,
  LogOut,
  Loader2,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "./theme-provider"
import { useCommandPaletteStore, useRecentPaletteItems } from "@/stores/command-palette-store"
import { useSearchIndexStore } from "@/stores/search-index-store"

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Projects", href: "/projects", icon: FolderOpen },
  { name: "Team", href: "/team", icon: Users },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Settings", href: "/settings", icon: Settings },
]

type PaletteItem = {
  id: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  primary: string
  secondary?: string
  onSelect: () => void
}

export function CommandPalette() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { signOut } = useClerk()

  const isOpen = useCommandPaletteStore((s) => s.isOpen)
  const openPalette = useCommandPaletteStore((s) => s.open)
  const closePalette = useCommandPaletteStore((s) => s.close)
  const togglePalette = useCommandPaletteStore((s) => s.toggle)
  const recentItems = useRecentPaletteItems((s) => s.recentItems)
  const addRecentItem = useRecentPaletteItems((s) => s.addRecentItem)

  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)

  const indexProjects = useSearchIndexStore((s) => s.projects)
  const indexTasks = useSearchIndexStore((s) => s.tasks)
  const isIndexLoading = useSearchIndexStore((s) => s.isLoading)
  const fetchIndex = useSearchIndexStore((s) => s.fetchIndex)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // global ⌘k / ctrl+k shortcut, works from anywhere while a dashboard
  // route is mounted (this component lives in dashboardlayout).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        togglePalette()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [togglePalette])

  // reset to a clean slate every time it opens, focus the input, and make
  // sure the local search index is loaded (cheap no-op if it was already
  // fetched recently - see `search-index-store`'s staleness check).
  useEffect(() => {
    if (!isOpen) return
    setQuery("")
    setActiveIndex(0)
    fetchIndex()
    const t = setTimeout(() => inputRef.current?.focus(), 10)
    return () => clearTimeout(t)
  }, [isOpen, fetchIndex])

  const go = useCallback(
    (href: string) => {
      closePalette()
      router.push(href)
    },
    [closePalette, router]
  )

  const groups = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    const groupList: { label: string; items: PaletteItem[] }[] = []

    if (trimmed.length === 0 && recentItems.length > 0) {
      groupList.push({
        label: "Recent",
        items: recentItems.map((r) => ({
          id: `recent-${r.id}`,
          icon: r.sublabel === "Project" ? FolderOpen : ListChecks,
          primary: r.label,
          secondary: r.sublabel,
          onSelect: () => go(r.href),
        })),
      })
    }

    const matchedNav = NAV_ITEMS.filter((n) => n.name.toLowerCase().includes(trimmed))
    if (matchedNav.length > 0) {
      groupList.push({
        label: "Go to",
        items: matchedNav.map((n) => ({
          id: `nav-${n.href}`,
          icon: n.icon,
          primary: n.name,
          onSelect: () => go(n.href),
        })),
      })
    }

    if (trimmed.length === 0) {
      groupList.push({
        label: "Quick actions",
        items: [
          {
            id: "action-theme",
            icon: theme === "light" ? Moon : Sun,
            primary: theme === "light" ? "Switch to dark mode" : "Switch to light mode",
            onSelect: () => {
              setTheme(theme === "light" ? "dark" : "light")
              closePalette()
            },
          },
          {
            id: "action-sign-out",
            icon: LogOut,
            primary: "Sign out",
            onSelect: () => {
              closePalette()
              signOut({ redirectUrl: "/" })
            },
          },
        ],
      })
    }

    if (trimmed.length > 0) {
      const matchedProjects = indexProjects
        .filter(
          (p) =>
            p.name.toLowerCase().includes(trimmed) ||
            (p.description ?? "").toLowerCase().includes(trimmed)
        )
        .slice(0, 6)

      if (matchedProjects.length > 0) {
        groupList.push({
          label: "Projects",
          items: matchedProjects.map((p) => ({
            id: `project-${p.id}`,
            icon: FolderOpen,
            primary: p.name,
            secondary: p.description ?? undefined,
            onSelect: () => {
              addRecentItem({ id: p.id, label: p.name, sublabel: "Project", href: `/projects/${p.id}` })
              go(`/projects/${p.id}`)
            },
          })),
        })
      }

      const matchedTasks = indexTasks
        .filter((t) => t.title.toLowerCase().includes(trimmed))
        .slice(0, 6)

      if (matchedTasks.length > 0) {
        groupList.push({
          label: "Tasks",
          items: matchedTasks.map((t) => ({
            id: `task-${t.id}`,
            icon: ListChecks,
            primary: t.title,
            secondary: t.listName,
            onSelect: () => {
              addRecentItem({
                id: t.id,
                label: t.title,
                sublabel: t.listName,
                href: `/projects/${t.projectId}`,
              })
              go(`/projects/${t.projectId}`)
            },
          })),
        })
      }
    }

    return groupList
  }, [query, indexProjects, indexTasks, recentItems, theme, go, setTheme, closePalette, signOut, addRecentItem])

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups])

  useEffect(() => {
    setActiveIndex(0)
  }, [flatItems.length])

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      flatItems[activeIndex]?.onSelect()
    } else if (e.key === "Escape") {
      e.preventDefault()
      closePalette()
    }
  }

  if (!isOpen) return null

  let runningIndex = -1

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[1px]" onClick={closePalette} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-xl rounded-lg border border-line dark:border-line-dark bg-surface dark:bg-surface-dark shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2.5 px-4 border-b border-line dark:border-line-dark">
          <Search size={17} className="text-slate dark:text-slate-dark shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search projects, tasks, or jump to a page..."
            className="flex-1 bg-transparent py-3.5 text-sm text-ink dark:text-paper placeholder:text-slate dark:placeholder:text-slate-dark focus:outline-none"
          />
          {isIndexLoading && (
            <Loader2 size={15} className="animate-spin text-slate dark:text-slate-dark shrink-0" />
          )}
          <kbd className="hidden sm:inline-block shrink-0 text-[10px] font-medium text-slate dark:text-slate-dark border border-line dark:border-line-dark rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto scrollbar-thin py-2">
          {flatItems.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate dark:text-slate-dark">
              {query.trim() ? `No results for "${query.trim()}"` : "Type to search, or pick a quick action"}
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="mb-1 last:mb-0">
                <p className="px-4 pt-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-slate dark:text-slate-dark">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  runningIndex += 1
                  const index = runningIndex
                  const active = index === activeIndex
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-index={index}
                      onClick={item.onSelect}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-ink dark:text-paper hover:bg-paper dark:hover:bg-paper-dark"
                      )}
                    >
                      <Icon size={16} className="shrink-0" />
                      <span className="truncate flex-1">{item.primary}</span>
                      {item.secondary && (
                        <span className="truncate text-xs text-slate dark:text-slate-dark max-w-[35%]">
                          {item.secondary}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div className="hidden sm:flex items-center gap-3 px-4 py-2 border-t border-line dark:border-line-dark text-[11px] text-slate dark:text-slate-dark">
          <span className="flex items-center gap-1">
            <ArrowUp size={11} />
            <ArrowDown size={11} />
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <CornerDownLeft size={11} />
            Select
          </span>
        </div>
      </div>
    </div>
  )
}