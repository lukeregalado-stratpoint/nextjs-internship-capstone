import { z } from "zod"
import { projectRoleEnum } from "@/lib/db/schema"

// PROJECTS

export const projectSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  dueDate: z.coerce.date().optional().nullable(),
})
export type ProjectInput = z.infer<typeof projectSchema>

export const projectUpdateSchema = projectSchema.partial()
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>

// LISTS

export const listSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  projectId: z.string().uuid(),
})
export type ListInput = z.infer<typeof listSchema>

export const listUpdateSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  position: z.number().int().min(0).optional(),
})
export type ListUpdateInput = z.infer<typeof listUpdateSchema>

export const listReorderSchema = z.object({
  projectId: z.string().uuid(),
  orderedListIds: z.array(z.string().uuid()).min(1),
})
export type ListReorderInput = z.infer<typeof listReorderSchema>

// LABELS

const hexColor = z
  .string()
  .trim()
  .regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, "Must be a hex color like #8B5CF6")

export const labelSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40),
  color: hexColor,
  projectId: z.string().uuid(),
})
export type LabelInput = z.infer<typeof labelSchema>

export const labelUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40).optional(),
  color: hexColor.optional(),
})
export type LabelUpdateInput = z.infer<typeof labelUpdateSchema>

// TASKS

const taskPriority = z.enum(["low", "medium", "high"])

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  listId: z.string().uuid(),
  assigneeId: z.string().uuid().optional().nullable(),
  priority: taskPriority.default("medium"),
  dueDate: z.coerce.date().optional().nullable(),
  labelIds: z.array(z.string().uuid()).max(20).optional().default([]),
})
export type TaskInput = z.infer<typeof taskSchema>

// `listId` is optional here (unlike on create) — updating a task doesn't
// always mean moving it to a different column. When present, the action
// treats it as a move and recomputes the task's position in the new list.
// `labelIds`, when present, replaces the task's full label set (see
// setTaskLabels) rather than being merged with the existing one.
export const taskUpdateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200).optional(),
  description: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  listId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  priority: taskPriority.optional(),
  dueDate: z.coerce.date().optional().nullable(),
  labelIds: z.array(z.string().uuid()).max(20).optional(),
})
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>

// drag + drop in or across columns
// the full ordering of `orderedTaskIds` within `destListId` after the move
export const taskMoveSchema = z.object({
  taskId: z.string().uuid(),
  destListId: z.string().uuid(),
  orderedTaskIds: z.array(z.string().uuid()).min(1),
})
export type TaskMoveInput = z.infer<typeof taskMoveSchema>

// Bulk selection actions (task 5). Capped at 100 per operation — well
// above anything a person would realistically multi-select by hand, but
// keeps a single bad request from trying to touch an unbounded number of
// rows.
const taskIdsField = z.array(z.string().uuid()).min(1).max(100)

// Same field set as a single-task move/edit, minus title/description/
// dueDate/labelIds — those are inherently per-task and don't make sense
// applied identically across a whole selection.
export const taskBulkUpdateSchema = z.object({
  taskIds: taskIdsField,
  listId: z.string().uuid().optional(),
  priority: taskPriority.optional(),
  assigneeId: z.string().uuid().optional().nullable(),
})
export type TaskBulkUpdateInput = z.infer<typeof taskBulkUpdateSchema>

export const taskBulkDeleteSchema = z.object({
  taskIds: taskIdsField,
})
export type TaskBulkDeleteInput = z.infer<typeof taskBulkDeleteSchema>

// PROJECT MEMBERS

// Adding a member is done by email rather than userId — the owner types in
// a teammate's email and we look up the local `users` row for them. This
// matches how someone would actually invite a person they can't see a
// picker for yet (no "search users" UI exists).
export const addMemberSchema = z.object({
  projectId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: z.enum(projectRoleEnum.enumValues).default("developer"),
})
export type AddMemberInput = z.infer<typeof addMemberSchema>

export const updateMemberRoleSchema = z.object({
  role: z.enum(projectRoleEnum.enumValues),
})
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>

// Autocomplete search, scoped to a single project (see searchUsersForProject) —
// intentionally not a global user search.
export const searchMembersSchema = z.object({
  projectId: z.string().uuid(),
  query: z.string().trim().min(1).max(100),
})
export type SearchMembersInput = z.infer<typeof searchMembersSchema>

// Adding a member from an autocomplete result: the picker already resolved
// a specific registered user, so this takes their id directly instead of
// re-parsing an email. addMemberSchema (above) stays around as the
// email-based fallback for typing someone's exact address.
export const addMemberByUserIdSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(projectRoleEnum.enumValues).default("developer"),
})
export type AddMemberByUserIdInput = z.infer<typeof addMemberByUserIdSchema>

// COMMENTS

export const commentSchema = z.object({
  content: z.string().trim().min(1, "Comment can't be empty").max(2000),
  taskId: z.string().uuid(),
})
export type CommentInput = z.infer<typeof commentSchema>

export const commentUpdateSchema = z.object({
  content: z.string().trim().min(1, "Comment can't be empty").max(2000),
})
export type CommentUpdateInput = z.infer<typeof commentUpdateSchema>