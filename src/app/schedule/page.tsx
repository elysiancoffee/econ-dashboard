"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useApp } from "@/lib/store";
import { Plus, Trash2, X, Check, ChevronDown, Palette, AlertCircle, Sparkles, RefreshCw, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { dbFetchTeamSchedule, dbSaveTeamSchedule } from "@/lib/actions";
import { generateAutomatedTasks } from "@/lib/schedule-automation";
import { toast } from "sonner";
import {
  Period,
  ScheduleTask,
  Assignment,
  UserColorConfig,
  ScheduleData,
  MONTHS,
  CURRENT_YEAR,
  YEAR_OPTIONS,
  isActivePeriod,
  formatPeriod,
  DEFAULT_PALETTES,
  DEFAULT_SCHEDULE,
  ROLE_ORDER,
  normalizeHex,
  getUserColor,
} from "@/lib/schedule-types";
import { ScheduleShareModal } from "./schedule-share-modal";

const STORAGE_KEY = "econ_schedule_v2";

function loadSchedule(): ScheduleData {
  if (typeof window === "undefined") return DEFAULT_SCHEDULE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_SCHEDULE;
}

function saveSchedule(data: ScheduleData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ─── Sub-component: Period Editor ─────────────────────────────────────────────

interface PeriodEditorProps {
  period: Period;
  onSave: (updated: Omit<Period, "id">) => void;
  onClose: () => void;
}

function PeriodEditor({ period, onSave, onClose }: PeriodEditorProps) {
  const [sm, setSm] = useState(period.startMonth);
  const [sy, setSy] = useState(period.startYear);
  const [em, setEm] = useState(period.endMonth);
  const [ey, setEy] = useState(period.endYear);

  const sel = "bg-background border border-border/60 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer";

  return (
    <div className="absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2 bg-popover border border-border/60 rounded-xl shadow-xl p-4 min-w-[220px] space-y-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Edit Period Range</p>

      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground font-semibold">Start</p>
        <div className="flex gap-2">
          <select value={sm} onChange={e => setSm(+e.target.value)} className={sel}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={sy} onChange={e => setSy(+e.target.value)} className={sel}>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground font-semibold">End</p>
        <div className="flex gap-2">
          <select value={em} onChange={e => setEm(+e.target.value)} className={sel}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={ey} onChange={e => setEy(+e.target.value)} className={sel}>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave({ startMonth: sm, startYear: sy, endMonth: em, endYear: ey })}
          className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-lg py-1.5 text-xs font-bold hover:opacity-90 transition-opacity"
        >
          <Check className="h-3.5 w-3.5" /> Save
        </button>
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg border border-border/60 text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Sub-component: New Period Form ───────────────────────────────────────────

interface NewPeriodFormProps {
  onAdd: (p: Omit<Period, "id">) => void;
  onClose: () => void;
}

function NewPeriodForm({ onAdd, onClose }: NewPeriodFormProps) {
  const [sm, setSm] = useState(1);
  const [sy, setSy] = useState(CURRENT_YEAR);
  const [em, setEm] = useState(4);
  const [ey, setEy] = useState(CURRENT_YEAR);

  const sel = "bg-background border border-border/60 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer";

  return (
    <div className="bg-popover border border-border/60 rounded-xl shadow-xl p-4 min-w-[220px] space-y-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Add Period</p>

      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground font-semibold">Start</p>
        <div className="flex gap-2">
          <select value={sm} onChange={e => setSm(+e.target.value)} className={sel}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={sy} onChange={e => setSy(+e.target.value)} className={sel}>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground font-semibold">End</p>
        <div className="flex gap-2">
          <select value={em} onChange={e => setEm(+e.target.value)} className={sel}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={ey} onChange={e => setEy(+e.target.value)} className={sel}>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => { onAdd({ startMonth: sm, startYear: sy, endMonth: em, endYear: ey }); onClose(); }}
          className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-lg py-1.5 text-xs font-bold hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
        <button onClick={onClose} className="px-3 py-1.5 rounded-lg border border-border/60 text-xs text-muted-foreground hover:bg-muted transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Sub-component: User Badge ────────────────────────────────────────────────

function UserBadge({
  username,
  color,
  size = "md",
  isSelf = false,
  onClick,
}: {
  username: string;
  color: UserColorConfig;
  size?: "sm" | "md";
  isSelf?: boolean;
  onClick?: () => void;
}) {
  return (
    <span
      onClick={onClick}
      style={{ backgroundColor: color.bg, color: color.text }}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-bold transition-all duration-150 select-none shadow-xs",
        size === "sm" ? "px-3 py-1 text-xs" : "px-3.5 py-1.5 text-xs",
        isSelf && "cursor-pointer ring-2 ring-primary/40 hover:ring-primary hover:scale-105"
      )}
      title={isSelf ? "Click to customize your schedule color" : undefined}
    >
      <span className="truncate max-w-[140px] tracking-tight">{username}</span>
      {isSelf && <Palette className="h-3 w-3 ml-1.5 opacity-80" />}
    </span>
  );
}

// ─── Sub-component: Color Customizer Modal ────────────────────────────────────

interface UserColorCustomizerProps {
  username: string;
  currentColor: UserColorConfig;
  allUsernames: string[];
  userColors?: Record<string, UserColorConfig>;
  onSave: (color: UserColorConfig) => void;
  onClose: () => void;
}

function UserColorCustomizer({
  username,
  currentColor,
  allUsernames,
  userColors,
  onSave,
  onClose,
}: UserColorCustomizerProps) {
  const [bg, setBg] = useState(currentColor.bg);
  const [text, setText] = useState(currentColor.text);

  // Check uniqueness: cannot match any other user's background color
  const conflictUser = useMemo(() => {
    const normalizedSelected = normalizeHex(bg);
    const otherUsers = allUsernames.filter(u => u !== username);
    return otherUsers.find(u => {
      const uColor = getUserColor(u, userColors, allUsernames);
      return normalizeHex(uColor.bg) === normalizedSelected;
    });
  }, [bg, username, allUsernames, userColors]);

  const isValidHex = /^#([0-9A-F]{3}){1,2}$/i.test(bg.trim());
  const canSave = isValidHex && !conflictUser;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    onSave({ bg: normalizeHex(bg), text });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-popover border border-border/80 rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-5 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border/40">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              Customize Your Color
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Personalize how @{username} looks on the schedule.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live Preview */}
        <div className="bg-muted/30 border border-border/40 rounded-xl p-4 flex flex-col items-center justify-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Live Preview</span>
          <div
            style={{ backgroundColor: bg, color: text }}
            className="px-5 py-2 rounded-full font-bold text-sm shadow-md transition-all select-none"
          >
            {username}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Background color */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">Background Color</label>
              <span className="text-[10px] font-mono text-muted-foreground uppercase">{bg}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={normalizeHex(bg)}
                onChange={(e) => setBg(e.target.value)}
                className="w-10 h-10 rounded-xl border border-border/60 cursor-pointer bg-transparent p-0.5"
              />
              <input
                type="text"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
                placeholder="#2563eb"
                className="flex-1 bg-background border border-border/60 rounded-xl px-3 py-2 text-xs font-mono uppercase outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Quick Palette Swatches */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {DEFAULT_PALETTES.map((preset) => {
                const isSelected = normalizeHex(preset.bg) === normalizeHex(bg);
                return (
                  <button
                    key={preset.bg}
                    type="button"
                    onClick={() => { setBg(preset.bg); setText(preset.text); }}
                    style={{ backgroundColor: preset.bg }}
                    className={cn(
                      "w-6 h-6 rounded-full border border-black/20 transition-all hover:scale-110 shrink-0",
                      isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                    )}
                    title={preset.bg}
                  />
                );
              })}
            </div>

            {/* Conflict validation alert */}
            {conflictUser && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs mt-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>This color is already claimed by <strong>@{conflictUser}</strong>. Please choose a unique background.</span>
              </div>
            )}
            {!conflictUser && isValidHex && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium px-1">
                <Check className="h-3.5 w-3.5" />
                <span>Unique background color available!</span>
              </div>
            )}
          </div>

          {/* Text Color Options */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Text Color</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setText("#ffffff")}
                className={cn(
                  "flex items-center justify-center gap-2 p-2 rounded-xl border text-xs font-bold transition-all",
                  text === "#ffffff"
                    ? "bg-foreground text-background border-foreground shadow-xs"
                    : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted"
                )}
              >
                <span className="w-3 h-3 rounded-full bg-white border border-black/20" /> Light Text
              </button>
              <button
                type="button"
                onClick={() => setText("#0a0a0a")}
                className={cn(
                  "flex items-center justify-center gap-2 p-2 rounded-xl border text-xs font-bold transition-all",
                  text === "#0a0a0a"
                    ? "bg-foreground text-background border-foreground shadow-xs"
                    : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted"
                )}
              >
                <span className="w-3 h-3 rounded-full bg-neutral-950 border border-white/20" /> Dark Text
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-border/40">
            <button
              type="submit"
              disabled={!canSave}
              className="flex-1 bg-primary text-primary-foreground font-bold rounded-xl py-2.5 text-xs flex items-center justify-center gap-1.5 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Check className="h-4 w-4" /> Save Color
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border/60 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const { currentUser, users, boards, tasks, addTasks } = useApp();
  const isBoss = currentUser.role === "Boss";

  const [schedule, setSchedule] = useState<ScheduleData>(DEFAULT_SCHEDULE);
  const [loaded, setLoaded] = useState(false);
  const [editingCell, setEditingCell] = useState<{ taskId: string; periodId: string } | null>(null);
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [showNewPeriodForm, setShowNewPeriodForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [inlineValue, setInlineValue] = useState("");
  const [newTaskName, setNewTaskName] = useState("");
  const [isSyncingTasks, setIsSyncingTasks] = useState(false);

  // Color picker modal state (only for currentUser)
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  // Boss Share modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const cellDropdownRef = useRef<HTMLDivElement>(null);
  const allUsernames = useMemo(() => [...users].map(u => u.username).sort(), [users]);

  const isFirstRender = useRef(true);

  useEffect(() => {
    const local = loadSchedule();
    setSchedule(local);

    dbFetchTeamSchedule()
      .then((dbData) => {
        if (dbData && dbData.periods && dbData.tasks) {
          setSchedule(dbData);
          saveSchedule(dbData);
        } else {
          dbSaveTeamSchedule(local);
        }
        setLoaded(true);
      })
      .catch((err) => {
        console.error("Error loading schedule from DB:", err);
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (loaded) {
      saveSchedule(schedule);
      dbSaveTeamSchedule(schedule);
    }
  }, [schedule, loaded]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cellDropdownRef.current && !cellDropdownRef.current.contains(e.target as Node)) {
        setEditingCell(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Schedule Mutations & Task Automation ───────────────────────

  const getAssignment = (taskId: string, periodId: string) =>
    schedule.assignments.find(a => a.taskId === taskId && a.periodId === periodId);

  const setAssignment = async (taskId: string, periodId: string, usernames: string[]) => {
    setSchedule(prev => {
      const filtered = prev.assignments.filter(a => !(a.taskId === taskId && a.periodId === periodId));
      return { ...prev, assignments: usernames.length > 0 ? [...filtered, { taskId, periodId, usernames }] : filtered };
    });

    // If new assignees were added, automatically generate recurring tasks
    if (usernames.length > 0 && isBoss) {
      const taskItem = schedule.tasks.find(t => t.id === taskId);
      const period = schedule.periods.find(p => p.id === periodId);

      if (taskItem && period) {
        const assignedUsers = users.filter(u => usernames.includes(u.username));
        const newAutomatedTasks = generateAutomatedTasks({
          scheduleTaskName: taskItem.name,
          period,
          assignedUsers,
          existingTasks: tasks,
          boards,
        });

        if (newAutomatedTasks.length > 0) {
          try {
            await addTasks(newAutomatedTasks);
            toast.success(`Automated ${newAutomatedTasks.length} recurring task(s) for @${usernames.join(", @")}.`);
          } catch (err) {
            console.error("Failed to generate automated tasks:", err);
          }
        }
      }
    }
  };

  const handleSyncAllScheduleTasks = async () => {
    if (!isBoss) return;
    setIsSyncingTasks(true);
    try {
      let totalGenerated = 0;
      const allNewTasks: any[] = [];
      let runningTasks = [...tasks];

      for (const assignment of schedule.assignments) {
        if (!assignment.usernames || assignment.usernames.length === 0) continue;
        const taskItem = schedule.tasks.find(t => t.id === assignment.taskId);
        const period = schedule.periods.find(p => p.id === assignment.periodId);
        if (!taskItem || !period) continue;

        const assignedUsers = users.filter(u => assignment.usernames.includes(u.username));
        const newTasks = generateAutomatedTasks({
          scheduleTaskName: taskItem.name,
          period,
          assignedUsers,
          existingTasks: runningTasks,
          boards,
        });

        if (newTasks.length > 0) {
          allNewTasks.push(...newTasks);
          runningTasks = [...runningTasks, ...(newTasks as any)];
          totalGenerated += newTasks.length;
        }
      }

      if (allNewTasks.length > 0) {
        await addTasks(allNewTasks);
        toast.success(`Synced! Created ${totalGenerated} automated recurring task(s).`);
      } else {
        toast.info("All tasks for the current schedule are already up to date. No duplicates needed.");
      }
    } catch (err) {
      console.error("Sync error:", err);
      toast.error("Failed to sync automated tasks.");
    } finally {
      setIsSyncingTasks(false);
    }
  };

  const toggleUser = (username: string) => {
    if (!editingCell) return;
    const { taskId, periodId } = editingCell;
    const cur = getAssignment(taskId, periodId)?.usernames ?? [];
    const next = cur.includes(username) ? cur.filter(u => u !== username) : [...cur, username];
    setAssignment(taskId, periodId, next);
  };

  const updatePeriod = (id: string, data: Omit<Period, "id">) => {
    setSchedule(prev => ({ ...prev, periods: prev.periods.map(p => p.id === id ? { id, ...data } : p) }));
    setEditingPeriodId(null);
  };

  const addPeriod = (data: Omit<Period, "id">) => {
    setSchedule(prev => ({ ...prev, periods: [...prev.periods, { id: `p${Date.now()}`, ...data }] }));
  };

  const deletePeriod = (id: string) => {
    setSchedule(prev => ({
      ...prev,
      periods: prev.periods.filter(p => p.id !== id),
      assignments: prev.assignments.filter(a => a.periodId !== id),
    }));
  };

  const addTask = () => {
    if (!newTaskName.trim()) return;
    setSchedule(prev => ({ ...prev, tasks: [...prev.tasks, { id: `t${Date.now()}`, name: newTaskName.trim() }] }));
    setNewTaskName("");
  };

  const deleteTask = (id: string) => {
    setSchedule(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== id),
      assignments: prev.assignments.filter(a => a.taskId !== id),
    }));
  };

  const renameTask = (id: string, name: string) => {
    setSchedule(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === id ? { ...t, name } : t) }));
    setEditingTaskId(null);
  };

  // Custom User Color Save
  const handleSaveUserColor = (color: UserColorConfig) => {
    setSchedule(prev => ({
      ...prev,
      userColors: {
        ...(prev.userColors || {}),
        [currentUser.username]: color,
      },
    }));
    setIsColorPickerOpen(false);
    toast.success(`Updated your schedule color!`);
  };

  // ── Roster Groups ────────────────────────────────────────────

  const ROLE_ORDER = ["Boss", "Underboss", "Consigliere", "Bagman", "Associate", "Custodian"];
  const rosterGroups = ROLE_ORDER
    .map(role => ({ role, members: users.filter(u => u.role === role) }))
    .filter(g => g.members.length > 0);

  if (!loaded) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/40 border border-border/40 p-6 rounded-2xl backdrop-blur-md">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isBoss ? "Click any cell to assign. Click period headers to edit dates." : "Staff assignment schedule by period."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isBoss && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground hover:opacity-90 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs"
              title="Share direct link or generate clean HTML embed code"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Share</span>
            </button>
          )}
          {isBoss && (
            <button
              onClick={handleSyncAllScheduleTasks}
              disabled={isSyncingTasks}
              className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-2xs disabled:opacity-50"
              title="Ensure all scheduled tasks across all periods are created without duplicates"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isSyncingTasks && "animate-spin")} />
              <span>{isSyncingTasks ? "Syncing Tasks..." : "Sync Recurring Tasks"}</span>
            </button>
          )}
          <button
            onClick={() => setIsColorPickerOpen(true)}
            className="flex items-center gap-2 bg-background/60 hover:bg-background border border-border/60 hover:border-border text-foreground px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-2xs"
          >
            <Palette className="h-3.5 w-3.5 text-primary" />
            <span>Customize My Color</span>
          </button>
          {isBoss && (
            <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/25 shadow-xs">
              Boss Mode
            </span>
          )}
        </div>
      </div>

      {/* Roster */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Family Roster</p>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-md overflow-hidden divide-y divide-border/30 shadow-xs">
          {rosterGroups.map(({ role, members }) => (
            <div key={role} className="flex items-center gap-4 px-5 py-3.5">
              <span className="text-xs font-bold text-muted-foreground w-28 shrink-0 tracking-wide">{role}</span>
              <div className="flex flex-wrap gap-2">
                {members.map(m => {
                  const isSelf = m.username === currentUser.username;
                  const color = getUserColor(m.username, schedule.userColors, allUsernames);
                  return (
                    <UserBadge
                      key={m.id}
                      username={m.username}
                      color={color}
                      size="md"
                      isSelf={isSelf}
                      onClick={isSelf ? () => setIsColorPickerOpen(true) : undefined}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assignment Grid */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Task Assignments by Period</p>

        <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-md overflow-x-auto shadow-sm">
          <table className="w-full text-sm border-collapse min-w-[640px]">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                <th className="px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground w-44">
                  Task
                </th>

                {schedule.periods.map((p) => {
                  const active = isActivePeriod(p);
                  return (
                    <th key={p.id} className={cn("px-4 py-3.5 text-center relative transition-colors", active && "bg-primary/5")}>
                      <div className="flex flex-col items-center gap-1 group">
                        {active && (
                          <span className="inline-flex items-center gap-1 text-[8.5px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                            <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                            Now
                          </span>
                        )}

                        {editingPeriodId === p.id ? (
                          <PeriodEditor
                            period={p}
                            onSave={(data) => updatePeriod(p.id, data)}
                            onClose={() => setEditingPeriodId(null)}
                          />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              disabled={!isBoss}
                              onClick={() => { if (isBoss) setEditingPeriodId(p.id); }}
                              className={cn(
                                "text-[10.5px] font-black uppercase tracking-wider text-muted-foreground leading-tight px-2 py-1 rounded-lg transition-all",
                                active && "text-primary font-extrabold",
                                isBoss && "hover:text-foreground hover:bg-muted/40 cursor-pointer"
                              )}
                            >
                              {formatPeriod(p)}
                              {isBoss && <ChevronDown className="inline h-3 w-3 ml-1 opacity-60" />}
                            </button>
                            {isBoss && (
                              <button
                                onClick={() => deletePeriod(p.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded-md"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}

                {isBoss && (
                  <th className="px-4 py-3.5 text-center relative w-24">
                    {showNewPeriodForm ? (
                      <div className="absolute z-50 top-full mt-1 right-0">
                        <NewPeriodForm
                          onAdd={addPeriod}
                          onClose={() => setShowNewPeriodForm(false)}
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowNewPeriodForm(true)}
                        className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 hover:text-muted-foreground transition-colors flex items-center gap-1 mx-auto px-2 py-1 rounded-lg hover:bg-muted/40"
                      >
                        <Plus className="h-3 w-3" /> Period
                      </button>
                    )}
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-border/20">
              {schedule.tasks.map((task) => (
                <tr key={task.id} className="hover:bg-muted/10 transition-colors group/row">

                  {/* Task Name */}
                  <td className="px-5 py-3.5 font-bold text-sm whitespace-nowrap text-foreground">
                    {editingTaskId === task.id ? (
                      <form
                        onSubmit={e => { e.preventDefault(); if (inlineValue.trim()) renameTask(task.id, inlineValue.trim()); }}
                        className="flex items-center gap-1"
                      >
                        <input
                          autoFocus
                          value={inlineValue}
                          onChange={e => setInlineValue(e.target.value)}
                          className="w-36 bg-background border border-border rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-primary/40 font-semibold"
                        />
                        <button type="submit" className="p-1 text-emerald-400 hover:bg-muted/50 rounded"><Check className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => setEditingTaskId(null)} className="p-1 text-muted-foreground hover:bg-muted/50 rounded"><X className="h-3.5 w-3.5" /></button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(isBoss && "cursor-pointer hover:text-primary transition-colors")}
                          onClick={() => { if (isBoss) { setEditingTaskId(task.id); setInlineValue(task.name); } }}
                        >
                          {task.name}
                        </span>
                        {isBoss && (
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="opacity-0 group-hover/row:opacity-100 transition-opacity text-muted-foreground/60 hover:text-destructive p-1 rounded-md"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Assignment Cells */}
                  {schedule.periods.map((p) => {
                    const assignment = getAssignment(task.id, p.id);
                    const isOpen = editingCell?.taskId === task.id && editingCell?.periodId === p.id;
                    const active = isActivePeriod(p);

                    return (
                      <td key={p.id} className={cn("px-3 py-2.5 text-center align-middle relative", active && "bg-primary/5")}>
                        <div ref={isOpen ? cellDropdownRef : undefined} className="relative inline-block w-full">
                          <button
                            disabled={!isBoss}
                            onClick={() => isBoss && setEditingCell(isOpen ? null : { taskId: task.id, periodId: p.id })}
                            className={cn(
                              "w-full min-h-[44px] rounded-xl p-2 transition-all duration-200 flex flex-wrap gap-1.5 items-center justify-center border",
                              isBoss && "hover:bg-card/70 hover:border-border/60 hover:shadow-xs cursor-pointer",
                              isOpen
                                ? "bg-card/80 border-primary ring-2 ring-primary/20 shadow-sm"
                                : !assignment?.usernames?.length
                                ? "bg-transparent border-dashed border-border/20 text-muted-foreground/30 hover:border-border/40"
                                : "bg-card/30 border-border/30 backdrop-blur-xs shadow-2xs"
                            )}
                          >
                            {assignment?.usernames?.length ? (
                              assignment.usernames.map(username => {
                                const color = getUserColor(username, schedule.userColors, allUsernames);
                                return (
                                  <UserBadge
                                    key={username}
                                    username={username}
                                    color={color}
                                    size="sm"
                                  />
                                );
                              })
                            ) : (
                              <span className="text-[11px] text-muted-foreground/25 font-semibold">{isBoss ? "—" : ""}</span>
                            )}
                          </button>

                          {/* User picker dropdown */}
                          {isOpen && (
                            <div className="absolute z-50 top-full mt-1.5 left-1/2 -translate-x-1/2 bg-popover/95 backdrop-blur-lg border border-border/60 rounded-2xl shadow-xl p-2.5 min-w-[180px] space-y-1 animate-in fade-in zoom-in-95 duration-150">
                              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-2 py-1">Assign Staff</p>
                              <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
                                {users.map(u => {
                                  const checked = assignment?.usernames.includes(u.username) ?? false;
                                  const color = getUserColor(u.username, schedule.userColors, allUsernames);
                                  return (
                                    <button
                                      key={u.id}
                                      onClick={() => toggleUser(u.username)}
                                      className={cn(
                                        "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all",
                                        checked
                                          ? "bg-primary/15 text-foreground shadow-2xs font-semibold"
                                          : "hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                                      )}
                                    >
                                      <span
                                        style={{ backgroundColor: color.bg }}
                                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                                      />
                                      <span className="flex-1 text-left truncate">{u.username}</span>
                                      {checked && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>
                              {(assignment?.usernames?.length ?? 0) > 0 && (
                                <button
                                  onClick={() => setAssignment(task.id, p.id, [])}
                                  className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-xs text-destructive hover:bg-destructive/10 transition-colors mt-1.5 border-t border-border/30 pt-2 font-semibold"
                                >
                                  <X className="h-3.5 w-3.5" /> Clear Assignments
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}

                  {isBoss && <td />}
                </tr>
              ))}

              {isBoss && (
                <tr className="border-t border-dashed border-border/30">
                  <td className="px-5 py-3.5" colSpan={schedule.periods.length + 2}>
                    <form onSubmit={e => { e.preventDefault(); addTask(); }} className="flex items-center gap-2.5">
                      <Plus className="h-4 w-4 text-muted-foreground/40" />
                      <input
                        value={newTaskName}
                        onChange={e => setNewTaskName(e.target.value)}
                        placeholder="Add a new task row..."
                        className="flex-1 bg-transparent text-sm text-muted-foreground placeholder:text-muted-foreground/30 outline-none font-medium"
                      />
                    </form>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Color Customizer Modal */}
      {isColorPickerOpen && (
        <UserColorCustomizer
          username={currentUser.username}
          currentColor={getUserColor(currentUser.username, schedule.userColors, allUsernames)}
          allUsernames={allUsernames}
          userColors={schedule.userColors}
          onSave={handleSaveUserColor}
          onClose={() => setIsColorPickerOpen(false)}
        />
      )}

      {/* Boss Share & Embed Modal */}
      {isBoss && (
        <ScheduleShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}

    </div>
  );
}
