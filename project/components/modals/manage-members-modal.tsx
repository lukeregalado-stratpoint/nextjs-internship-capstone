"use client"

import { useState, type FormEvent } from "react"
import { X, UserPlus, Trash2 } from "lucide-react"
import { useMembers } from "@/hooks/use-members"
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
  const { isPending, error, addMember, updateMemberRole, removeMember } = useMembers(projectId)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<ProjectMember["role"]>("developer")

  if (!open) return null

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    addMember({ projectId, email: email.trim(), role }, () => setEmail(""))
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
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@email.com"
            className="flex-1 rounded-lg border border-french_gray-300 dark:border-paynes_gray-400 bg-transparent px-3 py-2 text-sm text-outer_space-500 dark:text-platinum-500 placeholder:text-paynes_gray-500"
          />
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
              No members yet. Add someone by email above.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}