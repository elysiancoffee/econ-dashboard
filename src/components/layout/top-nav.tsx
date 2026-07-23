"use client";

import { Bell, Search, Plus, UserCheck, Menu, AlertCircle } from "lucide-react";
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

interface TopNavProps {
  onMenuClick: () => void;
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const { currentUser, realUser, users, setCurrentUser, notifications, tasks, markNotificationAsRead } = useApp();

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
