"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ScheduleData,
  PublicRosterUser,
  DEFAULT_SCHEDULE,
  DEFAULT_PALETTES,
  isActivePeriod,
  formatPeriod,
  getUserColor,
  ROLE_ORDER,
} from "@/lib/schedule-types";
import { dbFetchPublicSchedule } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { CalendarDays, RefreshCw, Moon, Sun, ExternalLink } from "lucide-react";
import { useTheme } from "next-themes";

function EmbedScheduleContent() {
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();

  // Query options
  const hideRoster = searchParams.get("hideRoster") === "true";
  const hideHeader = searchParams.get("hideHeader") === "true";
  const title = searchParams.get("title") || "ECON Team Schedule";
  const forcedTheme = searchParams.get("theme"); // "dark" | "light"
  const isStandalone = searchParams.get("standalone") === "true";

  const [schedule, setSchedule] = useState<ScheduleData>(DEFAULT_SCHEDULE);
  const [users, setUsers] = useState<PublicRosterUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    if (forcedTheme === "dark" || forcedTheme === "light") {
      setTheme(forcedTheme);
    }
  }, [forcedTheme, setTheme]);

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await dbFetchPublicSchedule();
      if (data?.schedule?.periods && data?.schedule?.tasks) {
        setSchedule(data.schedule);
      }
      if (data?.users) {
        setUsers(data.users);
      }
      setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch (err) {
      console.error("Failed to load public schedule data:", err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const allUsernames = useMemo(() => [...users].map((u) => u.username).sort(), [users]);

  const rosterGroups = useMemo(() => {
    return ROLE_ORDER.map((role) => ({
      role,
      members: users.filter((u) => u.role === role),
    })).filter((g) => g.members.length > 0);
  }, [users]);

  const activePeriod = useMemo(() => {
    return schedule.periods.find((p) => isActivePeriod(p));
  }, [schedule.periods]);

  const getAssignment = (taskId: string, periodId: string) =>
    schedule.assignments.find((a) => a.taskId === taskId && a.periodId === periodId);

  if (loading) {
    return (
      <div className="flex min-h-[350px] w-full items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs font-semibold text-muted-foreground animate-pulse">Loading schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full bg-background text-foreground antialiased transition-colors duration-200",
        isStandalone ? "max-w-6xl mx-auto p-4 sm:p-6 md:p-8" : "p-3 sm:p-5"
      )}
    >
      <div className="space-y-5">
        {/* Header */}
        {!hideHeader && (
          <header className="flex flex-wrap items-center justify-between gap-3 bg-card/60 border border-border/50 p-4 sm:p-5 rounded-2xl backdrop-blur-md shadow-xs">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>{title}</span>
                  {activePeriod && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active: {formatPeriod(activePeriod)}
                    </span>
                  )}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Live staff assignment schedule by period.
                  {lastUpdated && <span className="ml-1 opacity-75">• Synced {lastUpdated}</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => loadData(true)}
                disabled={refreshing}
                title="Refresh schedule"
                className="p-2 rounded-xl bg-background/80 hover:bg-background border border-border/60 text-muted-foreground hover:text-foreground transition-all shadow-2xs"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
              </button>

              {!forcedTheme && (
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  title="Toggle theme"
                  className="p-2 rounded-xl bg-background/80 hover:bg-background border border-border/60 text-muted-foreground hover:text-foreground transition-all shadow-2xs"
                >
                  {theme === "dark" ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-indigo-400" />}
                </button>
              )}

              {isStandalone && (
                <a
                  href="/schedule"
                  target="_blank"
                  rel="noreferrer"
                  title="Open in Inner Circle App"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs"
                >
                  <span>App</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </header>
        )}

        {/* Family Roster */}
        {!hideRoster && rosterGroups.length > 0 && (
          <section aria-label="Team Roster" className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-md overflow-hidden divide-y divide-border/30 shadow-xs">
            <div className="px-5 py-2.5 bg-muted/20 border-b border-border/30 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Team Roster</span>
              <span className="text-[10px] text-muted-foreground font-semibold">{users.length} Members</span>
            </div>
            {rosterGroups.map(({ role, members }) => (
              <div key={role} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 sm:px-5 py-3">
                <span className="text-xs font-bold text-muted-foreground w-28 shrink-0 tracking-wide">{role}</span>
                <div className="flex flex-wrap gap-1.5">
                  {members.map((m) => {
                    const color = getUserColor(m.username, schedule.userColors, allUsernames);
                    return (
                      <span
                        key={m.id}
                        style={{ backgroundColor: color.bg, color: color.text }}
                        className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold shadow-xs select-none"
                      >
                        <span className="truncate max-w-[140px] tracking-tight">{m.username}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Schedule Grid */}
        <section aria-label="Assignment Matrix" className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-md overflow-x-auto shadow-xs">
          <table className="w-full text-sm border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                <th className="px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground w-44">
                  Task
                </th>
                {schedule.periods.map((p) => {
                  const active = isActivePeriod(p);
                  return (
                    <th
                      key={p.id}
                      className={cn(
                        "px-4 py-3.5 text-center relative transition-colors",
                        active && "bg-primary/5 font-extrabold"
                      )}
                    >
                      <div className="flex flex-col items-center gap-1">
                        {active && (
                          <span className="inline-flex items-center gap-1 text-[8.5px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                            <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                            Now
                          </span>
                        )}
                        <span
                          className={cn(
                            "text-[11px] font-black uppercase tracking-wider text-muted-foreground leading-tight px-1",
                            active && "text-primary font-black"
                          )}
                        >
                          {formatPeriod(p)}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-border/20">
              {schedule.tasks.map((task) => (
                <tr key={task.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-sm whitespace-nowrap text-foreground">
                    {task.name}
                  </td>
                  {schedule.periods.map((p) => {
                    const assignment = getAssignment(task.id, p.id);
                    const active = isActivePeriod(p);
                    const assignees = assignment?.usernames || [];

                    return (
                      <td
                        key={p.id}
                        className={cn(
                          "px-3 py-2.5 text-center align-middle relative",
                          active && "bg-primary/5"
                        )}
                      >
                        <div
                          className={cn(
                            "w-full min-h-[44px] rounded-xl p-2 flex flex-wrap gap-1.5 items-center justify-center border transition-all",
                            assignees.length > 0
                              ? "bg-card/30 border-border/30 backdrop-blur-xs shadow-2xs"
                              : "bg-transparent border-dashed border-border/20"
                          )}
                        >
                          {assignees.length > 0 ? (
                            assignees.map((username) => {
                              const color = getUserColor(username, schedule.userColors, allUsernames);
                              return (
                                <span
                                  key={username}
                                  style={{ backgroundColor: color.bg, color: color.text }}
                                  className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold shadow-xs select-none"
                                >
                                  <span className="truncate max-w-[130px] tracking-tight">{username}</span>
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[11px] text-muted-foreground/20 font-medium">—</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

export default function EmbedSchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[300px] w-full items-center justify-center p-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <EmbedScheduleContent />
    </Suspense>
  );
}
