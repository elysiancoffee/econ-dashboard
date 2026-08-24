"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Folder, Check, Plus, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { InventoryFolder } from "@/lib/inventory-actions";

interface ItemFolderPickerProps {
  itemId: string;
  folders: InventoryFolder[];
  onToggleFolder: (folderId: string, itemId: string) => Promise<void>;
  disabled?: boolean;
}

export function ItemFolderPicker({
  itemId,
  folders,
  onToggleFolder,
  disabled = false,
}: ItemFolderPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const assignedFolders = folders.filter((f) => f.itemIds.includes(itemId));

  // Compute dropdown position from the trigger button's bounding rect
  const openDropdown = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
      });
    }
    setIsOpen(true);
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (folders.length === 0 && assignedFolders.length === 0) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      {/* Assigned folder pill badges */}
      {assignedFolders.map((f) => (
        <span
          key={f.id}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium border"
          style={{
            backgroundColor: `${f.color}15`,
            borderColor: `${f.color}35`,
            color: f.color,
          }}
          title={`In collection "${f.name}"`}
        >
          <Folder className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate max-w-[90px]">{f.name}</span>
        </span>
      ))}

      {/* Trigger button */}
      {!disabled && folders.length > 0 && (
        <button
          ref={triggerRef}
          type="button"
          onClick={isOpen ? () => setIsOpen(false) : openDropdown}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer border border-dashed border-border/80 hover:border-border hover:bg-muted/50",
            isOpen && "bg-muted text-foreground border-solid border-border"
          )}
          title="Assign to folders"
        >
          <Plus className="h-3 w-3" />
          <span>Folder</span>
        </button>
      )}

      {/* Portalled Dropdown — renders at the document body level, bypasses overflow:hidden */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "absolute",
              top: dropdownPos.top,
              left: dropdownPos.left,
              zIndex: 9999,
            }}
            className="w-56 rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95"
          >
            <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="h-3 w-3" /> Assign to Folders
            </div>
            <div className="max-h-48 overflow-y-auto space-y-0.5 pt-1">
              {folders.map((folder) => {
                const isAssigned = folder.itemIds.includes(itemId);
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => onToggleFolder(folder.id, itemId)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors cursor-pointer hover:bg-accent/80",
                      isAssigned && "bg-accent/50 font-medium"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: folder.color }}
                      />
                      <span className="truncate">{folder.name}</span>
                    </div>
                    {isAssigned && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0 stroke-[2.5]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
