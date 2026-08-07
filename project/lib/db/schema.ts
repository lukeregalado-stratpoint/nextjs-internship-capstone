// TODO: Task 3.1 - Design database schema for users, projects, lists, and tasks
// TODO: Task 3.3 - Set up Drizzle ORM with type-safe schema definitions

/*
TODO: Implementation Notes for Interns:

1. Install Drizzle ORM dependencies:
   - drizzle-orm
   - drizzle-kit
   - @vercel/postgres (if using Vercel Postgres)
   - OR pg + @types/pg (if using regular PostgreSQL)

2. Define schemas for:
   - users (id, clerkId, email, name, createdAt, updatedAt)
   - projects (id, name, description, ownerId, createdAt, updatedAt, dueDate)
   - lists (id, name, projectId, position, createdAt, updatedAt)
   - tasks (id, title, description, listId, assigneeId, priority, dueDate, position, createdAt, updatedAt)
   - comments (id, content, taskId, authorId, createdAt, updatedAt)

3. Set up proper relationships between tables
4. Add indexes for performance
5. Configure migrations

Example structure:
import { pgTable, text, timestamp, integer, uuid } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ... other tables
*/

import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  pgEnum,
  index,
  jsonb,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"


export const priorityEnum = pgEnum("priority", ["low", "medium", "high"])
export const projectRoleEnum = pgEnum("project_role", ["product_owner", "scrum_master", "developer", "stakeholder"])
export const activityTypeEnum = pgEnum("activity_type", [
  "task_created",
  "title_changed",
  "description_changed",
  "status_changed",
  "priority_changed",
  "assignee_changed",
  "due_date_changed",
  "label_added",
  "label_removed",
  "comment_added",
  "comment_deleted",
])

// TABLES

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkId: text("clerk_id").notNull().unique(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("users_clerk_id_idx").on(table.clerkId),
    index("users_email_idx").on(table.email),
  ]
)
 
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dueDate: timestamp("due_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("projects_owner_id_idx").on(table.ownerId)]
)

export const projectMembers = pgTable(
  "project_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: projectRoleEnum("role").notNull().default("developer"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("project_members_project_id_idx").on(table.projectId),
    index("project_members_user_id_idx").on(table.userId),
  ]
)
 
export const lists = pgTable(
  "lists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("lists_project_id_idx").on(table.projectId)]
)
 
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    assigneeId: uuid("assignee_id").references(() => users.id, {
      onDelete: "set null",
    }),
    priority: priorityEnum("priority").notNull().default("medium"),
    dueDate: timestamp("due_date"),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("tasks_list_id_idx").on(table.listId),
    index("tasks_assignee_id_idx").on(table.assigneeId),
  ]
)
 
export const labels = pgTable(
  "labels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    // hex color, e.g. "#8B5CF6" — validated at the zod layer, not here
    color: text("color").notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("labels_project_id_idx").on(table.projectId)]
)

export const taskLabels = pgTable(
  "task_labels",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    labelId: uuid("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("task_labels_task_id_idx").on(table.taskId),
    index("task_labels_label_id_idx").on(table.labelId),
  ]
)

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    content: text("content").notNull(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("comments_task_id_idx").on(table.taskId),
    index("comments_author_id_idx").on(table.authorId),
  ]
)

// Append-only audit log for a task. One row per notable change (created,
// field edits, label add/remove, comment add/delete). `metadata` holds
// type-specific, human-renderable details — e.g. { from: "medium", to:
// "high" } for a priority_changed row, or { commentId } for comment_added —
// so the activity feed doesn't need to re-derive "what changed" after the
// fact. Rows are never updated or deleted once written; deleting the task
// cascades them away.
export const activities = pgTable(
  "activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: activityTypeEnum("type").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("activities_task_id_idx").on(table.taskId),
    index("activities_user_id_idx").on(table.userId),
  ]
)

// RELATIONS

export const usersRelations = relations(users, ({ many }) => ({
  ownedProjects: many(projects),
  assignedTasks: many(tasks),
  comments: many(comments),
  activities: many(activities),
  projectMemberships: many(projectMembers),
}))
 
export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  lists: many(lists),
  members: many(projectMembers),
  labels: many(labels),
}))

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
}))
 
export const listsRelations = relations(lists, ({ one, many }) => ({
  project: one(projects, {
    fields: [lists.projectId],
    references: [projects.id],
  }),
  tasks: many(tasks),
}))
 
export const tasksRelations = relations(tasks, ({ one, many }) => ({
  list: one(lists, {
    fields: [tasks.listId],
    references: [lists.id],
  }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
  }),
  comments: many(comments),
  activities: many(activities),
  taskLabels: many(taskLabels),
}))
 
export const commentsRelations = relations(comments, ({ one }) => ({
  task: one(tasks, {
    fields: [comments.taskId],
    references: [tasks.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}))

export const activitiesRelations = relations(activities, ({ one }) => ({
  task: one(tasks, {
    fields: [activities.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}))

export const labelsRelations = relations(labels, ({ one, many }) => ({
  project: one(projects, {
    fields: [labels.projectId],
    references: [projects.id],
  }),
  taskLabels: many(taskLabels),
}))

export const taskLabelsRelations = relations(taskLabels, ({ one }) => ({
  task: one(tasks, {
    fields: [taskLabels.taskId],
    references: [tasks.id],
  }),
  label: one(labels, {
    fields: [taskLabels.labelId],
    references: [labels.id],
  }),
}))

// INFERRED-TYPES
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
 
export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert

export type ProjectMember = typeof projectMembers.$inferSelect
export type NewProjectMember = typeof projectMembers.$inferInsert
 
export type List = typeof lists.$inferSelect
export type NewList = typeof lists.$inferInsert
 
export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
 
export type Comment = typeof comments.$inferSelect
export type NewComment = typeof comments.$inferInsert

export type Label = typeof labels.$inferSelect
export type NewLabel = typeof labels.$inferInsert

export type TaskLabel = typeof taskLabels.$inferSelect
export type NewTaskLabel = typeof taskLabels.$inferInsert

export type Activity = typeof activities.$inferSelect
export type NewActivity = typeof activities.$inferInsert
export type ActivityType = (typeof activityTypeEnum.enumValues)[number]