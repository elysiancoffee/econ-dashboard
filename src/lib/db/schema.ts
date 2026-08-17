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

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  taskId: text("task_id")
    .references(() => tasks.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: text("created_at").notNull(),
});

export const chipsTrivia = pgTable("chips_trivia", {
  id: text("id").primaryKey(),
  visibilityFreq: integer("visibility_freq").notNull().default(1),
  trivia: jsonb("trivia").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const mafiaGames = pgTable("mafia_games", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("setup"), // 'setup' | 'in_progress' | 'finished' | 'archived'
  currentPhase: text("current_phase").notNull().default("Day"), // 'Day' | 'Night'
  phaseNumber: integer("phase_number").notNull().default(1),
  deadline: text("deadline"),
  settings: jsonb("settings").notNull().default({}),
  createdAt: text("created_at").notNull(),
  createdBy: text("created_by").notNull().default("Boss"),
});

export const mafiaFactions = pgTable("mafia_factions", {
  id: text("id").primaryKey(),
  gameId: text("game_id").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#ef4444"),
  isEvil: boolean("is_evil").notNull().default(false),
  winCondition: text("win_condition"),
});

export const mafiaRoles = pgTable("mafia_roles", {
  id: text("id").primaryKey(),
  gameId: text("game_id").notNull(),
  factionId: text("faction_id"),
  name: text("name").notNull(),
  alignment: text("alignment").notNull().default("Town"),
  priority: integer("priority").notNull().default(3), // 1: Block, 2: Protect, 3: Kill, 4: Investigate
  abilityDescription: text("ability_description"),
  nightActionType: text("night_action_type").notNull().default("none"), // 'none' | 'kill' | 'protect' | 'investigate' | 'block' | 'track' | 'watch' | 'custom'
  maxUses: integer("max_uses"), // null or <= 0 = unlimited, > 0 = limited charges (e.g. 1-shot, 2-shot)
  actionsConfig: jsonb("actions_config").$type<any[]>(), // array of multiple action objects: [{ id, name, type, maxUses }]
});

export const mafiaPlayers = pgTable("mafia_players", {
  id: text("id").primaryKey(),
  gameId: text("game_id").notNull(),
  username: text("username").notNull(),
  roleId: text("role_id"),
  isAlive: boolean("is_alive").notNull().default(true),
  deathPhase: text("death_phase"),
  deathCause: text("death_cause"),
  claimedRole: text("claimed_role"),
  notes: text("notes"),
});

export const mafiaActions = pgTable("mafia_actions", {
  id: text("id").primaryKey(),
  gameId: text("game_id").notNull(),
  phase: text("phase").notNull().default("Night"),
  phaseNumber: integer("phase_number").notNull().default(1),
  sourcePlayerId: text("source_player_id").notNull(),
  actionConfigId: text("action_config_id"), // ties to specific action inside a multi-action role
  targetPlayerId: text("target_player_id"),
  actionType: text("action_type").notNull(),
  result: text("result"),
  isResolved: boolean("is_resolved").notNull().default(false),
  notes: text("notes"),
});

export const mafiaVotes = pgTable("mafia_votes", {
  id: text("id").primaryKey(),
  gameId: text("game_id").notNull(),
  phaseNumber: integer("phase_number").notNull().default(1),
  voterPlayerId: text("voter_player_id").notNull(),
  targetPlayerId: text("target_player_id"), // null if unvoted
  timestamp: text("timestamp").notNull(),
});

export const mafiaPhaseLogs = pgTable("mafia_phase_logs", {
  id: text("id").primaryKey(),
  gameId: text("game_id").notNull(),
  phase: text("phase").notNull(),
  phaseNumber: integer("phase_number").notNull(),
  summary: text("summary").notNull(),
  createdAt: text("created_at").notNull(),
});