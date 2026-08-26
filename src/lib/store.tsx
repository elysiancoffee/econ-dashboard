"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { LoaderTwo } from "../components/ui/loader";
import {
  fetchInitialData,
  dbAddUser,
  dbDeleteUser,
  dbUpdateUserRole,
  dbSetUserOnline,
  dbHeartbeat,
  dbForceUserOffline,
  dbForceLogoutUser,
  dbResetAllOnlineUsers,
  fetchOnlineUsers,
  dbAddBoard,
  dbDeleteBoard,
  dbUpdateBoard,
  dbAddTask,
  dbAddTasks,
  dbUpdateTask,
  dbDeleteTask,
  dbDeleteTasks,
  dbAddSubmission,
  dbAddLog,
  dbAddShortcut,
  dbDeleteShortcut,
  dbAddNotification,
  dbMarkNotificationAsRead,
} from "./actions";

export type Role = "Boss" | "Underboss" | "Bagman" | "Consigliere" | "Associate" | "Custodian";

export interface Notification {
  id: string;
  userId: string;
  taskId: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  role: Role;
  password?: string;
}

export interface Board {
  id: string;
  name: string;
  allowedRoles: Role[];
  allowedUsers: string[];
}

export interface Task {
  id: string;
  boardId: string;
  title: string;
  description: string;
  assignedUserId: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Not Started" | "In Progress" | "Waiting" | "Completed" | "Cancelled";
  dueDate: string;
  commentsCount: number;
  recurrence?: string;
  recurrenceParentId?: string | null;
}

export interface BlackChipSubmission {
  id: string;
  username: string;
  amount: number;
  notes?: string | null;
  timestamp: string;
}

export interface LogEntry {
  id: string;
  action: string;
  username: string;
  timestamp: string;
}

export interface Shortcut {
  id: string;
  userId: string;
  title: string;
  url: string;
}

interface AppContextType {
  currentUser: User;
  realUser: User | null;
  users: User[];
  boards: Board[];
  tasks: Task[];
  submissions: BlackChipSubmission[];
  logs: LogEntry[];
  shortcuts: Shortcut[];
  notifications: Notification[];
  onlineUsers: { id: string; username: string; role: string }[];
  setCurrentUser: (user: User) => void;
  addUser: (username: string, role: Role, password?: string) => void;
  deleteUser: (id: string) => void;
  updateUserRole: (id: string, role: Role) => void;
  addBoard: (name: string, allowedRoles: Role[], allowedUsers: string[]) => void;
  deleteBoard: (id: string) => void;
  updateBoard: (id: string, name: string, allowedRoles: Role[], allowedUsers: string[]) => void;
  addTask: (task: Omit<Task, "id" | "commentsCount">) => void;
  addTasks: (tasks: Omit<Task, "id" | "commentsCount">[]) => Promise<void>;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  deleteTasks: (ids: string[]) => Promise<void>;
  addSubmission: (username: string, amount: number, notes?: string) => void;
  addLog: (action: string) => void;
  loginUser: (username: string, passwordInput: string) => Promise<boolean>;
  logoutUser: () => void;
  forceUserOffline: (userId: string) => Promise<void>;
  forceLogoutUser: (userId: string) => Promise<void>;
  resetAllOnlinePresence: () => Promise<void>;
  addShortcut: (title: string, url: string) => void;
  deleteShortcut: (id: string) => void;
  markNotificationAsRead: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  // Track whether we've already logged "came online" for this session
  const hasLoggedOnline = React.useRef(false);

