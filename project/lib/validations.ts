import { z } from "zod"

// ---------- Projects ----------

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

// ---------- Lists (columns) ----------

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
