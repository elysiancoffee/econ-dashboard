"use client";

import { Bell, Search, Plus, UserCheck, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/store";
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
  const { currentUser, realUser, users, setCurrentUser } = useApp();

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4 flex-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="md:hidden rounded-full text-muted-foreground hover:text-foreground flex-shrink-0"
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
                <span className="hidden md:inline">Switch Role: </span>
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

        <Button variant="ghost" size="icon" className="relative rounded-full text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive border-2 border-background" />
        </Button>
      </div>
    </header>
  );
}
