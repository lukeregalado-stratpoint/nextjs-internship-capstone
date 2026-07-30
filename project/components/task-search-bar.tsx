"use client"

import { useMemo, useRef, useState, type KeyboardEvent } from "react"
import { Search, X } from "lucide-react"
import { applySearchSuggestion, getSearchSuggestions, type TagSuggestion } from "@/lib/task-search"

export function TaskSearchBar({
  query,
  onQueryChange,
  memberNames,
  matchCount,
  totalCount,
}: {
  query: string
  onQueryChange: (value: string) => void
  memberNames: string[]
  matchCount: number
  totalCount: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [highlighted, setHighlighted] = useState(0)

  const isSearching = query.trim().length > 0
  const suggestions = useMemo(() => getSearchSuggestions(query, memberNames), [query, memberNames])
  const showSuggestions = isFocused && suggestions.length > 0

  function pick(suggestion: TagSuggestion) {
    onQueryChange(applySearchSuggestion(query, suggestion))
    setHighlighted(0)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions) return

    // hijack enter key if there is a suggestion
    if (e.key === "ArrowDown") {

      e.preventDefault()
      setHighlighted((h) => (h + 1) % suggestions.length)
    } else if (e.key === "ArrowUp") {

      e.preventDefault()
      setHighlighted((h) => (h - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === "Enter" || e.key === "Tab") {

      e.preventDefault()
      pick(suggestions[highlighted])
    } else if (e.key === "Escape") {
      setIsFocused(false)
    }
  }

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[240px] max-w-md">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paynes_gray-500 dark:text-french_gray-400"
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value)
            setHighlighted(0)
          }}
          onFocus={() => setIsFocused(true)}

          // delay: suggestion -> input field unmount
          onBlur={() => setTimeout(() => setIsFocused(false), 100)}
          onKeyDown={handleKeyDown}
          placeholder='Search tasks, or try "assignee: jane"'
          aria-label="Search tasks"
          autoComplete="off"
          className="w-full pl-9 pr-8 py-2 text-sm border border-lavender-200 dark:border-paynes_gray-400 rounded-xl bg-white dark:bg-outer_space-500 text-outer_space-500 dark:text-platinum-500 focus:outline-none focus:ring-2 focus:ring-lavender-400"
        />
        {isSearching && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-paynes_gray-500 dark:text-french_gray-400 hover:text-outer_space-500 dark:hover:text-platinum-500"
          >
            <X size={14} />
          </button>
        )}

        {showSuggestions && (
          <ul
            role="listbox"
            className="absolute z-20 mt-1 w-full max-h-56 overflow-auto bg-white dark:bg-outer_space-500 border border-lavender-100 dark:border-paynes_gray-400 rounded-xl shadow-lg py-1"
          >
            {suggestions.map((s, i) => (
              <li key={s.id} role="option" aria-selected={i === highlighted}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()} // keep focus on the input
                  onMouseEnter={() => setHighlighted(i)}
                  onClick={() => pick(s)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-1.5 text-sm text-left ${
                    i === highlighted
                      ? "bg-lavender-50 dark:bg-paynes_gray-400/30"
                      : "hover:bg-lavender-50 dark:hover:bg-paynes_gray-400/20"
                  }`}
                >
                  <span className="font-medium text-outer_space-500 dark:text-platinum-500 capitalize">
                    {s.label}
                  </span>
                  {s.hint && (
                    <span className="text-xs text-paynes_gray-500 dark:text-french_gray-400">{s.hint}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isSearching && (
        <span className="text-xs text-paynes_gray-500 dark:text-french_gray-400">
          {matchCount} of {totalCount} task{totalCount === 1 ? "" : "s"} match
        </span>
      )}
    </div>
  )
}