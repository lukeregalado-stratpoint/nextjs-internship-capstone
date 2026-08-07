"use client"

import { useState, type FormEvent } from "react"
import { Check, Pencil, Trash2, X } from "lucide-react"
import type { Comment } from "@/lib/db/schema"

export type CommentWithAuthor = Comment & { authorName: string }

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ""
  return (first + last).toUpperCase()
}

function formatTimestamp(date: Date | string) {
  const d = new Date(date)
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

interface TaskCommentsProps {
  comments: CommentWithAuthor[]
  currentUserId: string
  /** Lets a comment be deleted by someone other than its author (the project owner moderating). */
  canModerate?: boolean
  onAddComment: (content: string) => void
  onEditComment: (commentId: string, content: string) => void
  onDeleteComment: (commentId: string) => void
  isPending?: boolean
  error?: string | null
}

export function TaskComments({
  comments,
  currentUserId,
  canModerate = false,
  onAddComment,
  onEditComment,
  onDeleteComment,
  isPending,
  error,
}: TaskCommentsProps) {
  const [draft, setDraft] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState("")

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed) return
    onAddComment(trimmed)
    setDraft("")
  }

  function startEdit(comment: CommentWithAuthor) {
    setEditingId(comment.id)
    setEditDraft(comment.content)
  }

  function submitEdit(commentId: string) {
    const trimmed = editDraft.trim()
    if (!trimmed) return
    onEditComment(commentId, trimmed)
    setEditingId(null)
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
          {error}
        </p>
      )}

      {comments.length === 0 && (
        <p className="text-sm text-paynes_gray-500 dark:text-french_gray-400">
          No comments yet - be the first to say something.
        </p>
      )}

      <ul className="space-y-3">
        {comments.map((comment) => {
          const isOwn = comment.authorId === currentUserId
          const isEditing = editingId === comment.id

          return (
            <li key={comment.id} className="flex gap-2.5">
              <span
                title={comment.authorName}
                className="shrink-0 mt-0.5 inline-flex items-center justify-center h-7 w-7 rounded-full bg-lavender-200 dark:bg-lavender-700/50 text-[11px] font-semibold text-lavender-700 dark:text-lavender-200"
              >
                {initials(comment.authorName)}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-outer_space-500 dark:text-platinum-500">
                    {comment.authorName}
                  </span>
                  <span className="text-[11px] text-paynes_gray-500 dark:text-french_gray-400">
                    {formatTimestamp(comment.createdAt)}
                    {comment.updatedAt > comment.createdAt ? " (edited)" : ""}
                  </span>
                </div>

                {isEditing ? (
                  <div className="mt-1 space-y-1.5">
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      maxLength={2000}
                      rows={2}
                      autoFocus
                      className="w-full px-2.5 py-1.5 text-sm border border-french_gray-300 dark:border-paynes_gray-400 rounded-xl bg-white dark:bg-outer_space-500 text-outer_space-500 dark:text-platinum-500 focus:outline-none focus:ring-2 focus:ring-lavender-400"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => submitEdit(comment.id)}
                        disabled={!editDraft.trim() || isPending}
                        className="inline-flex items-center gap-1 text-xs font-medium text-lavender-600 dark:text-lavender-300 disabled:opacity-50"
                      >
                        <Check size={12} /> Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="inline-flex items-center gap-1 text-xs text-paynes_gray-500 dark:text-french_gray-400"
                      >
                        <X size={12} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-outer_space-500 dark:text-platinum-500 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                )}

                {!isEditing && (isOwn || canModerate) && (
                  <div className="mt-1 flex items-center gap-3">
                    {isOwn && (
                      <button
                        type="button"
                        onClick={() => startEdit(comment)}
                        className="inline-flex items-center gap-1 text-[11px] text-paynes_gray-500 dark:text-french_gray-400 hover:text-outer_space-500 dark:hover:text-platinum-500"
                      >
                        <Pencil size={10} /> Edit
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteComment(comment.id)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1 text-[11px] text-paynes_gray-500 dark:text-french_gray-400 hover:text-red-500 disabled:opacity-50"
                    >
                      <Trash2 size={10} /> Delete
                    </button>
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <form onSubmit={handleSubmit} className="flex items-start gap-2 pt-1">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          rows={2}
          placeholder="Write a comment..."
          className="flex-1 px-3 py-2 text-sm border border-french_gray-300 dark:border-paynes_gray-400 rounded-xl bg-white dark:bg-outer_space-500 text-outer_space-500 dark:text-platinum-500 focus:outline-none focus:ring-2 focus:ring-lavender-400"
        />
        <button
          type="submit"
          disabled={!draft.trim() || isPending}
          className="px-3 py-2 text-sm rounded-xl bg-lavender-500 text-white hover:bg-lavender-600 disabled:opacity-50"
        >
          Post
        </button>
      </form>
    </div>
  )
}