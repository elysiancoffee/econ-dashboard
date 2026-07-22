import { pgTable, text, integer, jsonb, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password_hash").notNull(),
  role: text("role")
    .notNull()
    .references(() => roles.name, { onDelete: "cascade" }),
  isOnline: boolean("isOnline").notNull().default(false), // true | false
});

export const boards = pgTable("boards", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  allowedRoles: jsonb("allowed_roles").notNull(), // Role[]
  allowedUsers: jsonb("allowed_users").notNull().default([]), // string[] (user IDs)
});

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  boardId: text("board_id")
    .notNull()
    .references(() => boards.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  assignedUserId: text("assigned_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  priority: text("priority").notNull(), // "Low" | "Medium" | "High" | "Critical"
  status: text("status").notNull(), // "Not Started" | "In Progress" | "Waiting" | "Completed" | "Cancelled"
  dueDate: text("due_date").notNull(),
  commentsCount: integer("comments_count").notNull().default(0),
  recurrence: text("recurrence").notNull().default("none"),
  recurrenceParentId: text("recurrence_parent_id"),
});

export const submissions = pgTable("submissions", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  amount: integer("amount").notNull(),
  notes: text("notes"),
  timestamp: text("timestamp").notNull(),
});

export const logs = pgTable("logs", {
  id: text("id").primaryKey(),
  uid: text("uid")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  username: text("username").notNull(),
  action: text("action").notNull(),
  timestamp: text("timestamp").notNull(),
});

export const roles = pgTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(), // "Boss" | "Bagman" | "Consigliere" | "Associate" | "Custodian"
});

export const permissions = pgTable("permissions", {
  id: text("id").primaryKey(),
  roleId: text("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  boardId: text("board_id")
    .notNull()
    .references(() => boards.id, { onDelete: "cascade" }),
  canCreateTask: boolean("can_create_task").notNull().default(false),
  canEditTask: boolean("can_edit_task").notNull().default(false),
  canDeleteTask: boolean("can_delete_task").notNull().default(false),
  canViewBoard: boolean("can_view_board").notNull().default(false),
});

export const staffProgress = pgTable("staff_progress", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  boardId: text("board_id")
    .notNull()
    .references(() => boards.id, { onDelete: "cascade" }),
  progressPercentage: integer("progress_percentage").notNull().default(0),
  totalTasksCompleted : integer("total_tasks_completed").notNull().default(0),
});

export const shortcuts = pgTable("shortcuts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  url: text("url").notNull(),
});