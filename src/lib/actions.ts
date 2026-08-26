"use server";

import { db } from "./db/client";
import * as schema from "./db/schema";
import { eq, sql, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function fetchInitialData() {
  const [users, boards, tasks, submissions, logs, shortcuts, notifications] = await Promise.all([
    db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        role: schema.users.role,
        isOnline: schema.users.isOnline,
        lastSeen: schema.users.lastSeen,
      })
      .from(schema.users),
    db.select().from(schema.boards),
    db.select().from(schema.tasks),
    db.select().from(schema.submissions),
    db.select().from(schema.logs),
    db.select().from(schema.shortcuts),
    db.select().from(schema.notifications),
  ]);
  return { users, boards, tasks, submissions, logs, shortcuts, notifications };
}

export async function dbAddUser(username: string, role: string, passwordPlain: string) {
  const id = `u-${Date.now()}`;
  const passwordHash = await bcrypt.hash(passwordPlain, 10);
  await db.insert(schema.users).values({
    id,
    username,
    password: passwordHash,
    role,
    isOnline: false,
    lastSeen: null,
  });
  return id;
}

export async function dbDeleteUser(id: string) {
  await db.delete(schema.users).where(eq(schema.users.id, id));
}

export async function dbUpdateUserRole(id: string, role: string) {
  await db.update(schema.users).set({ role }).where(eq(schema.users.id, id));
}

export async function dbSetUserOnline(id: string, online: boolean) {
  const now = new Date().toISOString();
  await db
    .update(schema.users)
    .set({
      isOnline: online,
      lastSeen: online ? now : null,
    })
    .where(eq(schema.users.id, id));
}

export async function dbHeartbeat(id: string) {
  const now = new Date().toISOString();
  await db
    .update(schema.users)
    .set({
      isOnline: true,
      lastSeen: now,
    })
    .where(eq(schema.users.id, id));
}

export async function dbForceUserOffline(id: string) {
  await db
    .update(schema.users)
    .set({
      isOnline: false,
      lastSeen: null,
    })
    .where(eq(schema.users.id, id));
}

export async function dbForceLogoutUser(id: string) {
  await db
    .update(schema.users)
    .set({
      isOnline: false,
      lastSeen: null,
      sessionVersion: sql`${schema.users.sessionVersion} + 1`,
    })
    .where(eq(schema.users.id, id));
}

export async function dbResetAllOnlineUsers() {
  await db
    .update(schema.users)
    .set({
      isOnline: false,
      lastSeen: null,
    });
}

