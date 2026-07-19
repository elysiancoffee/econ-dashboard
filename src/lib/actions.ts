"use server";

import { db } from "./db/client";
import * as schema from "./db/schema";
import { eq } from "drizzle-orm";

export async function fetchInitialData() {
  const [users, boards, tasks, submissions, logs] = await Promise.all([
    db.select().from(schema.users),
    db.select().from(schema.boards),
    db.select().from(schema.tasks),
    db.select().from(schema.submissions),
    db.select().from(schema.logs),
  ]);
  return { users, boards, tasks, submissions, logs };
}

export async function dbAddUser(username: string, role: string, passwordHash: string) {
  const id = `u-${Date.now()}`;
  await db.insert(schema.users).values({ id, username, role, password: passwordHash });
  return id;
}

export async function dbDeleteUser(id: string) {
  await db.delete(schema.users).where(eq(schema.users.id, id));
}

export async function dbUpdateUserRole(id: string, role: string) {
  await db.update(schema.users).set({ role }).where(eq(schema.users.id, id));
}

export async function dbAddBoard(name: string, allowedRoles: any, allowedUsers: any) {
  const id = `b-${Date.now()}`;
  await db.insert(schema.boards).values({ id, name, allowedRoles, allowedUsers: allowedUsers || [] });
  return id;
}

export async function dbDeleteBoard(id: string) {
  await db.delete(schema.boards).where(eq(schema.boards.id, id));
}

export async function dbUpdateBoard(id: string, name: string, allowedRoles: any, allowedUsers: any) {
  await db.update(schema.boards).set({ name, allowedRoles, allowedUsers: allowedUsers || [] }).where(eq(schema.boards.id, id));
}

export async function dbAddTask(task: {
  boardId: string;
  title: string;
  description: string;
  assignedUserId: string;
  priority: string;
  status: string;
  dueDate: string;
  recurrence?: string;
  recurrenceParentId?: string | null;
}) {
  const id = `t-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  await db.insert(schema.tasks).values({
    id,
    boardId: task.boardId,
    title: task.title,
    description: task.description,
    assignedUserId: task.assignedUserId,
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate,
    commentsCount: 0,
    recurrence: task.recurrence || "none",
    recurrenceParentId: task.recurrenceParentId || null,
  });
  return id;
}

export async function dbAddTasks(tasksList: {
  boardId: string;
  title: string;
  description: string;
  assignedUserId: string;
  priority: string;
  status: string;
  dueDate: string;
  recurrence?: string;
  recurrenceParentId?: string | null;
}[]) {
  const insertedTasks = tasksList.map((task, idx) => {
    const id = `t-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
    return {
      id,
      boardId: task.boardId,
      title: task.title,
      description: task.description,
      assignedUserId: task.assignedUserId,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
      commentsCount: 0,
      recurrence: task.recurrence || "none",
      recurrenceParentId: task.recurrenceParentId || null,
    };
  });

  await db.insert(schema.tasks).values(insertedTasks);
  return insertedTasks.map((t) => t.id);
}

export async function dbUpdateTask(task: {
  id: string;
  boardId: string;
  title: string;
  description: string;
  assignedUserId: string;
  priority: string;
  status: string;
  dueDate: string;
  commentsCount: number;
  recurrence?: string;
  recurrenceParentId?: string | null;
}) {
  await db.update(schema.tasks).set({
    boardId: task.boardId,
    title: task.title,
    description: task.description,
    assignedUserId: task.assignedUserId,
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate,
    commentsCount: task.commentsCount,
    recurrence: task.recurrence || "none",
    recurrenceParentId: task.recurrenceParentId || null,
  }).where(eq(schema.tasks.id, task.id));
}

export async function dbDeleteTask(id: string) {
  await db.delete(schema.tasks).where(eq(schema.tasks.id, id));
}

export async function dbAddSubmission(username: string, amount: number, notes?: string) {
  const id = `bc-${Date.now()}`;
  await db.insert(schema.submissions).values({
    id,
    username,
    amount,
    notes: notes || null,
    timestamp: new Date().toISOString(),
  });
  return id;
}

export async function dbAddLog(action: string, uid: string, username: string) {
  const id = `l-${Date.now()}`;
  await db.insert(schema.logs).values({
    id,
    uid,
    action,
    username,
    timestamp: new Date().toISOString(),
  });
  return id;
}
