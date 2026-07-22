"use client";

import React from "react";
import { useApp, Role } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Users, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

interface MultiUserDropdownProps {
  value: string[]; // assigned user IDs
  onValueChange: (userIds: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiUserDropdown({
  value,
  onValueChange,
  placeholder = "Select assignees",
  className,
}: MultiUserDropdownProps) {
  const { users } = useApp();

  const handleToggleUser = (userId: string) => {
    if (value.includes(userId)) {
      onValueChange(value.filter((id) => id !== userId));
    } else {
      onValueChange([...value, userId]);
    }
  };

  const handleToggleRole = (role: Role) => {
    const roleUsers = users.filter((u) => u.role === role).map((u) => u.id);
    if (roleUsers.length === 0) return;

    // Check if ALL users of this role are already selected
    const allSelected = roleUsers.every((id) => value.includes(id));

    if (allSelected) {
      // Deselect all users of this role
      onValueChange(value.filter((id) => !roleUsers.includes(id)));
    } else {
      // Select all users of this role (avoiding duplicates)
      const next = [...value];
      roleUsers.forEach((id) => {
        if (!next.includes(id)) next.push(id);
      });
      onValueChange(next);
    }
  };

  // Determine trigger label
  const getTriggerLabel = () => {
    if (value.length === 0) return placeholder;
    if (value.length === 1) {
      const u = users.find((usr) => usr.id === value[0]);
      return u ? `@${u.username}` : placeholder;
    }
    const firstUser = users.find((usr) => usr.id === value[0]);
    const name = firstUser ? `@${firstUser.username}` : "";
    return `${name} + ${value.length - 1} others`;
  };

  // Helper to check if a role is active (all its users are selected)
  const isRoleActive = (role: Role) => {
    const roleUsers = users.filter((u) => u.role === role).map((u) => u.id);
    if (roleUsers.length === 0) return false;
    return roleUsers.every((id) => value.includes(id));
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "w-full justify-between font-normal text-left h-9 rounded-md bg-transparent border-input border px-3 text-xs",
              className
            )}
          >
            <span className="flex items-center gap-1.5 truncate">
              <Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{getTriggerLabel()}</span>
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-[280px] p-3 max-h-[300px] overflow-y-auto">
        <div className="space-y-3">
          {/* Role selection groups */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Role Groups</span>
            <div className="flex flex-wrap gap-1">
              {[
                { role: "Boss", label: "Boss" },
                { role: "Consigliere", label: "Consigliere" },
                { role: "Bagman", label: "Bagmans" },
                { role: "Associate", label: "Associates" },
                { role: "Custodian", label: "Custodians" },
              ].map(({ role, label }) => {
                const active = isRoleActive(role as Role);
                return (
                  <Badge
                    key={role}
                    variant={active ? "default" : "outline"}
                    className="cursor-pointer text-[9px] px-2 py-0.5 rounded-full"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleToggleRole(role as Role);
                    }}
                  >
                    {label}
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border/40" />

          {/* Individual selection checklist */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Individual Staff</span>
            <div className="space-y-1.5">
              {users.map((u) => {
                const checked = value.includes(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleToggleUser(u.id);
                    }}
                    className="flex w-full items-center gap-2 text-left text-xs text-neutral-300 hover:text-foreground p-1 hover:bg-muted/30 rounded transition-colors cursor-pointer"
                  >
                    <Checkbox
                      checked={checked}
                    />
                    <span className="truncate flex-1 select-none">
                      @{u.username} <span className="text-[9px] text-muted-foreground font-mono">({u.role})</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
