"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { X, UserPlus, Trash2, Search, Mail } from "lucide-react"
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
    pendingInvitations,
    revokeInvitation,
  } = useMembers(projectId)
  const [query, setQuery] = useState("")
  const [role, setRole] = useState<ProjectMember["role"]>("developer")
  const [selected, setSelected] = useState<MemberSearchResult | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [invitedMessage, setInvitedMessage] = useState<string | null>(null)
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
    setInvitedMessage(null)

    if (selected) {
      const name = selected.name
      addMemberById({ projectId, userId: selected.id, role }, () => {
        resetAddForm()
        setInvitedMessage(`Invitation sent to ${name}.`)
      })
      return
    }
    // Fallback: no autocomplete suggestion was picked (e.g. they typed a
    // full email for someone who didn't show up in search results — search
    // is prefix/substring matched, this catches an exact-match edge case).
    const typed = query.trim()
    if (!typed) return
    addMember({ projectId, email: typed, role }, () => {
      resetAddForm()
      setInvitedMessage(`Invitation sent to ${typed}.`)
    })
  }

  function handleRemove(memberId: string, name: string) {
    if (confirm(`Remove ${name} from this project?`)) {
      removeMember(memberId)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-card border border-border p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Manage members
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleAdd} className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
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
              className="w-full rounded-lg border border-input bg-transparent pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />

            {dropdownOpen && !selected && query.trim() && (
              <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                {isSearching ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    Searching…
                  </p>
                ) : searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => handleSelectResult(result)}
                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-muted"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {result.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {result.email}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    No matching registered users
                  </p>
                )}
              </div>
            )}
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as ProjectMember["role"])}
            className="rounded-lg border border-input bg-transparent px-2 py-2 text-sm text-foreground"
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
            className="inline-flex items-center px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <UserPlus size={16} className="mr-1" /> Invite
          </button>
        </form>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {invitedMessage && !error && (
          <p className="text-sm text-muted-foreground">{invitedMessage}</p>
        )}

        {pendingInvitations.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Pending invitations
            </p>
            {pendingInvitations.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {invite.invitee.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {invite.invitee.email} · {ROLE_LABELS[invite.role]}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => revokeInvitation(invite.id)}
                  disabled={isPending}
                  className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded disabled:opacity-50"
                  aria-label={`Revoke invitation to ${invite.invitee.name}`}
                  title="Revoke invitation"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1 max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">
                {owner.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {owner.email}
              </p>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              Owner
            </span>
          </div>

          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {m.user.name}
                </p>
                <p className="text-xs text-muted-foreground">
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
                  className="rounded-lg border border-input bg-transparent px-2 py-1 text-xs text-foreground"
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
                  className="p-1 text-destructive hover:bg-destructive/10 rounded disabled:opacity-50"
                  aria-label={`Remove ${m.user.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {members.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No members yet. Search for someone by name or email above.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}