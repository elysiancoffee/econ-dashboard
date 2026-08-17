"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp, Task, User, Role, Shortcut } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Clock, CheckCircle2, AlertCircle, Play, Pause, RotateCcw, 
  Plus, Trash2, Edit, Bookmark, Sparkles, ExternalLink, 
  Globe, FileText, CheckSquare, Eye, RefreshCw, Repeat, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { cn, isTaskVisible, isCurrentMonthTask } from "@/lib/utils";
import { CalendarPicker } from "@/components/ui/calendar-picker";
import { MultiUserDropdown } from "@/components/ui/multi-user-dropdown";
import { Checkbox } from "@/components/ui/checkbox";

// Web Audio API chimes to play on Pomodoro timer completion (no assets dependency)
const playChime = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    // Play a friendly arpeggio (C5 -> E5 -> G5)
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.24); // G5
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.6);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(now + 0.6);
  } catch (e) {
    console.error("Audio Synthesis Failed", e);
  }
};

export default function Dashboard() {
  const { currentUser, users, tasks, boards, shortcuts, addShortcut, deleteShortcut, updateTask, addLog, addTask, addTasks } = useApp();

  // Active viewed user (Only Bosses can switch)
  const isBoss = currentUser.role === "Boss";
  const [selectedViewingUserName, setSelectedViewingUserName] = useState<string>(currentUser.username);
  
  // Resolve viewed user context
  const viewedUser = users.find((u) => u.username === selectedViewingUserName) || currentUser;

  // Sync state if currentUser changes
  useEffect(() => {
    setSelectedViewingUserName(currentUser.username);
  }, [currentUser]);

  // Tasks assigned to viewed user (filtered by visibility rule)
  const userTasks = tasks.filter((t) => t.assignedUserId === viewedUser.id && isTaskVisible(t.dueDate));
  
  // Sort: tasks with due dates first (closest first), followed by no due date
  const sortedTasks = [...userTasks].sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  // Active period tasks (Current month's tasks + next month's early tasks if today is >= 23rd)
  const activePeriodTasks = userTasks.filter((t) => {
    if (!t.dueDate) return false;
    const parts = t.dueDate.split("-").map(Number);
    if (parts.length !== 3) return false;
    const [ty, tm, td] = parts;
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();

    if (ty === todayYear && (tm - 1) === todayMonth) {
      return true;
    }
    if (todayDay >= 23) {
      let nextMonth = todayMonth + 1;
      let nextMonthYear = todayYear;
      if (nextMonth > 11) {
        nextMonth = 0;
        nextMonthYear += 1;
      }
      if (ty === nextMonthYear && (tm - 1) === nextMonth && td <= 10) {
        return true;
      }
    }
    return false;
  });

  const activeTasks = activePeriodTasks.filter((t) => t.status !== "Completed" && t.status !== "Cancelled");
  const completedTasks = activePeriodTasks.filter((t) => t.status === "Completed");
  const pendingTasksCount = activeTasks.length;
  const completedTasksCount = completedTasks.length;
  const criticalTasksCount = activeTasks.filter((t) => t.priority === "Critical" || t.priority === "High").length;
  const completionRate = activePeriodTasks.length > 0 ? Math.round((completedTasksCount / activePeriodTasks.length) * 100) : 0;

  const currentMonthWorkloadCount = activePeriodTasks.length;

  // Task Editing Modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAssignees, setEditAssignees] = useState<string[]>([]);
  const [selectedEditAssigneeRoles, setSelectedEditAssigneeRoles] = useState<Role[]>([]);
  const [editPriority, setEditPriority] = useState<Task["priority"]>("Medium");
  const [editStatus, setEditStatus] = useState<Task["status"]>("Not Started");
  const [editDueDate, setEditDueDate] = useState("");
  const [editNoDeadline, setEditNoDeadline] = useState(false);

  const handleToggleEditAssigneeUser = (userId: string) => {
    setEditAssignees((prev) => 
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleToggleEditAssigneeRole = (role: Role) => {
    const roleUsers = users.filter((u) => u.role === role).map((u) => u.id);
    if (roleUsers.length === 0) return;

    const isRoleSelected = selectedEditAssigneeRoles.includes(role);
    if (isRoleSelected) {
      setEditAssignees((prev) => prev.filter((id) => !roleUsers.includes(id)));
      setSelectedEditAssigneeRoles((prev) => prev.filter((r) => r !== role));
    } else {
      setEditAssignees((prev) => {
        const next = [...prev];
        roleUsers.forEach((id) => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
      setSelectedEditAssigneeRoles((prev) => [...prev, role]);
    }
  };

  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditAssignees([task.assignedUserId]);
    setSelectedEditAssigneeRoles([]);
    setEditPriority(task.priority);
    setEditStatus(task.status);
    setEditDueDate(task.dueDate || "");
    setEditNoDeadline(!task.dueDate);
    setIsEditOpen(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;
    if (editAssignees.length === 0) {
      toast.error("Please assign this task to at least one person.");
      return;
    }

    const finalDueDate = editNoDeadline ? "" : editDueDate;
    const [firstAssignee, ...otherAssignees] = editAssignees;

    updateTask({
      ...editingTask,
      title: editTitle,
      description: editDescription,
      assignedUserId: firstAssignee,
      priority: editPriority,
      status: editStatus,
      dueDate: finalDueDate,
    });

    if (otherAssignees.length > 0) {
      const extraTasks = otherAssignees.map((userId) => ({
        boardId: editingTask.boardId,
        title: editTitle,
        description: editDescription,
        assignedUserId: userId,
        priority: editPriority,
        status: editStatus,
        dueDate: finalDueDate,
        recurrence: editingTask.recurrence || "none",
        recurrenceParentId: editingTask.recurrenceParentId,
      }));
      addTasks(extraTasks);
    }

    toast.success("Task updated successfully.");
    setIsEditOpen(false);
  };

  const handleStatusChange = (task: Task, newStatus: Task["status"]) => {
    updateTask({
      ...task,
      status: newStatus,
    });
    toast.success(`Task status updated to ${newStatus}.`);
  };

  // --- TOOL 1: PERSONAL NOTEPAD STATE ---
  const [notepadText, setNotepadText] = useState("");
  
  // Load notepad text from localStorage based on viewedUser
  useEffect(() => {
    const saved = localStorage.getItem(`notepad_${viewedUser.id}`);
    setNotepadText(saved || "");
  }, [viewedUser.id]);

  const handleSaveNotepad = (val: string) => {
    setNotepadText(val);
    localStorage.setItem(`notepad_${viewedUser.id}`, val);
  };

  // --- TOOL 2: POMODORO TIMER STATE ---
  const [timerMode, setTimerMode] = useState<"work" | "short" | "long">("work");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getModeSeconds = (mode: typeof timerMode) => {
    switch (mode) {
      case "work": return 25 * 60;
      case "short": return 5 * 60;
      case "long": return 15 * 60;
    }
  };

  useEffect(() => {
    setTimeLeft(getModeSeconds(timerMode));
    setIsTimerRunning(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  }, [timerMode]);

  const toggleTimer = () => {
    if (isTimerRunning) {
      setIsTimerRunning(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    } else {
      setIsTimerRunning(true);
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            playChime();
            toast.success(
              timerMode === "work" 
                ? "Focus session complete! Time for a break." 
                : "Break finished! Ready to focus?"
            );
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setTimeLeft(getModeSeconds(timerMode));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Progress percentage of active timer
  const progressPercent = Math.round(((getModeSeconds(timerMode) - timeLeft) / getModeSeconds(timerMode)) * 100);

  // --- TOOL 3: BOOKMARKS SHORTCUTS STATE ---
  const userShortcuts = shortcuts.filter((s) => s.userId === currentUser.id);
  const [newShortcutTitle, setNewShortcutTitle] = useState("");
  const [newShortcutUrl, setNewShortcutUrl] = useState("");

  const handleAddShortcut = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShortcutTitle.trim() || !newShortcutUrl.trim()) return;
    
    // Add protocol if missing
    let formattedUrl = newShortcutUrl.trim();
    if (formattedUrl.startsWith('/')) {
      // Keep it as a relative internal route
      formattedUrl = formattedUrl;
    } else if (!/^https?:\/\//i.test(formattedUrl)) {
      // Prepend https:// only if it's an external domain/URL
      formattedUrl = `https://${formattedUrl}`;
    }

    addShortcut(newShortcutTitle.trim(), formattedUrl);
    setNewShortcutTitle("");
    setNewShortcutUrl("");
    toast.success("Cloud shortcut bookmark saved successfully.");
  };

  // --- TOOL 4: PRESENCE GRID SIMULATOR ---
  const staffSimStates: Record<string, { status: "Active" | "Idle" | "Offline"; activity: string; tz: string }> = {
    Boss: { status: "Active", activity: "Auditing payroll & performance", tz: "EST (GMT-5)" },
    AccioNox: { status: "Active", activity: "Editing photoshop templates", tz: "GMT+1" },
    Bearsy: { status: "Active", activity: "Debugging drag-scroll mechanics", tz: "PST (GMT-8)" },
    PearlPeverell: { status: "Idle", activity: "Reviewing active project boards", tz: "IST (GMT+5:30)" },
    CrimsonCurse: { status: "Active", activity: "Running financial logs sync", tz: "SGT (GMT+8)" },
  };

  const getSimulatedLocalTime = (tzOffset: string) => {
    const date = new Date();
    // Parse offset value from timezone
    let offsetHours = 0;
    if (tzOffset.includes("GMT+")) {
      offsetHours = parseFloat(tzOffset.split("GMT+")[1]);
    } else if (tzOffset.includes("GMT-")) {
      offsetHours = -parseFloat(tzOffset.split("GMT-")[1]);
    }
    
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const tzDate = new Date(utc + (3600000 * offsetHours));
    return tzDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // --- TOOL 5: QUICK TASK DRAFT CREATOR ---
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBoardName, setDraftBoardName] = useState("");
  // Get accessible boards
  const accessibleBoards = boards.filter((b) => 
    currentUser.role === "Boss" || 
    b.allowedRoles.includes(currentUser.role) ||
    (b.allowedUsers && b.allowedUsers.includes(currentUser.id))
  );

  const handleCreateDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftTitle.trim() || !draftBoardName) return;

    addTask({
      boardId: draftBoardName,
      title: draftTitle.trim(),
      description: "Quickly drafted from personal dashboard.",
      assignedUserId: currentUser.id,
      priority: "Medium",
      status: "Not Started",
      dueDate: new Date().toISOString().split("T")[0], // default today
    });

    setDraftTitle("");
    toast.success("Draft task created successfully!");
  };

  // Colors helpers
  const getPriorityColor = (p: Task["priority"]) => {
    switch (p) {
      case "Critical": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "High": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "Medium": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Low": return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
    }
  };

  const getStatusColor = (s: Task["status"]) => {
    switch (s) {
      case "Completed": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "Cancelled": return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      case "In Progress": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Waiting": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "Not Started": return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      
      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-card/40 border border-border/40 p-6 rounded-2xl backdrop-blur-md">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
            <Sparkles className="h-4 w-4 text-purple-500" />
            Welcome back, {currentUser.username}. It's time to do some shady business.
          </p>
        </div>

        {/* Boss user switching dropdown */}
        {isBoss && (
          <div className="flex items-center gap-2 bg-background/50 border border-border/40 px-3 py-1.5 rounded-full flex-shrink-0 shadow-xs">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">Viewing Workspace:</span>
            <Select 
              value={selectedViewingUserName} 
              onValueChange={(val) => val && setSelectedViewingUserName(val)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select workspace" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.username}>
                    @{u.username} ({u.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border/30 bg-card/30 backdrop-blur-xs lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Workload</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-background/25 border border-border/15 p-2.5 rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Total Assigned</span>
                <div className="text-2xl font-extrabold mt-0.5">{userTasks.length}</div>
              </div>
              <p className="text-[9px] text-muted-foreground mt-1">Visible tasks</p>
            </div>
            
            <div className="bg-background/25 border border-border/15 p-2.5 rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Current Month</span>
                <div className="text-2xl font-extrabold mt-0.5 text-primary">{currentMonthWorkloadCount}</div>
              </div>
              <p className="text-[9px] text-muted-foreground mt-1">Due this period</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/30 bg-card/30 backdrop-blur-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Completed Tasks</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-emerald-500">{completedTasksCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully completed</p>
          </CardContent>
        </Card>

        <Card className="border-border/30 bg-card/30 backdrop-blur-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-amber-500">{pendingTasksCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Needs to be done</p>
          </CardContent>
        </Card>

        <Card className="border-border/30 bg-card/30 backdrop-blur-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tasks Progress</CardTitle>
            <Sparkles className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-extrabold text-primary">{completionRate}%</div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${completionRate}%` }} 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Left = Task Table, Right = 5 Tools */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Left Column: Tasks Queue Table (2 columns wide) */}
        <div className="lg:col-span-2 space-y-6 min-w-0 overflow-hidden">
          <Card className="border-border/40 bg-card/60 backdrop-blur-md shadow-md h-full flex flex-col w-full overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-4">
              <div>
                <CardTitle className="text-lg">Tasks Queue</CardTitle>
                <CardDescription>
                  Deadline prioritized task log assigned to @{viewedUser.username}.
                </CardDescription>
              </div>
              <Badge variant="outline" className="rounded-full">
                {userTasks.length} Tasks
              </Badge>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-x-auto">
              {sortedTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-muted-foreground text-center">
                  <CheckSquare className="h-8 w-8 mb-2 text-muted-foreground/60" />
                  <p className="text-sm">No tasks assigned to this workspace yet.</p>
                </div>
              ) : (
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-muted/30 border-b border-border/40 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    <tr>
                      <th className="px-5 py-3">Task Details</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Deadline</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {sortedTasks.map((task) => {
                      const board = boards.find((b) => b.id === task.boardId);
                      return (
                        <tr key={task.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-5 py-4 max-w-[240px]">
                            <div className="font-semibold text-foreground flex items-center gap-1.5 truncate">
                              {task.recurrence && task.recurrence !== "none" && (
                                <Repeat className="h-3 w-3 text-violet-500 flex-shrink-0" />
                              )}
                              <span>{task.title}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                              <span className="truncate max-w-[120px] bg-muted/60 px-1.5 py-0.5 rounded text-[10px] font-medium border border-border/40">
                                {board?.name || "Unknown"}
                              </span>
                              <span className="truncate max-w-[120px]">{task.description}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Badge className={cn("px-2 py-0.5 text-[10px] rounded-full border", getPriorityColor(task.priority))}>
                              {task.priority}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-xs text-muted-foreground">
                            {task.dueDate ? (
                              <span className={cn(
                                "flex items-center gap-1",
                                new Date(task.dueDate) < new Date() && task.status !== "Completed" && "text-red-500 font-medium animate-pulse"
                              )}>
                                <Clock className="h-3 w-3" />
                                {task.dueDate}
                              </span>
                            ) : (
                              "No deadline"
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Select 
                              value={task.status} 
                              onValueChange={(val) => val && handleStatusChange(task, val as any)}
                            >
                              <SelectTrigger className={cn("w-[130px] font-semibold text-xs rounded-full border shadow-none", getStatusColor(task.status))}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Not Started" className="text-zinc-400 focus:text-zinc-300">
                                  <span className="flex items-center gap-2 font-medium">
                                    <span className="h-2 w-2 rounded-full bg-zinc-400" />
                                    Not Started
                                  </span>
                                </SelectItem>
                                <SelectItem value="In Progress" className="text-blue-500 focus:text-blue-400">
                                  <span className="flex items-center gap-2 font-medium">
                                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                                    In Progress
                                  </span>
                                </SelectItem>
                                <SelectItem value="Waiting" className="text-amber-500 focus:text-amber-400">
                                  <span className="flex items-center gap-2 font-medium">
                                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                                    Waiting
                                  </span>
                                </SelectItem>
                                <SelectItem value="Completed" className="text-emerald-500 focus:text-emerald-400">
                                  <span className="flex items-center gap-2 font-medium">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                    Completed
                                  </span>
                                </SelectItem>
                                <SelectItem value="Cancelled" className="text-rose-500 focus:text-rose-400">
                                  <span className="flex items-center gap-2 font-medium">
                                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                                    Cancelled
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-4 text-right whitespace-nowrap">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 rounded-full hover:bg-muted"
                              onClick={() => handleOpenEditTask(task)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: 5 Integrated Tools */}
        <div className="space-y-6">
          <h2 className="text-md font-bold tracking-tight text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            Productivity Tools
          </h2>
          
          {/* TOOL 1: SECRET NOTEPAD */}
          <Card className="border-border/40 bg-card/60 backdrop-blur-md shadow-xs relative overflow-hidden group">
            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/40">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-500" />
                <CardTitle className="text-sm">Personal Notes</CardTitle>
              </div>
              {isBoss && viewedUser.id !== currentUser.id && (
                <Badge variant="destructive" className="text-[9px] scale-90 rounded-full">
                  Admin View: Read/Write
                </Badge>
              )}
            </CardHeader>
            <CardContent className="pt-3">
              <Textarea 
                value={notepadText}
                onChange={(e) => handleSaveNotepad(e.target.value)}
                placeholder="Write notes that are only visible to you... (Saves automatically)"
                className="min-h-[120px] bg-background/30 border-border/40 text-xs font-mono resize-none focus-visible:ring-1"
              />
            </CardContent>
          </Card>

          {/* TOOL 2: POMODORO TIMER */}
          <Card className="border-border/40 bg-card/60 backdrop-blur-md shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-red-500" />
                  <CardTitle className="text-sm">Pomodoro Focus Timer</CardTitle>
                </div>
                <div className="flex bg-muted/60 p-0.5 rounded-full gap-0.5 text-[9px] font-semibold">
                  <button 
                    onClick={() => setTimerMode("work")}
                    className={cn("px-2 py-0.5 rounded-full transition-all", timerMode === "work" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground")}
                  >
                    Work
                  </button>
                  <button 
                    onClick={() => setTimerMode("short")}
                    className={cn("px-2 py-0.5 rounded-full transition-all", timerMode === "short" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground")}
                  >
                    Short
                  </button>
                  <button 
                    onClick={() => setTimerMode("long")}
                    className={cn("px-2 py-0.5 rounded-full transition-all", timerMode === "long" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground")}
                  >
                    Focus
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 flex flex-col items-center justify-center space-y-4">
              <div className="relative flex items-center justify-center w-24 h-24">
                {/* SVG Progress Ring */}
                <svg className="absolute w-full h-full -rotate-90">
                  <circle 
                    cx="48" 
                    cy="48" 
                    r="42" 
                    className="stroke-muted fill-transparent" 
                    strokeWidth="3.5"
                  />
                  <circle 
                    cx="48" 
                    cy="48" 
                    r="42" 
                    className="stroke-red-500 fill-transparent transition-all duration-1000" 
                    strokeWidth="3.5"
                    strokeDasharray={2 * Math.PI * 42}
                    strokeDashoffset={2 * Math.PI * 42 * (1 - progressPercent / 100)}
                  />
                </svg>
                <div className="text-xl font-bold tracking-tight text-foreground z-10 select-none">
                  {formatTime(timeLeft)}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant={isTimerRunning ? "outline" : "default"}
                  onClick={toggleTimer}
                  className="rounded-full h-8 px-4 gap-1.5 text-xs"
                >
                  {isTimerRunning ? (
                    <>
                      <Pause className="h-3 w-3" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3" /> Start Focus
                    </>
                  )}
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={resetTimer}
                  className="rounded-full h-8 w-8 p-0"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* TOOL 3: CLOUD SHORTCUTS BOOKMARKS */}
          <Card className="border-border/40 bg-card/60 backdrop-blur-md shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-emerald-500" />
                <CardTitle className="text-sm">Apparition Links</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Add form */}
              <form onSubmit={handleAddShortcut} className="flex gap-1.5">
                <div className="grid grid-cols-2 gap-1 flex-1">
                  <Input 
                    placeholder="Title" 
                    value={newShortcutTitle}
                    onChange={(e) => setNewShortcutTitle(e.target.value)}
                    className="h-7 text-xs bg-background/50"
                    required
                  />
                  <Input 
                    placeholder="/url" 
                    value={newShortcutUrl}
                    onChange={(e) => setNewShortcutUrl(e.target.value)}
                    className="h-7 text-xs bg-background/50"
                    required
                  />
                </div>
                <Button type="submit" size="sm" className="h-7 w-7 p-0 rounded-md">
                  <Plus className="h-4 w-4" />
                </Button>
              </form>

              {/* List */}
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                {/* Default workspace links */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/20 text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <CheckSquare className="h-3 w-3 text-blue-500" /> Core Task Manager
                  </span>
                  <a href="/tasks" className="text-primary hover:underline flex items-center gap-0.5 text-[10px]">
                    Open <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>

                {userShortcuts.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/10 text-xs hover:bg-muted/40 transition-colors group">
                    <span className="font-medium text-foreground truncate max-w-[140px] flex items-center gap-1.5">
                      <Bookmark className="h-3 w-3 text-emerald-500" /> {s.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <a 
                        href={s.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-primary hover:underline flex items-center gap-0.5 text-[10px]"
                      >
                        Visit <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                      <button 
                        onClick={() => deleteShortcut(s.id)}
                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {userShortcuts.length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-2">
                    Add custom bookmarks above to save them to the cloud database.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* TASK EDIT DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSaveTask}>
            <DialogHeader>
              <DialogTitle>Edit Workspace Task</DialogTitle>
              <DialogDescription>
                Modify details, priority, or status for this task.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="task-title">Title</Label>
                <Input 
                  id="task-title" 
                  value={editTitle} 
                  onChange={(e) => setEditTitle(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-desc">Description</Label>
                <Textarea 
                  id="task-desc" 
                  value={editDescription} 
                  onChange={(e) => setEditDescription(e.target.value)} 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="task-assignees" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assign To</Label>
                <MultiUserDropdown 
                  value={editAssignees} 
                  onValueChange={setEditAssignees} 
                  placeholder="Select assignees"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="task-priority">Priority</Label>
                  <Select value={editPriority} onValueChange={(val) => val && setEditPriority(val as any)}>
                    <SelectTrigger id="task-priority" className="w-full">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-status">Status</Label>
                  <Select value={editStatus} onValueChange={(val) => val && setEditStatus(val as any)}>
                    <SelectTrigger id="task-status" className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not Started" className="text-zinc-400 focus:text-zinc-300">
                        <span className="flex items-center gap-2 font-medium">
                          <span className="h-2 w-2 rounded-full bg-zinc-400" />
                          Not Started
                        </span>
                      </SelectItem>
                      <SelectItem value="In Progress" className="text-blue-500 focus:text-blue-400">
                        <span className="flex items-center gap-2 font-medium">
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                          In Progress
                        </span>
                      </SelectItem>
                      <SelectItem value="Waiting" className="text-amber-500 focus:text-amber-400">
                        <span className="flex items-center gap-2 font-medium">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          Waiting
                        </span>
                      </SelectItem>
                      <SelectItem value="Completed" className="text-emerald-500 focus:text-emerald-400">
                        <span className="flex items-center gap-2 font-medium">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Completed
                        </span>
                      </SelectItem>
                      <SelectItem value="Cancelled" className="text-rose-500 focus:text-rose-400">
                        <span className="flex items-center gap-2 font-medium">
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                          Cancelled
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Due Date & Calendar Picker */}
              <div className="space-y-2 border-t border-border/40 pt-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="task-dueDate" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Due Date</Label>
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <Checkbox 
                      id="task-no-deadline"
                      checked={editNoDeadline} 
                      onCheckedChange={(checked) => {
                        setEditNoDeadline(!!checked);
                        if (checked) setEditDueDate("");
                      }}
                    />
                    <span>No deadline</span>
                  </label>
                </div>
                
                <div className="flex gap-2">
                  <Input 
                    id="task-dueDate" 
                    type="date" 
                    value={editNoDeadline ? "" : editDueDate} 
                    disabled={editNoDeadline}
                    onChange={(e) => setEditDueDate(e.target.value)} 
                    placeholder="YYYY-MM-DD"
                    className="flex-1 bg-background/50 border-border/40"
                  />
                  <CalendarPicker 
                    value={editDueDate} 
                    onChange={setEditDueDate} 
                    disabled={editNoDeadline}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