export async function fetchOnlineUsers() {
  // Threshold: active within the last 45 seconds
  const threshold = new Date(Date.now() - 45 * 1000).toISOString();

  const candidates = await db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      role: schema.users.role,
      lastSeen: schema.users.lastSeen,
      isOnline: schema.users.isOnline,
    })
    .from(schema.users)
    .where(eq(schema.users.isOnline, true));

  const activeUsers: { id: string; username: string; role: string }[] = [];
  const expiredIds: string[] = [];

  for (const u of candidates) {
    if (u.lastSeen && u.lastSeen >= threshold) {
      activeUsers.push({ id: u.id, username: u.username, role: u.role });
    } else {
      expiredIds.push(u.id);
    }
  }

  // Auto-clean expired sessions in background
  if (expiredIds.length > 0) {
    db.update(schema.users)
      .set({ isOnline: false, lastSeen: null })
      .where(inArray(schema.users.id, expiredIds))
      .catch(() => {});
  }

  return activeUsers;
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

  // Create notification
  const notifId = `n-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  await db.insert(schema.notifications).values({
    id: notifId,
    userId: task.assignedUserId,
    taskId: id,
    message: `You have been assigned a new task: "${task.title}"`,
    isRead: false,
    createdAt: new Date().toISOString(),
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

  // Insert notifications for all inserted tasks
  const notifs = insertedTasks.map((t, idx) => ({
    id: `n-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
    userId: t.assignedUserId,
    taskId: t.id,
    message: `You have been assigned a new task: "${t.title}"`,
    isRead: false,
    createdAt: new Date().toISOString(),
  }));
  if (notifs.length > 0) {
    await db.insert(schema.notifications).values(notifs);
  }

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
  const existing = await db.select().from(schema.tasks).where(eq(schema.tasks.id, task.id)).limit(1);
  const oldAssignee = existing[0]?.assignedUserId;

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

  if (oldAssignee && oldAssignee !== task.assignedUserId) {
    const notifId = `n-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await db.insert(schema.notifications).values({
      id: notifId,
      userId: task.assignedUserId,
      taskId: task.id,
      message: `You have been assigned a task (reassigned): "${task.title}"`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }
}

export async function dbDeleteTask(id: string) {
  await db.delete(schema.tasks).where(eq(schema.tasks.id, id));
}

export async function dbDeleteTasks(ids: string[]) {
  if (!ids || ids.length === 0) return;
  await db.delete(schema.tasks).where(inArray(schema.tasks.id, ids));
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

export async function dbAddShortcut(userId: string, title: string, url: string) {
  const id = `s-${Date.now()}`;
  await db.insert(schema.shortcuts).values({
    id,
    userId,
    title,
    url,
  });
  return id;
}

export async function dbDeleteShortcut(id: string) {
  await db.delete(schema.shortcuts).where(eq(schema.shortcuts.id, id));
}

export async function dbAddNotification(userId: string, taskId: string | null, message: string) {
  const id = `n-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  await db.insert(schema.notifications).values({
    id,
    userId,
    taskId,
    message,
    isRead: false,
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function dbMarkNotificationAsRead(id: string) {
  await db.update(schema.notifications).set({ isRead: true }).where(eq(schema.notifications.id, id));
}

export async function dbFetchTeamSchedule() {
  try {
    const rows = await db
      .select()
      .from(schema.teamSchedule)
      .where(eq(schema.teamSchedule.id, "main"))
      .limit(1);
    if (rows.length > 0) {
      return rows[0].data as any;
    }
  } catch (err) {
    console.error("Error fetching team schedule from DB:", err);
  }
  return null;
}

export async function dbSaveTeamSchedule(data: any) {
  try {
    const existing = await db
      .select({ id: schema.teamSchedule.id })
      .from(schema.teamSchedule)
      .where(eq(schema.teamSchedule.id, "main"))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.teamSchedule)
        .set({
          data,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.teamSchedule.id, "main"));
    } else {
      await db.insert(schema.teamSchedule).values({
        id: "main",
        data,
        updatedAt: new Date().toISOString(),
      });
    }
    return { success: true };
  } catch (err) {
    console.error("Error saving team schedule to DB:", err);
    return { success: false, error: String(err) };
  }
}

export async function dbFetchPublicSchedule() {
  try {
    const [scheduleData, users] = await Promise.all([
      dbFetchTeamSchedule(),
      db
        .select({
          id: schema.users.id,
          username: schema.users.username,
          role: schema.users.role,
        })
        .from(schema.users),
    ]);
    return {
      schedule: scheduleData,
      users,
    };
  } catch (err) {
    console.error("Error fetching public schedule data:", err);
    return { schedule: null, users: [] };
  }
}

async function ensureBlackArchiveTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "black_archive" (
        "id" text PRIMARY KEY,
        "title" text NOT NULL DEFAULT 'Booth items',
        "data" jsonb NOT NULL,
        "updated_at" text NOT NULL
      );
    `);
  } catch (err) {
    console.warn("Could not auto-create black_archive table:", err);
  }
}

export async function dbFetchBlackArchive() {
  try {
    await ensureBlackArchiveTable();
    const rows = await db
      .select()
      .from(schema.blackArchive)
      .where(eq(schema.blackArchive.id, "main"))
      .limit(1);
    if (rows.length > 0) {
      return rows[0].data as any;
    }
  } catch (err) {
    console.error("Error fetching black archive from DB:", err);
  }
  return null;
}

export async function dbSaveBlackArchive(data: any) {
  try {
    await ensureBlackArchiveTable();
    const existing = await db
      .select({ id: schema.blackArchive.id })
      .from(schema.blackArchive)
      .where(eq(schema.blackArchive.id, "main"))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.blackArchive)
        .set({
          title: data.title || "Booth items",
          data,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.blackArchive.id, "main"));
    } else {
      await db.insert(schema.blackArchive).values({
        id: "main",
        title: data.title || "Booth items",
        data,
        updatedAt: new Date().toISOString(),
      });
    }
    return { success: true };
  } catch (err) {
    console.error("Error saving black archive to DB:", err);
    return { success: false, error: String(err) };
  }
}
