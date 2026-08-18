"use server"

import { eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { requireUser } from "@/lib/auth"

const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name can't be empty").max(120, "Name is too long"),
})

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Updates the signed-in user's display name. This is intentionally the
 * only editable field here — `email` on `users` is populated from Clerk
 * (see the webhook route + `getOrCreateCurrentUser` in `lib/auth.ts`) and
 * isn't meant to drift from the auth provider's record, and there's no
 * `role` column on `users` at all: role is scoped per-project via
 * `projectMembers.role`, not a global profile attribute.
 */
export async function updateProfileAction(
  input: z.infer<typeof updateProfileSchema>
): Promise<ActionResult<{ name: string }>> {
  const user = await requireUser()

  const parsed = updateProfileSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  try {
    const [updated] = await db
      .update(users)
      .set({ name: parsed.data.name, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning({ name: users.name })

    if (!updated) {
      return { success: false, error: "Couldn't update profile. Try again." }
    }
    return { success: true, data: updated }
  } catch (err) {
    console.error("updateProfileAction failed", err)
    return { success: false, error: "Couldn't update profile. Try again." }
  }
}