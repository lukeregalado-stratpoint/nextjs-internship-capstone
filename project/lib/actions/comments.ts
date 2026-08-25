"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import {
  canAccessTask,
  createComment as createCommentRow,
  deleteComment as deleteCommentRow,
  getActivityForTask,
  getCommentById,
  getCommentsForTask,
  logActivity,
  ownsComment,
  ownsTask,
  updateComment as updateCommentRow,
} from "@/lib/db/queries"
import { commentSchema, commentUpdateSchema } from "@/lib/validations"
import type { Activity, Comment } from "@/lib/db/schema"

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

export type CommentWithAuthor = Comment & { authorName: string }
export type ActivityWithUser = Activity & { userName: string }

/**
 * Fetches a task's comments + activity together, for the modal's Comments
 * and Activity tabs. Client components can call this directly (it's a
 * server action, not a route) - see `onOpenTaskThread` in KanbanBoard.
 */
export async function getTaskThreadAction(
  taskId: string
): Promise<ActionResult<{ comments: CommentWithAuthor[]; activities: ActivityWithUser[] }>> {
  const user = await requireUser()

  const canAccess = await canAccessTask(taskId, user.id)
  if (!canAccess) {
    return { success: false, error: "You don't have permission to view this task" }
  }

  const [commentRows, activityRows] = await Promise.all([
    getCommentsForTask(taskId),
    getActivityForTask(taskId),
  ])

  return {
    success: true,
    data: {
      comments: commentRows.map((c) => ({ ...c, authorName: c.author.name })),
      activities: activityRows.map((a) => ({ ...a, userName: a.user.name })),
    },
  }
}

/**
 * Any project member can comment - not just the owner. This is
 * intentionally looser than the owner-only checks on task edits
 * (`ownsTask`), since a comment thread is meant to be collaborative.
 */
export async function createCommentAction(
  taskId: string,
  projectId: string,
  input: unknown
): Promise<ActionResult<CommentWithAuthor>> {
  const user = await requireUser()

  const canAccess = await canAccessTask(taskId, user.id)
  if (!canAccess) {
    return { success: false, error: "You don't have permission to comment on this task" }
  }

  const parsed = commentSchema.safeParse({ ...(input as object), taskId })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const comment = await createCommentRow({
    content: parsed.data.content,
    taskId,
    authorId: user.id,
  })

  await logActivity(taskId, user.id, "comment_added", { commentId: comment.id })

  

  return { success: true, data: { ...comment, authorName: user.name } }
}

/** only the comment's own author can edit it. */
export async function updateCommentAction(
  commentId: string,
  taskId: string,
  projectId: string,
  input: unknown
): Promise<ActionResult<Comment>> {
  const user = await requireUser()

  const isAuthor = await ownsComment(commentId, user.id)
  if (!isAuthor) {
    return { success: false, error: "You can only edit your own comments" }
  }

  const parsed = commentUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const comment = await updateCommentRow(commentId, parsed.data.content)
  if (!comment) {
    return { success: false, error: "Comment not found" }
  }

  

  return { success: true, data: comment }
}

/**
 * The comment's author or the project owner can delete it - same
 * moderation shape as everything else in this app (owner can act on
 * anything in their project; everyone else can only act on their own
 * stuff).
 */
export async function deleteCommentAction(
  commentId: string,
  taskId: string,
  projectId: string
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()

  const comment = await getCommentById(commentId)
  if (!comment) {
    return { success: false, error: "Comment not found" }
  }

  const isAuthor = comment.authorId === user.id
  const isProjectOwner = await ownsTask(taskId, user.id)
  if (!isAuthor && !isProjectOwner) {
    return { success: false, error: "You don't have permission to delete this comment" }
  }

  await deleteCommentRow(commentId)
  await logActivity(taskId, user.id, "comment_deleted", { commentId })

  

  return { success: true, data: { id: commentId } }
}