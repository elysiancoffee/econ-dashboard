"use client";

import React, { useState } from "react";
import { useApp, Task, Board, Role } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, LayoutGrid, List, Plus, Trash2, Edit, AlertCircle, MessageSquare, Repeat, ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { toast } from "sonner";
import { UserDropdown } from "@/components/ui/user-dropdown";

export default function TasksPage() {
  const { 
    currentUser, 
    boards, 
    tasks, 
    users, 
    addBoard, 
    deleteBoard, 
    updateBoard,
    addTask, 
    addTasks,
    updateTask, 
    deleteTask 
  } = useApp();

  const [activeBoardId, setActiveBoardId] = useState<string>(boards[0]?.id || "");
  const [view, setView] = useState<"kanban" | "table" | "broader" | "calendar">("kanban");
  
  // Repeat options states
  const [taskRepeat, setTaskRepeat] = useState<string>("none"); // "none" | "daily" | "weekly" | "biweekly" | "monthly" | "yearly"
  const [repeatEndType, setRepeatEndType] = useState<"count" | "date">("count");
  const [repeatCount, setRepeatCount] = useState<number>(10);
  const [repeatEndDate, setRepeatEndDate] = useState<string>("");

  // Broader view selection range
  const [broaderRange, setBroaderRange] = useState<3 | 6 | 12>(3);

  // Calendar active date month
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  // Board form states
  const [newBoardName, setNewBoardName] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<Role[]>(["Boss"]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isBoardOpen, setIsBoardOpen] = useState(false);

  // Board editing form states
  const [isEditBoardOpen, setIsEditBoardOpen] = useState(false);
  const [editBoardName, setEditBoardName] = useState("");
  const [editBoardRoles, setEditBoardRoles] = useState<Role[]>([]);
  const [editBoardUsers, setEditBoardUsers] = useState<string[]>([]);

  // Task form states
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState<Task["priority"]>("Medium");
  const [taskStatus, setTaskStatus] = useState<Task["status"]>("Not Started");
  const [taskDueDate, setTaskDueDate] = useState("");

  // Helper for generating next due date
  const getNextDueDate = (dateStr: string, frequency: string): string => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return dateStr;
    
    switch (frequency) {
      case "daily":
        date.setDate(date.getDate() + 1);
        break;
      case "weekly":
        date.setDate(date.getDate() + 7);
        break;
      case "biweekly":
        date.setDate(date.getDate() + 14);
        break;
      case "monthly":
        date.setMonth(date.getMonth() + 1);
        break;
      case "yearly":
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        break;
    }
    
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Render Calendar Grid Helper
  const getCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    
    // First day of the month (0 = Sun, 1 = Mon, etc.)
    const firstDayIndex = new Date(year, month, 1).getDay();
    
    // Total days in the month
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    // Total days in the previous month
    const prevTotalDays = new Date(year, month, 0).getDate();
    
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];
    
    // Padding from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevTotalDays - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }
    
    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: true });
    }
    
    // Padding from next month to complete the grid (standard 6-row grid = 42 cells)
    const remainingCells = 42 - days.length;
    for (let d = 1; d <= remainingCells; d++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }
    
    return days;
  };

  const activeBoard = boards.find((b) => b.id === activeBoardId);
  
  // Filter boards that current user role can access or is individually allowed on
  const accessibleBoards = boards.filter((b) => 
    currentUser.role === "Boss" || 
    b.allowedRoles.includes(currentUser.role) ||
    (b.allowedUsers && b.allowedUsers.includes(currentUser.id))
  );

  // Get tasks of active board
  const boardTasks = tasks.filter((t) => t.boardId === activeBoardId);

  // Current system date for Kanban / Table filtering
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // Dynamic filter based on view
  let activeTasks = boardTasks;

  if (view === "kanban" || view === "table") {
    activeTasks = boardTasks.filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate + "T00:00:00");
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  } else if (view === "broader") {
    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    const endOfRange = new Date(currentYear, currentMonth + broaderRange, 0);
    
    activeTasks = boardTasks.filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate + "T00:00:00");
      return d >= startOfCurrentMonth && d <= endOfRange;
    });
  } else if (view === "calendar") {
    const calYear = calendarDate.getFullYear();
    const calMonth = calendarDate.getMonth();
    
    activeTasks = boardTasks.filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate + "T00:00:00");
      return d.getFullYear() === calYear && d.getMonth() === calMonth;
    });
  }

  // Permission Check: Boss/Consigliere can manage boards and edit all tasks. Other roles have restrictions.
  const canManageBoards = currentUser.role === "Boss" || currentUser.role === "Consigliere";

  const handleCreateBoard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    addBoard(newBoardName, selectedRoles, selectedUsers);
    toast.success(`Board "${newBoardName}" created successfully.`);
    setNewBoardName("");
    setSelectedRoles(["Boss"]);
    setSelectedUsers([]);
    setIsBoardOpen(false);
  };

  const handleOpenEditBoard = () => {
    if (!activeBoard) return;
    setEditBoardName(activeBoard.name);
    setEditBoardRoles(activeBoard.allowedRoles || []);
    setEditBoardUsers(activeBoard.allowedUsers || []);
    setIsEditBoardOpen(true);
  };

  const handleSaveBoard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBoardId || !editBoardName.trim()) return;
    updateBoard(activeBoardId, editBoardName, editBoardRoles, editBoardUsers);
    toast.success(`Board "${editBoardName}" updated successfully.`);
    setIsEditBoardOpen(false);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) => 
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleEditBoardUserSelection = (userId: string) => {
    setEditBoardUsers((prev) => 
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleEditBoardRoleSelection = (role: Role) => {
    setEditBoardRoles((prev) => 
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleOpenCreateTask = () => {
    setEditingTask(null);
    setTaskTitle("");
    setTaskDesc("");
    setTaskAssignee(users[0]?.id || "");
    setTaskPriority("Medium");
    setTaskStatus("Not Started");
    setTaskDueDate("");
    setTaskRepeat("none");
    setRepeatEndType("count");
    setRepeatCount(10);
    setRepeatEndDate("");
    setIsTaskOpen(true);
  };

  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description);
    setTaskAssignee(task.assignedUserId);
    setTaskPriority(task.priority);
    setTaskStatus(task.status);
    setTaskDueDate(task.dueDate);
    setTaskRepeat(task.recurrence || "none");
    setRepeatEndType("count");
    setRepeatCount(10);
    setRepeatEndDate("");
    setIsTaskOpen(true);
  };

  const handleCopyTask = (task: Task) => {
    setEditingTask(null);
    setTaskTitle(task.title);
    setTaskDesc(task.description);
    setTaskAssignee(task.assignedUserId);
    setTaskPriority(task.priority);
    setTaskStatus(task.status);
    setTaskDueDate(task.dueDate);
    setTaskRepeat(task.recurrence || "none");
    setRepeatEndType("count");
    setRepeatCount(10);
    setRepeatEndDate("");
    setIsTaskOpen(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    if (editingTask) {
      updateTask({
        ...editingTask,
        title: taskTitle,
        description: taskDesc,
        assignedUserId: taskAssignee,
        priority: taskPriority,
        status: taskStatus,
        dueDate: taskDueDate,
        recurrence: taskRepeat,
      });
      toast.success("Task updated successfully.");
    } else {
      if (taskRepeat === "none") {
        addTask({
          boardId: activeBoardId,
          title: taskTitle,
          description: taskDesc,
          assignedUserId: taskAssignee,
          priority: taskPriority,
          status: taskStatus,
          dueDate: taskDueDate,
          recurrence: "none",
          recurrenceParentId: null,
        });
        toast.success("Task created successfully.");
      } else {
        // Create repeating tasks
        const occurrences: Omit<Task, "id" | "commentsCount">[] = [];
        const parentId = `t-parent-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
        
        let currentDueDate = taskDueDate || new Date().toISOString().split("T")[0];
        let count = 0;
        const maxOccurrences = repeatEndType === "count" ? Math.min(repeatCount, 50) : 50;
        
        while (count < maxOccurrences) {
          if (repeatEndType === "date" && repeatEndDate && currentDueDate > repeatEndDate) {
            break;
          }
          
          occurrences.push({
            boardId: activeBoardId,
            title: taskTitle,
            description: taskDesc,
            assignedUserId: taskAssignee,
            priority: taskPriority,
            status: taskStatus,
            dueDate: currentDueDate,
            recurrence: taskRepeat,
            recurrenceParentId: parentId,
          });
          
          currentDueDate = getNextDueDate(currentDueDate, taskRepeat);
          count++;
          
          if (!currentDueDate || currentDueDate === occurrences[occurrences.length - 1].dueDate) {
            break;
          }
        }

        if (occurrences.length > 0) {
          addTasks(occurrences);
          toast.success(`Created ${occurrences.length} recurring tasks successfully.`);
        } else {
          toast.error("Failed to create repeating tasks. Check options.");
        }
      }
    }
    setIsTaskOpen(false);
  };

  const handleDeleteTask = (id: string) => {
    deleteTask(id);
    toast.info("Task deleted.");
  };

  const toggleRoleSelection = (role: Role) => {
    setSelectedRoles((prev) => 
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const getPriorityColor = (p: Task["priority"]) => {
    switch (p) {
      case "Critical": return "bg-red-500 hover:bg-red-600 text-white";
      case "High": return "bg-orange-500 hover:bg-orange-600 text-white";
      case "Medium": return "bg-blue-500 hover:bg-blue-600 text-white";
      case "Low": return "bg-gray-500 hover:bg-gray-600 text-white";
    }
  };

  const getStatusColor = (s: Task["status"]) => {
    switch (s) {
      case "Completed": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "In Progress": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "Waiting": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "Cancelled": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-850 dark:text-gray-400";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Task Management</h1>
          <p className="text-muted-foreground mt-1">Manage project boards, tasks, and staff assignments.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {canManageBoards && (
            <Dialog open={isBoardOpen} onOpenChange={setIsBoardOpen}>
              <DialogTrigger>
                <Button variant="outline" className="gap-2 rounded-full flex-shrink-0">
                  <Plus className="h-4 w-4" />
                  New Board
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleCreateBoard}>
                  <DialogHeader>
                    <DialogTitle>Create Task Board</DialogTitle>
                    <DialogDescription>
                      Add a new Monday-style board and control access permissions.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Board Name</Label>
                      <Input 
                        id="name" 
                        value={newBoardName} 
                        onChange={(e) => setNewBoardName(e.target.value)} 
                        placeholder="e.g. Operations Security" 
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Access Permissions (Roles)</Label>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {(["Boss", "Bagman", "Consigliere", "Associate", "Custodian"] as Role[]).map((role) => (
                          <div key={role} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`role-${role}`} 
                              checked={selectedRoles.includes(role)}
                              onCheckedChange={() => toggleRoleSelection(role)}
                            />
                            <Label htmlFor={`role-${role}`} className="text-sm font-normal cursor-pointer">
                              {role}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 border-t border-border/40 pt-3">
                      <Label>Access Permissions (Individual Users)</Label>
                      <div className="grid grid-cols-2 gap-2 pt-1 max-h-[150px] overflow-y-auto">
                        {users.map((u) => (
                          <div key={u.id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`user-${u.id}`} 
                              checked={selectedUsers.includes(u.id)}
                              onCheckedChange={() => toggleUserSelection(u.id)}
                            />
                            <Label htmlFor={`user-${u.id}`} className="text-sm font-normal cursor-pointer truncate">
                              @{u.username}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Create Board</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {canManageBoards && activeBoard && (
            <Dialog open={isEditBoardOpen} onOpenChange={setIsEditBoardOpen}>
              <DialogTrigger>
                <Button variant="outline" className="gap-2 rounded-full flex-shrink-0" onClick={handleOpenEditBoard}>
                  <Edit className="h-4 w-4 text-purple-500" />
                  Edit Board
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSaveBoard}>
                  <DialogHeader>
                    <DialogTitle>Edit Task Board</DialogTitle>
                    <DialogDescription>
                      Update board name and control access permissions.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Board Name</Label>
                      <Input 
                        id="edit-name" 
                        value={editBoardName} 
                        onChange={(e) => setEditBoardName(e.target.value)} 
                        placeholder="e.g. Operations Security" 
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Access Permissions (Roles)</Label>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {(["Boss", "Bagman", "Consigliere", "Associate", "Custodian"] as Role[]).map((role) => (
                          <div key={`edit-${role}`} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`edit-role-${role}`} 
                              checked={editBoardRoles.includes(role)}
                              onCheckedChange={() => toggleEditBoardRoleSelection(role)}
                            />
                            <Label htmlFor={`edit-role-${role}`} className="text-sm font-normal cursor-pointer">
                              {role}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 border-t border-border/40 pt-3">
                      <Label>Access Permissions (Individual Users)</Label>
                      <div className="grid grid-cols-2 gap-2 pt-1 max-h-[150px] overflow-y-auto">
                        {users.map((u) => (
                          <div key={`edit-user-${u.id}`} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`edit-user-${u.id}`} 
                              checked={editBoardUsers.includes(u.id)}
                              onCheckedChange={() => toggleEditBoardUserSelection(u.id)}
                            />
                            <Label htmlFor={`edit-user-${u.id}`} className="text-sm font-normal cursor-pointer truncate">
                              @{u.username}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Save Changes</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}

          <Button onClick={handleOpenCreateTask} className="gap-2 rounded-full flex-shrink-0">
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Board Selector */}
      {accessibleBoards.length === 0 ? (
        <Card className="text-center p-8">
          <CardHeader>
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <CardTitle className="mt-4">No accessible boards</CardTitle>
            <CardDescription className="mt-2">
              You do not have permission to access any boards. Contact an administrator to elevate your profile.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4 w-full overflow-hidden">
            <div className="flex flex-nowrap gap-2 overflow-x-auto pb-2 w-full md:w-auto md:flex-wrap md:overflow-visible md:pb-0 scrollbar-none">
              {accessibleBoards.map((b) => (
                <Button 
                  key={b.id}
                  variant={activeBoardId === b.id ? "default" : "ghost"}
                  onClick={() => setActiveBoardId(b.id)}
                  className="rounded-full flex-shrink-0"
                >
                  {b.name}
                </Button>
              ))}
            </div>

            <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto w-full md:w-auto justify-start md:justify-end pb-2 md:pb-0 scrollbar-none">
              {view === "broader" && (
                <div className="flex items-center gap-2 mr-2">
                  <span className="text-xs text-muted-foreground font-medium">Range:</span>
                  <Select value={String(broaderRange)} onValueChange={(val) => val && setBroaderRange(Number(val) as 3 | 6 | 12)}>
                    <SelectTrigger className="w-[120px] h-8 rounded-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 Months</SelectItem>
                      <SelectItem value="6">6 Months</SelectItem>
                      <SelectItem value="12">1 Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <Button 
                variant={view === "kanban" ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setView("kanban")}
                className="gap-1.5 rounded-full flex-shrink-0"
              >
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </Button>
              
              <Button 
                variant={view === "broader" ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setView("broader")}
                className="gap-1.5 rounded-full flex-shrink-0"
              >
                <LayoutGrid className="h-4 w-4 text-purple-500" />
                View Broader
              </Button>

              <Button 
                variant={view === "calendar" ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setView("calendar")}
                className="gap-1.5 rounded-full flex-shrink-0"
              >
                <Calendar className="h-4 w-4 text-emerald-500" />
                Calendar
              </Button>

              <Button 
                variant={view === "table" ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setView("table")}
                className="gap-1.5 rounded-full flex-shrink-0"
              >
                <List className="h-4 w-4" />
                Table
              </Button>
            </div>
          </div>

          {/* Kanban / Broader View */}
          {(view === "kanban" || view === "broader") && (
            <div className="flex overflow-x-auto gap-4 pb-4 md:grid md:grid-cols-3 lg:grid-cols-5 md:overflow-x-visible md:pb-0">
              {(["Not Started", "In Progress", "Waiting", "Completed", "Cancelled"] as Task["status"][]).map((status) => {
                const statusTasks = activeTasks.filter((t) => t.status === status);
                return (
                  <div key={status} className="bg-muted/30 rounded-xl p-4 flex flex-col min-h-[500px] w-[280px] sm:w-[320px] md:w-auto flex-shrink-0 md:flex-shrink">
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-semibold text-sm">{status}</span>
                      <Badge variant="outline" className="rounded-full font-normal">
                        {statusTasks.length}
                      </Badge>
                    </div>

                    <div className="flex-1 space-y-3">
                      {statusTasks.map((task) => {
                        const assignee = users.find((u) => u.id === task.assignedUserId);
                        return (
                          <Card 
                            key={task.id} 
                            className="shadow-sm hover:shadow-md cursor-pointer transition-shadow"
                            onClick={() => handleOpenEditTask(task)}
                          >
                            <CardHeader className="p-4 pb-2">
                              <div className="flex justify-between items-start gap-2">
                                <Badge className={getPriorityColor(task.priority)}>
                                  {task.priority}
                                </Badge>
                                <div className="flex items-center gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyTask(task);
                                    }}
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTask(task.id);
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                              <CardTitle className="text-sm font-semibold mt-2 line-clamp-1 flex items-center gap-1.5">
                                {task.recurrence && task.recurrence !== "none" && (
                                  <Repeat className="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />
                                )}
                                <span className="truncate">{task.title}</span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 space-y-3">
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {task.description}
                              </p>
                              
                              <div className="flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3 w-3" />
                                  <span>{task.dueDate || "No due date"}</span>
                                </div>
                                <span className="font-medium text-foreground max-w-[80px] truncate">
                                  @{assignee?.username || "unassigned"}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                      
                      {statusTasks.length === 0 && (
                        <div className="h-full border border-dashed rounded-lg flex items-center justify-center p-4 text-xs text-muted-foreground text-center">
                          No tasks in this stage
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Table View */}
          {view === "table" && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 border-b text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      <tr>
                        <th className="px-6 py-4">Task</th>
                        <th className="px-6 py-4">Priority</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Due Date</th>
                        <th className="px-6 py-4">Assignee</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {activeTasks.map((task) => {
                        const assignee = users.find((u) => u.id === task.assignedUserId);
                        return (
                          <tr key={task.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => handleOpenEditTask(task)}>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-foreground flex items-center gap-1.5">
                                {task.recurrence && task.recurrence !== "none" && (
                                  <Repeat className="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />
                                )}
                                <span>{task.title}</span>
                              </div>
                              <div className="text-xs text-muted-foreground line-clamp-1">{task.description}</div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge className={getPriorityColor(task.priority)}>
                                {task.priority}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                                {task.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {task.dueDate || "No due date"}
                            </td>
                            <td className="px-6 py-4 font-medium text-foreground">
                              @{assignee?.username || "unassigned"}
                            </td>
                            <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleCopyTask(task)}>
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditTask(task)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteTask(task.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {activeTasks.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                            No tasks found on this board.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Calendar View */}
          {view === "calendar" && (
            <Card className="border border-border/40 overflow-hidden shadow-xl bg-card/60 backdrop-blur-md">
              <div className="flex justify-between items-center p-4 border-b border-border/40 bg-muted/20">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-lg text-foreground">
                    {calendarDate.toLocaleString("default", { month: "long", year: "numeric" })}
                  </h3>
                  <div className="flex items-center bg-muted/60 border rounded-full p-0.5">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        const newDate = new Date(calendarDate);
                        newDate.setMonth(newDate.getMonth() - 1);
                        setCalendarDate(newDate);
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        const newDate = new Date(calendarDate);
                        newDate.setMonth(newDate.getMonth() + 1);
                        setCalendarDate(newDate);
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 rounded-full text-xs"
                    onClick={() => setCalendarDate(new Date())}
                  >
                    Today
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground italic font-light">
                  Showing active board tasks
                </div>
              </div>
              
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <div className="min-w-[700px]">
                    <div className="grid grid-cols-7 border-b border-border/30 bg-muted/10 text-center text-xs font-semibold text-muted-foreground py-2 uppercase tracking-wider">
                      <div>Sun</div>
                      <div>Mon</div>
                      <div>Tue</div>
                      <div>Wed</div>
                      <div>Thu</div>
                      <div>Fri</div>
                      <div>Sat</div>
                    </div>
                    
                    <div className="grid grid-cols-7 grid-rows-6 divide-x divide-y divide-border/20 border-t border-border/20">
                      {getCalendarDays().map(({ dateStr, dayNum, isCurrentMonth }, index) => {
                        const dayTasks = boardTasks.filter((t) => t.dueDate === dateStr);
                        const isToday = new Date().toISOString().split("T")[0] === dateStr;
                        
                        return (
                          <div 
                            key={dateStr + "-" + index} 
                            className={`min-h-[100px] p-2 flex flex-col group relative transition-colors ${
                              isCurrentMonth ? "bg-card" : "bg-muted/10 opacity-40 hover:opacity-70"
                            } ${isToday ? "ring-1 ring-inset ring-amber-500/50 bg-amber-500/5" : "hover:bg-muted/10"}`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className={`text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center ${
                                isToday ? "bg-amber-500 text-white font-bold" : "text-muted-foreground"
                              }`}>
                                {dayNum}
                              </span>
                              
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Open task create dialog with this date prefilled
                                  setEditingTask(null);
                                  setTaskTitle("");
                                  setTaskDesc("");
                                  setTaskAssignee(users[0]?.id || "");
                                  setTaskPriority("Medium");
                                  setTaskStatus("Not Started");
                                  setTaskDueDate(dateStr);
                                  setTaskRepeat("none");
                                  setRepeatEndType("count");
                                  setRepeatCount(10);
                                  setRepeatEndDate("");
                                  setIsTaskOpen(true);
                                }}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            <div className="flex-1 space-y-1 overflow-y-auto max-h-[70px] scrollbar-none">
                              {dayTasks.map((task) => {
                                const priorityBorder = 
                                  task.priority === "Critical" ? "border-l-red-500 bg-red-500/10 text-red-700 dark:text-red-300" :
                                  task.priority === "High" ? "border-l-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-300" :
                                  task.priority === "Medium" ? "border-l-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300" :
                                  "border-l-gray-500 bg-gray-500/10 text-gray-700 dark:text-gray-300";
                                  
                                return (
                                  <div
                                    key={task.id}
                                    className={`text-[10px] px-1.5 py-0.5 rounded-r border-l-2 truncate cursor-pointer font-medium hover:brightness-105 active:brightness-95 transition-all flex items-center gap-1 ${priorityBorder}`}
                                    onClick={() => handleOpenEditTask(task)}
                                    title={`${task.title} - ${task.priority}`}
                                  >
                                    {task.recurrence && task.recurrence !== "none" && (
                                      <Repeat className="h-2 w-2 flex-shrink-0" />
                                    )}
                                    <span className="truncate">{task.title}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Task Creation/Editing Dialog */}
      <Dialog open={isTaskOpen} onOpenChange={setIsTaskOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSaveTask}>
            <DialogHeader>
              <DialogTitle>{editingTask ? "Edit Task" : "Add Task"}</DialogTitle>
              <DialogDescription>
                Configure the task details below.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="task-title">Title</Label>
                <Input 
                  id="task-title" 
                  value={taskTitle} 
                  onChange={(e) => setTaskTitle(e.target.value)} 
                  placeholder="Task title" 
                  required 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-desc">Description</Label>
                <Textarea 
                  id="task-desc" 
                  value={taskDesc} 
                  onChange={(e) => setTaskDesc(e.target.value)} 
                  placeholder="Brief description of requirements" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="task-assignee">Assignee</Label>
                  <UserDropdown value={taskAssignee} onValueChange={setTaskAssignee} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="task-dueDate">Due Date</Label>
                  <Input 
                    id="task-dueDate" 
                    type="date" 
                    value={taskDueDate} 
                    onChange={(e) => setTaskDueDate(e.target.value)} 
                  />
                </div>
              </div>

              {/* Recurrence Options */}
              {!editingTask ? (
                <div className="border-t border-border/40 pt-4 mt-2 space-y-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Repeat className="h-4 w-4 text-violet-500" />
                    Recurrence Settings
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="task-repeat">Repeat Pattern</Label>
                      <Select value={taskRepeat} onValueChange={(val) => setTaskRepeat(val || "none")}>
                        <SelectTrigger id="task-repeat">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Does not repeat</SelectItem>
                          <SelectItem value="daily">Daily (Every day)</SelectItem>
                          <SelectItem value="weekly">Weekly (Every week)</SelectItem>
                          <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                          <SelectItem value="monthly">Monthly (Every month)</SelectItem>
                          <SelectItem value="yearly">Yearly (Every year)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {taskRepeat !== "none" && (
                      <div className="grid gap-2">
                        <Label htmlFor="task-repeat-end">Ends</Label>
                        <Select 
                          value={repeatEndType} 
                          onValueChange={(val) => val && setRepeatEndType(val as "count" | "date")}
                        >
                          <SelectTrigger id="task-repeat-end">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="count">After occurrences</SelectItem>
                            <SelectItem value="date">On specific date</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {taskRepeat !== "none" && repeatEndType === "count" && (
                    <div className="grid gap-2">
                      <Label htmlFor="task-repeat-count">Number of occurrences (Max 50)</Label>
                      <Input
                        id="task-repeat-count"
                        type="number"
                        min={1}
                        max={50}
                        value={repeatCount}
                        onChange={(e) => setRepeatCount(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
                      />
                    </div>
                  )}

                  {taskRepeat !== "none" && repeatEndType === "date" && (
                    <div className="grid gap-2">
                      <Label htmlFor="task-repeat-end-date">End Date</Label>
                      <Input
                        id="task-repeat-end-date"
                        type="date"
                        value={repeatEndDate}
                        onChange={(e) => setRepeatEndDate(e.target.value)}
                        required={taskRepeat !== "none" && repeatEndType === "date"}
                      />
                    </div>
                  )}
                </div>
              ) : (
                editingTask.recurrence && editingTask.recurrence !== "none" && (
                  <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-3 text-xs text-violet-600 dark:text-violet-400 mt-2 flex items-center gap-2">
                    <Repeat className="h-4 w-4 flex-shrink-0" />
                    <span>
                      This task is part of a recurring series (repeats <strong>{editingTask.recurrence}</strong>). 
                      Changes made here will only apply to this individual task.
                    </span>
                  </div>
                )
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="task-priority">Priority</Label>
                  <Select 
                    value={taskPriority} 
                    onValueChange={(val) => setTaskPriority(val as Task["priority"])}
                  >
                    <SelectTrigger id="task-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="task-status">Status</Label>
                  <Select 
                    value={taskStatus} 
                    onValueChange={(val) => setTaskStatus(val as Task["status"])}
                  >
                    <SelectTrigger id="task-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not Started">Not Started</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Waiting">Waiting</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">{editingTask ? "Save Changes" : "Create Task"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
