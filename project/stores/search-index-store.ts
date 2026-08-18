import { create } from "zustand"
import { getSearchIndexAction, type SearchIndex } from "@/lib/actions/search"

// How long a fetched index is trusted before the palette refetches on next
// open. Short enough that a project/task created moments ago shows up
// almost immediately, long enough that reopening the palette a few times
// in a row doesn't refetch on every open.
const STALE_MS = 60_000

interface SearchIndexState {
  projects: SearchIndex["projects"]
  tasks: SearchIndex["tasks"]
  isLoading: boolean
  error: string | null
  lastFetchedAt: number | null
  /**
   * Fetches the index if it's never been loaded or is older than
   * `STALE_MS`. Pass `force: true` to refetch regardless (e.g. right after
   * creating a project/task, if you want the palette to reflect it
   * immediately rather than waiting out the staleness window).
   */
  fetchIndex: (opts?: { force?: boolean }) => Promise<void>
}

export const useSearchIndexStore = create<SearchIndexState>((set, get) => ({
  projects: [],
  tasks: [],
  isLoading: false,
  error: null,
  lastFetchedAt: null,

  fetchIndex: async (opts) => {
    const { lastFetchedAt, isLoading } = get()
    const isFresh = lastFetchedAt !== null && Date.now() - lastFetchedAt < STALE_MS
    if (isLoading || (isFresh && !opts?.force)) return

    set({ isLoading: true, error: null })
    const result = await getSearchIndexAction()
    if (!result.success) {
      set({ isLoading: false, error: result.error })
      return
    }
    set({
      projects: result.data.projects,
      tasks: result.data.tasks,
      isLoading: false,
      lastFetchedAt: Date.now(),
    })
  },
}))