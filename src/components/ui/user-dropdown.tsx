"use client";

import React from "react";
import { useApp, User } from "@/lib/store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserDropdownProps {
  value: string;
  onValueChange: (userId: string) => void;
  placeholder?: string;
  className?: string;
  users?: User[] | { id: string; username: string; role?: string }[];
  disabled?: boolean;
}

export function UserDropdown({
  value,
  onValueChange,
  placeholder = "Select staff",
  className,
  users: propUsers,
  disabled,
}: UserDropdownProps) {
  const { users: storeUsers } = useApp();
  const userList = propUsers || storeUsers;

  return (
    <Select value={value} onValueChange={(val) => val && onValueChange(val)} disabled={disabled}>
      <SelectTrigger className={`w-full ${className || ""}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {userList.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            @{u.username} {u.role ? `(${u.role})` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}


