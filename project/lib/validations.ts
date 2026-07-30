import { z } from "zod"

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
})
export type TaskInput = z.infer<typeof taskSchema>

// `listId` is optional here (unlike on create) — updating a task doesn't
// always mean moving it to a different column. When present, the action
// treats it as a move and recomputes the task's position in the new list.
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