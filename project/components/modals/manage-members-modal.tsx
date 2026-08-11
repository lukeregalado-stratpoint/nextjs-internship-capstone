"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { X, UserPlus, Trash2, Search } from "lucide-react"
import { useMembers, type MemberSearchResult } from "@/hooks/use-members"
import type { ProjectMember } from "@/lib/db/schema"

const ROLE_LABELS: Record<ProjectMember["role"], string> = {
  product_owner: "Product Owner",
  scrum_master: "Scrum Master",
  developer: "Developer",
  stakeholder: "Stakeholder",
}

const ROLES = Object.keys(ROLE_LABELS) as ProjectMember["role"][]

interface MemberRow {
  id: string
  role: ProjectMember["role"]
  user: { id: string; name: string; email: string }
}

interface ManageMembersModalProps {
  projectId: string
  owner: { name: string; email: string }
  members: MemberRow[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ManageMembersModal({
  projectId,
  owner,
  members,
  open,
  onOpenChange,
}: ManageMembersModalProps) {
  const {
    isPending,
    error,
    addMember,
    addMemberById,
    updateMemberRole,
    removeMember,
    searchMembers,
    clearSearch,
    searchResults,
    isSearching,
  } = useMembers(projectId)
  const [query, setQuery] = useState("")
  const [role, setRole] = useState<ProjectMember["role"]>("developer")
  const [selected, setSelected] = useState<MemberSearchResult | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce the autocomplete: wait for a pause in typing before hitting
  // the server, so we're not firing a search on every keystroke.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (selected) return // input currently shows a confirmed pick, not a query

    debounceRef.current = setTimeout(() => {
      searchMembers(query)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selected])

  if (!open) return null

  function handleQueryChange(value: string) {
    setQuery(value)
    setSelected(null)
    setDropdownOpen(true)
  }

  function handleSelectResult(result: MemberSearchResult) {
    setSelected(result)
    setQuery(`${result.name} (${result.email})`)
    setDropdownOpen(false)
    clearSearch()
  }

  function resetAddForm() {
    setQuery("")
    setSelected(null)
    setDropdownOpen(false)
    clearSearch()
  }

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (selected) {
      addMemberById({ projectId, userId: selected.id, role }, resetAddForm)
      return
    }
    // Fallback: no autocomplete suggestion was picked (e.g. they typed a
    // full email for someone who didn't show up in search results — search
    // is prefix/substring matched, this catches an exact-match edge case).
    const typed = query.trim()
    if (!typed) return
    addMember({ projectId, email: typed, role }, resetAddForm)
  }

  function handleRemove(memberId: string, name: string) {
    if (confirm(`Remove ${name} from this project?`)) {
      removeMember(memberId)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white dark:bg-outer_space-500 border border-french_gray-300 dark:border-paynes_gray-400 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-outer_space-500 dark:text-platinum-500">
            Manage members
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-paynes_gray-500 hover:text-outer_space-500 dark:hover:text-platinum-500"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleAdd} className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paynes_gray-500"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => setDropdownOpen(true)}
              // Delay so a click on a dropdown option registers before blur closes it.
              onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
              placeholder="Search by name or email…"
              autoComplete="off"
              className="w-full rounded-lg border border-french_gray-300 dark:border-paynes_gray-400 bg-transparent pl-8 pr-3 py-2 text-sm text-outer_space-500 dark:text-platinum-500 placeholder:text-paynes_gray-500"
            />

            {dropdownOpen && !selected && query.trim() && (
              <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-french_gray-300 dark:border-paynes_gray-400 bg-white dark:bg-outer_space-500 shadow-lg">
                {isSearching ? (
                  <p className="px-3 py-2 text-xs text-paynes_gray-500 dark:text-french_gray-400">
                    Searching…
                  </p>
                ) : searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => handleSelectResult(result)}
                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-lavender-50 dark:hover:bg-paynes_gray-400/20"
                    >
                      <span className="text-sm font-medium text-outer_space-500 dark:text-platinum-500">
                        {result.name}
                      </span>
                      <span className="text-xs text-paynes_gray-500 dark:text-french_gray-400">
                        {result.email}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-xs text-paynes_gray-500 dark:text-french_gray-400">
                    No matching registered users
                  </p>
                )}
              </div>
            )}
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as ProjectMember["role"])}
            className="rounded-lg border border-french_gray-300 dark:border-paynes_gray-400 bg-transparent px-2 py-2 text-sm text-outer_space-500 dark:text-platinum-500"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center px-3 py-2 bg-blue_munsell-500 text-white rounded-lg hover:bg-blue_munsell-600 transition-colors disabled:opacity-50"
          >
            <UserPlus size={16} className="mr-1" /> Add
          </button>
        </form>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="space-y-1 max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between py-2 border-b border-french_gray-300 dark:border-paynes_gray-400">
            <div>
              <p className="text-sm font-medium text-outer_space-500 dark:text-platinum-500">
                {owner.name}
              </p>
              <p className="text-xs text-paynes_gray-500 dark:text-french_gray-400">
                {owner.email}
              </p>
            </div>
            <span className="text-xs font-medium text-paynes_gray-500 dark:text-french_gray-400">
              Owner
            </span>
          </div>

          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between py-2 border-b border-french_gray-300 dark:border-paynes_gray-400 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-outer_space-500 dark:text-platinum-500">
                  {m.user.name}
                </p>
                <p className="text-xs text-paynes_gray-500 dark:text-french_gray-400">
                  {m.user.email}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={m.role}
                  disabled={isPending}
                  onChange={(e) =>
                    updateMemberRole(m.id, { role: e.target.value as ProjectMember["role"] })
                  }
                  className="rounded-lg border border-french_gray-300 dark:border-paynes_gray-400 bg-transparent px-2 py-1 text-xs text-outer_space-500 dark:text-platinum-500"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleRemove(m.id, m.user.name)}
                  disabled={isPending}
                  className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                  aria-label={`Remove ${m.user.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {members.length === 0 && (
            <p className="text-sm text-paynes_gray-500 dark:text-french_gray-400 py-4 text-center">
              No members yet. Search for someone by name or email above.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}