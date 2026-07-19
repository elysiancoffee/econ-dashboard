import * as schema from "../src/lib/db/schema";
import { db } from "../index";

type InsertTask = typeof schema.tasks.$inferInsert;
type SelectTask = typeof schema.tasks.$inferSelect;

const task: InsertTask = {
  id: "test",
  boardId: "b-1",
  title: "title",
  description: "desc",
  assignedUserId: "u-1",
  priority: "Low",
  status: "In Progress",
  dueDate: "2026-07-16",
  commentsCount: 0,
};

console.log(task);
