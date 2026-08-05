import type { TaskWithLabels } from "@/stores/board-store"

export const TAG_NAMES = ["title", "description", "priority", "assignee"] as const
export type TagName = (typeof TAG_NAMES)[number]

export const TAG_HELP: Record<TagName, string> = {
  title: "Search task titles",
  description: "Search task descriptions",
  priority: "low, medium, or high",
  assignee: "Search by assignee name",
}

export interface ParsedSearchQuery {
  all: string[]
  title: string[]
  description: string[]
  priority: string[]
  assignee: string[]
}

const TAG_PATTERN = new RegExp(`\\b(${TAG_NAMES.join("|")}):`, "gi")

// PARSER
export function parseSearchQuery(raw: string): ParsedSearchQuery {
  const result: ParsedSearchQuery = { all: [], title: [], description: [], priority: [], assignee: [] }

  TAG_PATTERN.lastIndex = 0
  const matches = [...raw.matchAll(TAG_PATTERN)]

  const leadingEnd = matches.length > 0 ? (matches[0].index ?? 0) : raw.length
  const leading = raw.slice(0, leadingEnd).trim()
  if (leading) result.all.push(...leading.split(/\s+/))

  for (let i = 0; i < matches.length; i++) {
    const tag = matches[i][1].toLowerCase() as TagName
    const valueStart = (matches[i].index ?? 0) + matches[i][0].length
    const valueEnd = i + 1 < matches.length ? matches[i + 1].index : raw.length
    const value = raw.slice(valueStart, valueEnd).trim()
    if (value) result[tag].push(value)
  }

  return result
}

export function isQueryEmpty(query: ParsedSearchQuery): boolean {
  return (
    query.all.length === 0 &&
    query.title.length === 0 &&
    query.description.length === 0 &&
    query.priority.length === 0 &&
    query.assignee.length === 0
  )
}

export function taskMatchesQuery(
  task: TaskWithLabels,
  query: ParsedSearchQuery,
  memberNameById: Map<string, string>
): boolean {
  const title = task.title.toLowerCase()
  const description = (task.description ?? "").toLowerCase()
  const priority = task.priority.toLowerCase()
  const assigneeName = (task.assigneeId ? (memberNameById.get(task.assigneeId) ?? "") : "").toLowerCase()

  const matchesAnyField = (term: string) => {
    const t = term.toLowerCase()
    return title.includes(t) || description.includes(t) || priority.includes(t) || assigneeName.includes(t)
  }

  const matchesAssignee = (term: string) => {
    const t = term.toLowerCase()
    if (t === "unassigned") return !task.assigneeId
    return assigneeName.includes(t)
  }

  return (
    query.all.every(matchesAnyField) &&
    query.title.every((t) => title.includes(t.toLowerCase())) &&
    query.description.every((t) => description.includes(t.toLowerCase())) &&
    query.priority.every((t) => priority.includes(t.toLowerCase())) &&
    query.assignee.every(matchesAssignee)
  )
}

export function filterTasks(
  tasks: TaskWithLabels[],
  rawQuery: string,
  memberNameById: Map<string, string>
): TaskWithLabels[] {
  const parsed = parseSearchQuery(rawQuery)
  if (isQueryEmpty(parsed)) return tasks
  return tasks.filter((task) => taskMatchesQuery(task, parsed, memberNameById))
}

// SUGGESTION KEYWORDS
export interface TagSuggestion {
  id: string
  label: string
  hint?: string
  insertText: string
  kind: "tag" | "value"
}

const TAG_VALUE_TAIL = new RegExp(`(${TAG_NAMES.join("|")}):\\s*([^:]*)$`, "i")
const TRAILING_WORD = /(\S*)$/

/**
 * find nearest match from user input to TAGS
 */
export function getSearchSuggestions(query: string, memberNames: string[]): TagSuggestion[] {
  if (query === "" || /\s$/.test(query)) {
    return allTagSuggestions()
  }

  const tailMatch = query.match(TAG_VALUE_TAIL)

  if (tailMatch) {
    const tag = tailMatch[1].toLowerCase() as TagName
    const partial = tailMatch[2].trim().toLowerCase()

    if (tag === "priority") {
      return (["low", "medium", "high"] as const)
        .filter((p) => p.startsWith(partial))
        .map((p) => ({ id: `priority-${p}`, label: p, insertText: p, kind: "value" }))
    }

    if (tag === "assignee") {
      const options = ["unassigned", ...memberNames]
      return options
        .filter((name) => name.toLowerCase().startsWith(partial))
        .slice(0, 6)
        .map((name) => ({ id: `assignee-${name}`, label: name, insertText: name, kind: "value" }))
    }

    return [] // title / description: free text, no suggestions mid-word
  }

  const word = (query.match(TRAILING_WORD)?.[1] ?? "").toLowerCase()
  return TAG_NAMES.filter((t) => t.startsWith(word)).map((t) => ({
    id: `tag-${t}`,
    label: `${t}:`,
    hint: TAG_HELP[t],
    insertText: `${t}: `,
    kind: "tag",
  }))
}

function allTagSuggestions(): TagSuggestion[] {
  return TAG_NAMES.map((t) => ({
    id: `tag-${t}`,
    label: `${t}:`,
    hint: TAG_HELP[t],
    insertText: `${t}: `,
    kind: "tag",
  }))
}

/** apply suggestion to specific word */
export function applySearchSuggestion(query: string, suggestion: TagSuggestion): string {
  if (suggestion.kind === "tag") {
    return query.replace(TRAILING_WORD, "") + suggestion.insertText
  }
  return query.replace(TAG_VALUE_TAIL, (_match, tag: string) => `${tag}: ${suggestion.insertText} `)
}