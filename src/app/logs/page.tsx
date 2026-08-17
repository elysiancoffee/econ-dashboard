"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Calendar, User, ChevronLeft, ChevronRight,
  LogIn, LogOut, UserPlus, UserMinus, ShieldCheck,
  ClipboardList, ClipboardPlus, ClipboardX, ClipboardPen,
  LayoutGridIcon, Pencil, Trash2,
  Coins, Link2, Repeat2, Wifi,
} from "lucide-react";
import { notFound } from "next/navigation";

function getLogIcon(action: string) {
  const a = action.toLowerCase();
  if (a.includes("came online"))        return { icon: Wifi,          color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" };
  if (a.includes("signed out"))         return { icon: LogOut,         color: "text-rose-500",    bg: "bg-rose-500/10 border-rose-500/20" };
  if (a.includes("signed in") || a.includes("logged in")) return { icon: LogIn, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" };
  if (a.includes("added @") || a.includes("to the team")) return { icon: UserPlus,  color: "text-teal-500",   bg: "bg-teal-500/10 border-teal-500/20" };
  if (a.includes("removed @") || a.includes("from the team")) return { icon: UserMinus, color: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/20" };
  if (a.includes("promoted"))           return { icon: ShieldCheck,    color: "text-violet-500",  bg: "bg-violet-500/10 border-violet-500/20" };
  if (a.includes("switched view"))      return { icon: User,           color: "text-blue-400",    bg: "bg-blue-400/10 border-blue-400/20" };
  if (a.includes("assigned") && !a.includes("reassigned")) return { icon: ClipboardPlus, color: "text-teal-500", bg: "bg-teal-500/10 border-teal-500/20" };
  if (a.includes("reassigned"))         return { icon: Repeat2,        color: "text-amber-500",   bg: "bg-amber-500/10 border-amber-500/20" };
  if (a.includes("scheduled") || a.includes("recurring")) return { icon: Repeat2, color: "text-indigo-500", bg: "bg-indigo-500/10 border-indigo-500/20" };
  if (a.includes("marked") || a.includes("edited task")) return { icon: ClipboardPen, color: "text-sky-500", bg: "bg-sky-500/10 border-sky-500/20" };
  if (a.includes("deleted task"))       return { icon: ClipboardX,     color: "text-rose-500",    bg: "bg-rose-500/10 border-rose-500/20" };
  if (a.includes("created board"))      return { icon: LayoutGridIcon,  color: "text-teal-500",   bg: "bg-teal-500/10 border-teal-500/20" };
  if (a.includes("deleted board"))      return { icon: Trash2,          color: "text-rose-500",   bg: "bg-rose-500/10 border-rose-500/20" };
  if (a.includes("updated board"))      return { icon: Pencil,          color: "text-amber-500",  bg: "bg-amber-500/10 border-amber-500/20" };
  if (a.includes("black chip"))         return { icon: Coins,           color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/20" };
  if (a.includes("shortcut"))           return { icon: Link2,           color: "text-slate-400",  bg: "bg-slate-400/10 border-slate-400/20" };
  return { icon: ClipboardList, color: "text-muted-foreground", bg: "bg-muted/40 border-border" };
}

export default function LogsPage() {
  const { logs, users, currentUser } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUser, setFilterUser] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  if (currentUser.role !== "Boss") {
    notFound();
  }

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterUser]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUser = filterUser === "all" || log.username === filterUser;
    return matchesSearch && matchesUser;
  });

  const totalEntries = filteredLogs.length;
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalEntries);
  const sortedLogs = [...filteredLogs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const paginatedLogs = sortedLogs.slice(startIndex, endIndex);

  // Group logs by date
  const groupedLogs = paginatedLogs.reduce<Record<string, typeof paginatedLogs>>((groups, log) => {
    const date = new Date(log.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    let label: string;
    if (date.toDateString() === today.toDateString()) {
      label = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = "Yesterday";
    } else {
      label = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    }
    if (!groups[label]) groups[label] = [];
    groups[label].push(log);
    return groups;
  }, {});

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity Log</h1>
        <p className="text-muted-foreground mt-1">
          A complete audit trail of all staff actions and system events.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by action or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/30 border-none"
              />
            </div>
            <div className="w-full sm:w-[220px]">
              <Select value={filterUser} onValueChange={(val) => setFilterUser(val || "all")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.username}>
                      @{u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {Object.keys(groupedLogs).length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm border border-dashed rounded-xl">
              No activity found matching your search.
            </div>
          )}

          {Object.entries(groupedLogs).map(([dateLabel, entries]) => (
            <div key={dateLabel}>
              {/* Date divider */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                  {dateLabel}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="space-y-2">
                {entries.map((log) => {
                  const { icon: Icon, color, bg } = getLogIcon(log.action);
                  const time = new Date(log.timestamp).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-muted/30 transition-colors"
                    >
                      <div className={`flex-shrink-0 mt-0.5 rounded-full border p-1.5 ${bg}`}>
                        <Icon className={`h-3.5 w-3.5 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-snug">{log.action}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <User className="h-3 w-3 flex-shrink-0" />
                          <span className="font-medium">@{log.username}</span>
                          <span className="text-border">·</span>
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          <span>{time}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Pagination Footer */}
          {filteredLogs.length > 0 && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-border mt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground order-2 md:order-1">
                <span>Show</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[75px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50, 100].map((size) => (
                      <SelectItem key={size} value={size.toString()} className="ps-3 py-1.5">
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>per page</span>
              </div>

              <div className="text-xs font-medium text-muted-foreground order-1 md:order-2">
                {totalEntries === 0 ? "No entries" : `${startIndex + 1}–${endIndex} of ${totalEntries} entries`}
              </div>

              <div className="flex items-center gap-2 order-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={activePage === 1}
                  className="h-8 gap-1.5 rounded-lg border-muted-foreground/10 hover:bg-muted/30"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => page === 1 || page === totalPages || Math.abs(page - activePage) <= 1)
                    .map((page, index, arr) => {
                      const showEllipsisBefore = index > 0 && page - arr[index - 1] > 1;
                      return (
                        <React.Fragment key={page}>
                          {showEllipsisBefore && (
                            <span className="px-1 text-muted-foreground text-sm">...</span>
                          )}
                          <Button
                            variant={activePage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={`h-8 w-8 p-0 rounded-lg font-medium text-xs ${
                              activePage === page
                                ? "shadow-sm"
                                : "border-muted-foreground/10 hover:bg-muted/30"
                            }`}
                          >
                            {page}
                          </Button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={activePage === totalPages}
                  className="h-8 gap-1.5 rounded-lg border-muted-foreground/10 hover:bg-muted/30"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

