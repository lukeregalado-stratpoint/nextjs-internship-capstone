import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import type { InferSelectModel } from "drizzle-orm"

export type DbUser = InferSelectModel<typeof users>

/**
 * returns the Clerk session's userId; null if signed out.
 */
export async function getSessionUserId(): Promise<string | null> {
  const { userId } = await auth()
  return userId
}

/**
 * finds the local `users` row for the current Clerk session.
 * return null if signed out / if the Clerk user hasn't been synced into the local DB yet.
 */
export async function getCurrentUser(): Promise<DbUser | null> {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1)

  return dbUser ?? null
}

// redirect guard
export async function requireUser(): Promise<DbUser> {
  const { userId: clerkId } = await auth()

  if (!clerkId) {
    redirect("/sign-in")
  }

  const dbUser = await getCurrentUser()

  if (!dbUser) {
    // session is valid but no local row exists yet
    throw new Error(
      `No local user record found for Clerk user ${clerkId}. ` +
        `Check that the Clerk webhook (Task 2.5) is configured and has fired.`
    )
  }

  return dbUser
}

/**
 * fallback sync
 */
export async function getOrCreateCurrentUser(): Promise<DbUser> {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const existing = await getCurrentUser()
  if (existing) return existing

  const clerkUser = await currentUser()
  if (!clerkUser) {
    throw new Error("Clerk session exists but currentUser() returned null")
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress
  if (!email) {
    throw new Error(`Clerk user ${clerkId} has no email address on file`)
  }

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    email

  const [newUser] = await db
    .insert(users)
    .values({ clerkId, email, name })
    .onConflictDoNothing()
    .returning()

  // race condition
  if (!newUser) {
    const winner = await getCurrentUser()
    if (winner) return winner
    throw new Error(
      `Failed to create or find local user record for Clerk user ${clerkId} after insert conflict`
    )
  }

  return newUser
}