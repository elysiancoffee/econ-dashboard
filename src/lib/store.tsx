"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { LoaderTwo } from "../components/ui/loader";
import {
  fetchInitialData,
  dbAddUser,
  dbDeleteUser,
  dbUpdateUserRole,
  dbAddBoard,
  dbDeleteBoard,
  dbUpdateBoard,
  dbAddTask,
  dbAddTasks,
  dbUpdateTask,
  dbDeleteTask,
  dbAddSubmission,
  dbAddLog,
  dbAddShortcut,
  dbDeleteShortcut,
} from "./actions";

export type Role = "Boss" | "Underboss" | "Bagman" | "Consigliere" | "Associate" | "Custodian";

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
  notes?: string;
  timestamp: string;
}

export interface LogEntry {
  id: string;
  action: string;
  timestamp: string;
  username: string;
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
  addSubmission: (username: string, amount: number, notes?: string) => void;
  addLog: (action: string) => void;
  loginUser: (username: string, passwordInput: string) => boolean;
  logoutUser: () => void;
  addShortcut: (title: string, url: string) => void;
  deleteShortcut: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
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
  const [loading, setLoading] = useState(true);

  const handleSetRealUser = (user: User) => {
    setRealUserState(user);
    localStorage.setItem("admin_real_user", JSON.stringify(user));
  };

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

        // Determine the real user
        let initialRealUser: User | null = null;
        const localRealUser = localStorage.getItem("admin_real_user");
        if (localRealUser) {
          const parsed = JSON.parse(localRealUser);
          const exists = data.users.find((u) => u.id === parsed.id);
          if (exists) {
            initialRealUser = exists as User;
          }
        }
        
        if (initialRealUser) {
          setRealUserState(initialRealUser);
          localStorage.setItem("admin_real_user", JSON.stringify(initialRealUser));

          // Determine the current simulated user
          const localCurrentUser = localStorage.getItem("admin_current_user");
          let initialCurrentUser = initialRealUser;
          if (localCurrentUser) {
            const parsed = JSON.parse(localCurrentUser);
            const exists = data.users.find((u) => u.id === parsed.id);
            if (exists) {
              initialCurrentUser = exists as User;
            }
          }
          setCurrentUser(initialCurrentUser);
          localStorage.setItem("admin_current_user", JSON.stringify(initialCurrentUser));
        } else {
          setRealUserState(null);
          setCurrentUser({
            id: "guest",
            username: "Guest",
            role: "Custodian",
          });
        }
      } catch (err) {
        console.error("Failed to load initial DB data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const addLog = async (action: string) => {
    try {
      const newLogId = await dbAddLog(action, currentUser.id, currentUser.username);
      const newLog: LogEntry = {
        id: newLogId,
        action,
        username: currentUser.username,
        timestamp: new Date().toISOString(),
      };
      setLogs((prev) => [newLog, ...prev]);
    } catch (err) {
      console.error("Failed to add log:", err);
    }
  };

  const handleSetCurrentUser = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("admin_current_user", JSON.stringify(user));
    // Explicit log
    addLog(`Switched active profile to ${user.username} (${user.role})`);
  };

  const logoutUser = () => {
    addLog(`Logged out active profile: ${currentUser.username}`);
    setRealUserState(null);
    setCurrentUser({
      id: "guest",
      username: "Guest",
      role: "Custodian",
    });
    localStorage.removeItem("admin_real_user");
    localStorage.removeItem("admin_current_user");
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
      await addLog(`Created user account: ${username} with role ${role}`);
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
      await addLog(`Deleted user account: ${targetUser.username}`);
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
      await addLog(`Changed role of user ${targetUser.username} to ${role}`);
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
      await addLog(`Created task board: "${name}"`);
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
      await addLog(`Deleted task board: "${targetBoard.name}"`);
    } catch (err) {
      console.error("Failed to delete board:", err);
    }
  };

  const updateBoard = async (id: string, name: string, allowedRoles: Role[], allowedUsers: string[]) => {
    try {
      await dbUpdateBoard(id, name, allowedRoles, allowedUsers);
      setBoards((prev) => prev.map((b) => b.id === id ? { ...b, name, allowedRoles, allowedUsers } : b));
      await addLog(`Updated task board: "${name}"`);
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
      await addLog(`Created task: "${newTask.title}"`);
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
      await addLog(`Created ${newTasks.length} recurring tasks: "${newTasks[0]?.title}"`);
    } catch (err) {
      console.error("Failed to add recurring tasks:", err);
    }
  };

  const updateTask = async (updatedTask: Task) => {
    try {
      await dbUpdateTask(updatedTask);
      setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
      await addLog(`Updated task: "${updatedTask.title}"`);
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
      await addLog(`Deleted task: "${targetTask.title}"`);
    } catch (err) {
      console.error("Failed to delete task:", err);
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
      await addLog(`Submitted black chips: $${amount.toLocaleString()} by ${username}`);
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
      await addLog(`Added shortcut: "${title}" (${url})`);
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

  const loginUser = (username: string, passwordInput: string): boolean => {
    const match = users.find(
      (u) =>
        u.username.toLowerCase() === username.trim().toLowerCase() &&
        (u as any).password === passwordInput
    );
    if (match) {
      handleSetRealUser(match);
      handleSetCurrentUser(match);
      return true;
    }
    return false;
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
        addSubmission,
        addLog,
        loginUser,
        logoutUser,
        addShortcut,
        deleteShortcut,
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