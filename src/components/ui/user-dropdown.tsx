"use client";

import React from "react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserDropdownProps {
  value: string;
  onValueChange: (userId: string) => void;
  placeholder?: string;
  className?: string;
}

export function UserDropdown({
  value,
  onValueChange,
  placeholder = "Select staff",
  className,
}: UserDropdownProps) {
  const { users } = useApp();
  const selectedUser = users.find((u) => u.id === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className={`w-full justify-between font-normal text-left h-9 rounded-md bg-transparent border-input border ${className || ""}`}
          >
            <span>
              {selectedUser ? `@${selectedUser.username}` : placeholder}
            </span>
            <span className="text-muted-foreground text-[10px]">▼</span>
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-56 max-h-60 overflow-y-auto">
        {users.map((u) => (
          <DropdownMenuItem
            key={u.id}
            onClick={() => onValueChange(u.id)}
            className="cursor-pointer"
          >
            @{u.username}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
