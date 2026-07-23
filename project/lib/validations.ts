// TODO: Task 3.6 - Set up data validation with Zod schemas

/*
TODO: Implementation Notes for Interns:

1. Install Zod: pnpm add zod
2. Create validation schemas for all forms and API endpoints
3. Add proper error messages
4. Set up client and server-side validation

Example schemas needed:
- Project creation/update
- Task creation/update
- User profile update
- List/column management
- Comment creation

Example structure:
import { z } from 'zod'

export const projectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  dueDate: z.date().min(new Date(), 'Due date must be in future').optional(),
})

export const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.date().optional(),
  assigneeId: z.string().uuid().optional(),
})
*/

// Placeholder exports to prevent import errors
import { z } from "zod"

// SHARED
 
export const uuidSchema = z.string().uuid("Must be a valid ID")
 
export const prioritySchema = z.enum(["low", "medium", "high"])
 
// USERS
 
export const userSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
})
export type UserInput = z.infer<typeof userSchema>
 
// PROJECTS
 
export const projectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500, "Description too long").optional(),
  dueDate: z.coerce
    .date()
    .min(new Date(), "Due date must be in the future")
    .optional(),
})
export type ProjectInput = z.infer<typeof projectSchema>
 
// Same rules, but every field optional — for PATCH-style partial updates.
// dueDate keeps its own "must be in the future" rule when provided.
export const projectUpdateSchema = projectSchema.partial()
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>
 

// LISTS 
export const listSchema = z.object({
  name: z.string().min(1, "Name is required").max(60, "Name too long"),
  projectId: uuidSchema,
})
export type ListInput = z.infer<typeof listSchema>
 
export const listUpdateSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  position: z.number().int().min(0).optional(),
})
export type ListUpdateInput = z.infer<typeof listUpdateSchema>
 
// TASKS
export const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(1000, "Description too long").optional(),
  priority: prioritySchema,
  dueDate: z.coerce.date().optional(),
  assigneeId: uuidSchema.optional(),
  listId: uuidSchema,
})
export type TaskInput = z.infer<typeof taskSchema>
 
export const taskUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  priority: prioritySchema.optional(),
  dueDate: z.coerce.date().optional().nullable(),
  assigneeId: uuidSchema.optional().nullable(),
})
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>
 
/** move task */
export const taskMoveSchema = z.object({
  taskId: uuidSchema,
  toListId: uuidSchema,
  toPosition: z.number().int().min(0),
})
export type TaskMoveInput = z.infer<typeof taskMoveSchema>
 
// COMMENTS
export const commentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment too long"),
  taskId: uuidSchema,
})
export type CommentInput = z.infer<typeof commentSchema>