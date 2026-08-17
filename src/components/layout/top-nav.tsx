"use client";

import { useRef, useState, useEffect } from "react";
import { Bell, Search, UserCheck, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/store";
import { isDueSoon } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TopNavProps {
  onMenuClick: () => void;
}

// Stable role-based avatar colors so each role always gets the same hue
const roleColors: Record<string, string> = {
  Boss:        "bg-rose-500/20 text-rose-400 ring-rose-500/40",
  Underboss:   "bg-orange-500/20 text-orange-400 ring-orange-500/40",
  Bagman:      "bg-amber-500/20 text-amber-400 ring-amber-500/40",
  Consigliere: "bg-violet-500/20 text-violet-400 ring-violet-500/40",
  Associate:   "bg-sky-500/20 text-sky-400 ring-sky-500/40",
  Custodian:   "bg-slate-500/20 text-slate-400 ring-slate-500/40",
};

function getInitials(username: string) {
  return username.slice(0, 2).toUpperCase();
}

const MAX_VISIBLE = 5;

export function TopNav({ onMenuClick }: TopNavProps) {
  const { currentUser, realUser, users, setCurrentUser, notifications, tasks, markNotificationAsRead, onlineUsers } = useApp();

  // ── Arrival detection & sound ──
  const swooshRef = useRef<HTMLAudioElement | null>(null);
  const prevOnlineIdsRef = useRef<Set<string>>(new Set());
  const isInitialRef = useRef(true);
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    swooshRef.current = new Audio("/swoosh.mp3");
    swooshRef.current.volume = 0.5;
  }, []);

  useEffect(() => {
    const currentIds = new Set(onlineUsers.map((u) => u.id));
    const prev = prevOnlineIdsRef.current;

    if (!isInitialRef.current) {
      // Detect users who just came online
      const arrivals = onlineUsers.filter((u) => !prev.has(u.id));
      if (arrivals.length > 0) {
        // Play sound once for any new arrival
        swooshRef.current?.play().catch(() => {});
        // Mark them for the slide-in animation
        const ids = new Set(arrivals.map((u) => u.id));
        setAnimatingIds((prev) => new Set([...prev, ...ids]));
        // Clear animation flag after it completes
        setTimeout(() => {
          setAnimatingIds((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.delete(id));
            return next;
          });
        }, 600);
      }
    } else {
      isInitialRef.current = false;
    }

    prevOnlineIdsRef.current = currentIds;
  }, [onlineUsers]);

  // 1. Dynamic "due soon" sticky notifications for current user
  const dueSoonTasks = tasks.filter((t) => 
    t.assignedUserId === currentUser.id &&
    t.status !== "Completed" &&
    t.status !== "Cancelled" &&
    isDueSoon(t.dueDate)
  );

  const dueSoonNotifs = dueSoonTasks.map((t) => ({
    id: `due-soon-${t.id}`,
    userId: currentUser.id,
    taskId: t.id,
    message: `Sticky: Task "${t.title}" is due soon or overdue! (${t.dueDate})`,
    isRead: false,
    isSticky: true,
    createdAt: new Date().toISOString(),
  }));

  // 2. Unread DB-backed notifications
  const unreadDbNotifs = notifications.filter((n) => n.userId === currentUser.id && !n.isRead);

  // Combined notifications list
  const combinedNotifs = [
    ...dueSoonNotifs,
    ...unreadDbNotifs.map((n) => ({ ...n, isSticky: false }))
  ];

  const visibleOnline = onlineUsers.slice(0, MAX_VISIBLE);
  const overflowCount = onlineUsers.length - MAX_VISIBLE;

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4 flex-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden rounded-full text-muted-foreground hover:text-foreground flex-shrink-0"
        >
          <Menu className="h-5 w-5" />
        </Button>
        {/* Breadcrumb representation */}
        <div className="text-sm font-medium text-muted-foreground hidden sm:block">
          Dashboard <span className="mx-2 text-border">/</span> Overview
        </div>
      </div>
      
      <div className="flex items-center gap-4">

        {/* ── Online users avatar group ── */}
        {onlineUsers.length > 0 && (
          <div className="hidden md:flex items-center">
            <div className="flex items-center -space-x-2">
              {visibleOnline.map((u) => {
                const colorClass = roleColors[u.role] ?? roleColors["Custodian"];
                const isNew = animatingIds.has(u.id);
                return (
                  <Tooltip key={u.id}>
                    <TooltipTrigger className="cursor-default bg-transparent border-0 p-0">
                      <div
                        className={[
                          "relative",
                          isNew
                            ? "animate-in slide-in-from-right-3 fade-in duration-500"
                            : "",
                        ].join(" ")}
                      >
                        <Avatar className={`h-8 w-8 ring-2 ring-background ${colorClass} transition-transform hover:scale-110 hover:z-10 hover:-translate-y-0.5`}>
                          <AvatarFallback className={`text-[11px] font-semibold ${colorClass}`}>
                            {getInitials(u.username)}
                          </AvatarFallback>
                        </Avatar>
                        {/* Online dot */}
                        <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background${isNew ? " animate-ping-once" : ""}`} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <span className="font-semibold">@{u.username}</span>
                      <span className="text-muted-foreground ml-1">· {u.role}</span>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {overflowCount > 0 && (
                <Tooltip>
                  <TooltipTrigger className="cursor-default bg-transparent border-0 p-0">
                    <div className="relative h-8 w-8 rounded-full bg-muted/60 ring-2 ring-background flex items-center justify-center hover:scale-110 transition-transform">
                      <span className="text-[11px] font-semibold text-muted-foreground">+{overflowCount}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {onlineUsers.slice(MAX_VISIBLE).map((u) => `@${u.username}`).join(", ")}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        )}

        <div className="relative hidden md:flex items-center">
          <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Search..." 
            className="w-64 pl-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:bg-background transition-all"
          />
        </div>
        
        {/* User Swapping Dropdown for role simulation */}
        {realUser?.role === "Boss" && (
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="outline" size="sm" className="flex items-center gap-2 rounded-full px-3">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <span className="hidden lg:inline">Switch Role: </span>
                <strong className="text-primary">{currentUser.role}</strong>
              </Button>
            } />
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Simulate User Profile</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {users.map((u) => (
                  <DropdownMenuItem 
                    key={u.id} 
                    onClick={() => setCurrentUser(u)}
                    className="flex flex-col items-start"
                  >
                    <span className="font-semibold text-sm">{u.username}</span>
                    <span className="text-xs text-muted-foreground">{u.role}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button variant="ghost" size="icon" className="relative rounded-full text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              {combinedNotifs.length > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive border-2 border-background animate-pulse" />
              )}
            </Button>
          } />
          <DropdownMenuContent align="end" className="w-80 max-h-[350px] overflow-y-auto bg-card/75 backdrop-blur-lg border border-border/40 shadow-xl">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center justify-between font-bold">
                <span>Notifications</span>
                {combinedNotifs.length > 0 && (
                  <Badge variant="destructive" className="rounded-full text-[10px] px-2 py-0.5">
                    {combinedNotifs.length}
                  </Badge>
                )}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup className="divide-y divide-border/20">
              {combinedNotifs.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No new notifications
                </div>
              ) : (
                combinedNotifs.map((notif) => (
                  <DropdownMenuItem
                    key={notif.id}
                    className="p-3 focus:bg-muted/50 cursor-pointer flex flex-col items-start gap-1"
                    onSelect={(e) => {
                      if (notif.isSticky) {
                        e.preventDefault();
                        return;
                      }
                      markNotificationAsRead(notif.id);
                    }}
                  >
                    <div className="flex items-start justify-between w-full gap-2">
                      <span className="text-xs font-medium text-foreground leading-normal">
                        {notif.message}
                      </span>
                      {notif.isSticky ? (
                        <Badge variant="outline" className="text-[8px] px-1 bg-amber-500/10 text-amber-500 border-amber-500/20 flex-shrink-0 select-none">
                          Sticky
                        </Badge>
                      ) : (
                        <span className="text-[9px] text-muted-foreground hover:text-destructive flex-shrink-0 select-none font-semibold">
                          Dismiss
                        </span>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

