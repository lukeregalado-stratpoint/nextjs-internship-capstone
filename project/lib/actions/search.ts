"use server"

import { requireUser } from "@/lib/auth"
import { getSearchIndexForUser, globalSearchForUser } from "@/lib/db/queries"

export type GlobalSearchResults = Awaited<ReturnType<typeof globalSearchForUser>>
export type SearchIndex = Awaited<ReturnType<typeof getSearchIndexForUser>>

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Backs the command palette's local-first search: fetched once when the
 * palette opens (and refetched when stale — see `search-index-store.ts`),
 * then filtered client-side on every keystroke instead of round-tripping
 * to the server per character typed. Same `requireUser` guard as every
 * other action here, so the index never contains projects/tasks the caller
 * can't access.
 */
export async function getSearchIndexAction(): Promise<ActionResult<SearchIndex>> {
  const user = await requireUser()

  try {
    const data = await getSearchIndexForUser(user.id)
    return { success: true, data }
  } catch (err) {
    console.error("getSearchIndexAction failed", err)
    return { success: false, error: "Couldn't load search index. Try again." }
  }
}

/**
 * Fallback full-text search, round-tripping to the DB per call. No longer
 * used by the palette's default path (see `getSearchIndexAction` above) —
 * kept for accounts whose project/task count outgrows what's reasonable to
 * cache client-side.
 */
export async function globalSearchAction(
  query: string
): Promise<ActionResult<GlobalSearchResults>> {
  const user = await requireUser()

  const trimmed = query.trim()
  if (trimmed.length === 0) {
    return { success: true, data: { projects: [], tasks: [] } }
  }

  try {
    const data = await globalSearchForUser(user.id, trimmed)
    return { success: true, data }
  } catch (err) {
    console.error("globalSearchAction failed", err)
    return { success: false, error: "Search failed. Try again." }
  }
}