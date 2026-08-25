import type { ProjectMember } from "@/lib/db/schema"

/**
 * A user's effective role on a project. "owner" isn't stored in
 * `project_members` - it comes from `projects.ownerId` - but it's treated
 * as a role here so every permission check goes through one function
 * (`hasPermission`) instead of a separate "is this the owner?" branch
 * everywhere. See `getProjectRole` / `getProjectRoleForList` /
 * `getProjectRoleForTask` in `lib/db/queries.ts` for how a role is resolved.
 */
export type ProjectRole = "owner" | ProjectMember["role"]

export const ROLE_LABELS: Record<ProjectRole, string> = {
  owner: "Owner",
  product_owner: "Product Owner",
  scrum_master: "Scrum Master",
  developer: "Developer",
  stakeholder: "Stakeholder",
}

/**
 * One-line, human-facing summary of what a role can do - shown in the
 * manage-members UI so the owner knows what they're granting before they
 * pick a role, not just the role's name. Keep in sync with `PERMISSIONS`
 * below; these are prose, not the source of truth for enforcement.
 */
export const ROLE_DESCRIPTIONS: Record<ProjectRole, string> = {
  owner: "Full control: project settings, members, columns, and tasks.",
  product_owner: "Can edit project settings, manage columns/labels, and manage tasks.",
  scrum_master: "Can manage columns/labels and manage tasks, but not project settings.",
  developer: "Can create, edit, and comment on tasks, but can't delete tasks or change the board's structure.",
  stakeholder: "Read-only: can view the board and comment, but can't make changes.",
}

/**
 * Fine-grained actions checked across projects/lists/labels/tasks. Kept as
 * one flat union (rather than nesting per-resource) so a call site just
 * asks `hasPermission(role, "task:delete")` without knowing which table
 * backs it.
 */
export type ProjectAction =
  | "project:edit" // name, description, due date
  | "project:delete"
  | "project:manageMembers" // invite/remove/change role - owner-only by design, kept here for completeness
  | "list:manage" // create/edit/delete/reorder columns
  | "label:manage" // create/edit/delete labels
  | "task:create"
  | "task:edit" // field edits + moving to another column
  | "task:delete"
  | "comment:create"

const PERMISSIONS: Record<ProjectRole, ReadonlySet<ProjectAction>> = {
  owner: new Set<ProjectAction>([
    "project:edit",
    "project:delete",
    "project:manageMembers",
    "list:manage",
    "label:manage",
    "task:create",
    "task:edit",
    "task:delete",
    "comment:create",
  ]),
  // runs the product side of the project day-to-day: can shape the board
  // and edit project details, but can't delete the project or touch
  // membership - those stay owner-only.
  product_owner: new Set<ProjectAction>([
    "project:edit",
    "list:manage",
    "label:manage",
    "task:create",
    "task:edit",
    "task:delete",
    "comment:create",
  ]),
  // runs process/board structure, same task/list/label rights as product
  // owner, but no say over project-level settings.
  scrum_master: new Set<ProjectAction>([
    "list:manage",
    "label:manage",
    "task:create",
    "task:edit",
    "task:delete",
    "comment:create",
  ]),
  // does the day-to-day work: create/edit/move tasks and comment, but can't
  // restructure the board (columns/labels) or delete tasks outright -
  // guards against accidental data loss from the largest role group.
  developer: new Set<ProjectAction>([
    "task:create",
    "task:edit",
    "comment:create",
  ]),
  // read-only participant: can see the board and weigh in via comments,
  // nothing else.
  stakeholder: new Set<ProjectAction>(["comment:create"]),
}

/**
 * `role` is nullable so call sites can pass the result of a role lookup
 * (e.g. `getProjectRole`) straight through - "no role" (not the owner, not
 * a member) always resolves to false rather than throwing.
 */
export function hasPermission(role: ProjectRole | null | undefined, action: ProjectAction): boolean {
  if (!role) return false
  return PERMISSIONS[role].has(action)
}