  const [currentUser, setCurrentUser] = useState<User>({
    id: "loading",
    username: "Loading",
    role: "Custodian",
  });
  const [realUser, setRealUserState] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<BlackChipSubmission[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<{ id: string; username: string; role: string }[]>([]);

  // Sync NextAuth session with realUser and currentUser
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const authUser: User = {
        id: session.user.id,
        username: session.user.username || session.user.name || "User",
        role: (session.user.role as Role) || "Custodian",
      };
      setRealUserState(authUser);

      // Restore simulated profile for Boss if present
      if (authUser.role === "Boss") {
        const savedSim = localStorage.getItem("admin_simulated_user");
        if (savedSim) {
          try {
            const parsed = JSON.parse(savedSim);
            setCurrentUser(parsed);
          } catch {
            setCurrentUser(authUser);
          }
        } else {
          setCurrentUser(authUser);
        }
      } else {
        setCurrentUser(authUser);
      }

      // Log "came online" only once per browser session, not on every page navigation
      if (!hasLoggedOnline.current) {
        hasLoggedOnline.current = true;
        // Set isOnline flag in DB and add log
        dbSetUserOnline(authUser.id, true).catch(console.error);
        fetchOnlineUsers().then(setOnlineUsers).catch(console.error);
        // Use a small delay so the addLog fn has the correct user context
        setTimeout(() => {
          addLogDirect(`${authUser.username} came online.`, authUser.id, authUser.username);
        }, 500);
      }
    } else if (status === "unauthenticated") {
      hasLoggedOnline.current = false;
      setOnlineUsers([]);
      setRealUserState(null);
      setCurrentUser({
        id: "guest",
        username: "Guest",
        role: "Custodian",
      });
    }
  }, [session, status]);

  // beforeunload: mark user offline when tab is closed
  useEffect(() => {
    if (!realUser) return;
    const handleUnload = () => {
      // Use sendBeacon so the request fires even as the page unloads
      const payload = JSON.stringify({ userId: realUser.id });
      navigator.sendBeacon("/api/presence/offline", new Blob([payload], { type: "application/json" }));
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [realUser]);

  // Heartbeat: update lastSeen every 20s while tab is active/visible
  useEffect(() => {
    if (!realUser) return;
    dbHeartbeat(realUser.id).catch(console.error);

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        dbHeartbeat(realUser.id).catch(console.error);
      }
    }, 20_000);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        dbHeartbeat(realUser.id).catch(console.error);
        fetchOnlineUsers().then(setOnlineUsers).catch(console.error);
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [realUser]);

  // Poll for online users every 5 seconds (skips when tab is hidden)
  useEffect(() => {
    if (!realUser) return;
    const poll = () => {
      if (document.visibilityState === "visible") {
        fetchOnlineUsers().then(setOnlineUsers).catch(console.error);
      }
    };
    const interval = setInterval(poll, 5_000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [realUser]);

  // Load from database on client mount
  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchInitialData();
        setUsers(data.users as User[]);
        setBoards(data.boards as Board[]);
        setTasks(data.tasks as Task[]);
        setSubmissions(data.submissions as BlackChipSubmission[]);
        setLogs(data.logs as LogEntry[]);
        setShortcuts((data.shortcuts || []) as Shortcut[]);
        setNotifications((data.notifications || []) as Notification[]);
      } catch (err) {
        console.error("Failed to load initial DB data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Direct log helper (can be called without currentUser being set yet)
  const addLogDirect = async (action: string, uid: string, username: string) => {
    try {
      const newLogId = await dbAddLog(action, uid, username);
      const newLog: LogEntry = { id: newLogId, action, username, timestamp: new Date().toISOString() };
      setLogs((prev) => [newLog, ...prev]);
    } catch (err) {
      console.error("Failed to add log:", err);
    }
  };

  const addLog = async (action: string, overrideUserId?: string, overrideUsername?: string) => {
    try {
      const uid = overrideUserId || currentUser.id;
      const username = overrideUsername || currentUser.username;
      const newLogId = await dbAddLog(action, uid, username);
      const newLog: LogEntry = {
        id: newLogId,
        action,
        username,
        timestamp: new Date().toISOString(),
      };
      setLogs((prev) => [newLog, ...prev]);
    } catch (err) {
      console.error("Failed to add log:", err);
    }
  };

  const handleSetCurrentUser = (user: User) => {
    setCurrentUser(user);
    if (realUser?.role === "Boss") {
      localStorage.setItem("admin_simulated_user", JSON.stringify(user));
    }
    // Always log as the real authenticated user, not the simulated profile
    const actor = realUser ?? currentUser;
    addLog(`Switched view to @${user.username} (${user.role}).`, actor.id, actor.username);
  };

  const logoutUser = async () => {
    const u = currentUser;
    if (realUser) {
      try {
        await dbSetUserOnline(realUser.id, false);
      } catch (err) {
        console.error("Failed to mark user offline:", err);
      }
    }
    try {
      await addLog(`${u.username} signed out.`, u.id, u.username);
    } catch (err) {
      console.error("Failed to add logout log:", err);
    }
    localStorage.removeItem("admin_simulated_user");
    localStorage.removeItem("admin_current_user");
    localStorage.removeItem("admin_real_user");
    setRealUserState(null);
    setCurrentUser({
      id: "guest",
      username: "Guest",
      role: "Custodian",
    });
    hasLoggedOnline.current = false;
    await signOut({ callbackUrl: "/login", redirect: true });
    window.location.href = "/login";
  };

  const forceUserOffline = async (userId: string) => {
    try {
      await dbForceUserOffline(userId);
      const online = await fetchOnlineUsers();
      setOnlineUsers(online);
      const target = users.find((u) => u.id === userId);
      await addLog(`Boss forced @${target?.username || userId} offline.`);
    } catch (err) {
      console.error("Failed to force user offline:", err);
    }
  };

  const forceLogoutUser = async (userId: string) => {
    try {
      await dbForceLogoutUser(userId);
      const online = await fetchOnlineUsers();
      setOnlineUsers(online);
      const target = users.find((u) => u.id === userId);
      await addLog(`Boss forced logout & revoked session for @${target?.username || userId}.`);
    } catch (err) {
      console.error("Failed to force logout user:", err);
    }
  };

  const resetAllOnlinePresence = async () => {
    try {
      await dbResetAllOnlineUsers();
      if (realUser) {
        await dbHeartbeat(realUser.id);
      }
      const online = await fetchOnlineUsers();
      setOnlineUsers(online);
      await addLog("Admin reset all online presence states.");
    } catch (err) {
      console.error("Failed to reset online presence:", err);
    }
  };

  const addUser = async (username: string, role: Role, password?: string) => {
    try {
      const newId = await dbAddUser(username, role, password || "default-pass");
      const newUser: User = {
        id: newId,
        username,
        role: role as Role,
      };
      setUsers((prev) => [...prev, newUser]);
      await addLog(`Added @${username} to the team as ${role}.`);
    } catch (err) {
      console.error("Failed to add user:", err);
    }
  };

  const deleteUser = async (id: string) => {
    const targetUser = users.find((u) => u.id === id);
    if (!targetUser) return;
    try {
      await dbDeleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      await addLog(`Removed @${targetUser.username} from the team.`);
    } catch (err) {
      console.error("Failed to delete user:", err);
    }
  };

  const updateUserRole = async (id: string, role: Role) => {
    const targetUser = users.find((u) => u.id === id);
    if (!targetUser) return;
    try {
      await dbUpdateUserRole(id, role);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: role as Role } : u)));
      await addLog(`Promoted @${targetUser.username} to ${role}.`);
    } catch (err) {
      console.error("Failed to update user role:", err);
    }
  };

  const addBoard = async (name: string, allowedRoles: Role[], allowedUsers: string[]) => {
    try {
      const newId = await dbAddBoard(name, allowedRoles, allowedUsers);
      const newBoard: Board = {
        id: newId,
        name,
        allowedRoles: allowedRoles as Role[],
        allowedUsers,
      };
      setBoards((prev) => [...prev, newBoard]);
      await addLog(`Created board "${name}".`);
    } catch (err) {
      console.error("Failed to add board:", err);
    }
  };

  const deleteBoard = async (id: string) => {
    const targetBoard = boards.find((b) => b.id === id);
    if (!targetBoard) return;
    try {
      await dbDeleteBoard(id);
      setBoards((prev) => prev.filter((b) => b.id !== id));
      setTasks((prev) => prev.filter((t) => t.boardId !== id));
      await addLog(`Deleted board "${targetBoard.name}".`);
    } catch (err) {
      console.error("Failed to delete board:", err);
    }
  };

  const updateBoard = async (id: string, name: string, allowedRoles: Role[], allowedUsers: string[]) => {
    try {
      await dbUpdateBoard(id, name, allowedRoles, allowedUsers);
      setBoards((prev) => prev.map((b) => b.id === id ? { ...b, name, allowedRoles, allowedUsers } : b));
      await addLog(`Updated board settings for "${name}".`);
    } catch (err) {
      console.error("Failed to update board:", err);
    }
  };

  const addTask = async (taskInput: Omit<Task, "id" | "commentsCount">) => {
    try {
      const newId = await dbAddTask(taskInput);
      const newTask: Task = {
        ...taskInput,
        id: newId,
        commentsCount: 0,
      };
      setTasks((prev) => [...prev, newTask]);
      
      const newNotif: Notification = {
        id: `n-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: taskInput.assignedUserId,
        taskId: newId,
        message: `You have been assigned a new task: "${taskInput.title}"`,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [...prev, newNotif]);

      const assignee = users.find((u) => u.id === newTask.assignedUserId);
      await addLog(`Assigned "${newTask.title}" to @${assignee?.username ?? newTask.assignedUserId}.`);
    } catch (err) {
      console.error("Failed to add task:", err);
    }
  };

  const addTasks = async (tasksInput: Omit<Task, "id" | "commentsCount">[]) => {
    try {
      const newIds = await dbAddTasks(tasksInput);
      const newTasks: Task[] = tasksInput.map((t, idx) => ({
        ...t,
        id: newIds[idx],
        commentsCount: 0,
      }));
      setTasks((prev) => [...prev, ...newTasks]);

      const newNotifs: Notification[] = newTasks.map((t, idx) => ({
        id: `n-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        userId: t.assignedUserId,
        taskId: t.id,
        message: `You have been assigned a new task: "${t.title}"`,
        isRead: false,
        createdAt: new Date().toISOString(),
      }));
      setNotifications((prev) => [...prev, ...newNotifs]);

      await addLog(`Scheduled ${newTasks.length} recurring tasks for "${newTasks[0]?.title ?? 'task'}".`);
    } catch (err) {
      console.error("Failed to add recurring tasks:", err);
    }
  };

  const updateTask = async (updatedTask: Task) => {
    try {
      const oldTask = tasks.find((t) => t.id === updatedTask.id);
      await dbUpdateTask(updatedTask);
      setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));

      if (oldTask && oldTask.assignedUserId !== updatedTask.assignedUserId) {
        const newNotif: Notification = {
          id: `n-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          userId: updatedTask.assignedUserId,
          taskId: updatedTask.id,
          message: `You have been assigned a task (reassigned): "${updatedTask.title}"`,
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        setNotifications((prev) => [...prev, newNotif]);
      }

      if (oldTask && oldTask.status !== updatedTask.status) {
        await addLog(`Marked "${updatedTask.title}" as ${updatedTask.status}.`);
      } else if (oldTask && oldTask.assignedUserId !== updatedTask.assignedUserId) {
        const newAssignee = users.find((u) => u.id === updatedTask.assignedUserId);
        await addLog(`Reassigned "${updatedTask.title}" to @${newAssignee?.username ?? updatedTask.assignedUserId}.`);
      } else {
        await addLog(`Edited task "${updatedTask.title}".`);
      }
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  };

  const deleteTask = async (id: string) => {
    const targetTask = tasks.find((t) => t.id === id);
    if (!targetTask) return;
    try {
      await dbDeleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      await addLog(`Deleted task "${targetTask.title}".`);
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const deleteTasks = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    try {
      await dbDeleteTasks(ids);
      setTasks((prev) => prev.filter((t) => !ids.includes(t.id)));
    } catch (err) {
      console.error("Failed to delete tasks:", err);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await dbMarkNotificationAsRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const addSubmission = async (username: string, amount: number, notes?: string) => {
    try {
      const newId = await dbAddSubmission(username, amount, notes);
      const newSubmission: BlackChipSubmission = {
        id: newId,
        username,
        amount,
        notes,
        timestamp: new Date().toISOString(),
      };
      setSubmissions((prev) => [newSubmission, ...prev]);
      await addLog(`Logged $${amount.toLocaleString()} black chip submission for @${username}.`);
    } catch (err) {
      console.error("Failed to add submission:", err);
    }
  };

  const addShortcut = async (title: string, url: string) => {
    try {
      const newId = await dbAddShortcut(currentUser.id, title, url);
      const newShortcut: Shortcut = {
        id: newId,
        userId: currentUser.id,
        title,
        url,
      };
      setShortcuts((prev) => [...prev, newShortcut]);
      await addLog(`Added shortcut "${title}".${ url ? ` (${url})` : '' }`);
    } catch (err) {
      console.error("Failed to add shortcut:", err);
    }
  };

  const deleteShortcut = async (id: string) => {
    const target = shortcuts.find((s) => s.id === id);
    if (!target) return;
    try {
      await dbDeleteShortcut(id);
      setShortcuts((prev) => prev.filter((s) => s.id !== id));
      await addLog(`Deleted shortcut: "${target.title}"`);
    } catch (err) {
      console.error("Failed to delete shortcut:", err);
    }
  };

  const loginUser = async (username: string, passwordInput: string): Promise<boolean> => {
    try {
      const res = await signIn("credentials", {
        username: username.trim(),
        password: passwordInput,
        redirect: false,
      });
      if (res?.error) {
        return false;
      }
      return true;
    } catch (err) {
      console.error("Login failed:", err);
      return false;
    }
  };


  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#09090b]">
        <div className="flex flex-col items-center gap-4">
          <LoaderTwo />
          <p className="text-sm text-neutral-400 animate-pulse">Loading secure session...</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{
        currentUser,
        realUser,
        users,
        boards,
        tasks,
        submissions,
        logs,
        shortcuts,
        notifications,
        onlineUsers,
        setCurrentUser: handleSetCurrentUser,
        addUser,
        deleteUser,
        updateUserRole,
        addBoard,
        deleteBoard,
        updateBoard,
        addTask,
        addTasks,
        updateTask,
        deleteTask,
        deleteTasks,
        addSubmission,
        addLog,
        loginUser,
        logoutUser,
        forceUserOffline,
        forceLogoutUser,
        resetAllOnlinePresence,
        addShortcut,
        deleteShortcut,
        markNotificationAsRead,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}