"use client";

import React, { useState } from "react";
import {
  Folder,
  FolderPlus,
  Layers,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InventoryFolder } from "@/lib/inventory-actions";

interface FoldersBarProps {
  folders: InventoryFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onOpenCreate: () => void;
  onOpenEdit: (folder: InventoryFolder) => void;
  onDeleteFolder: (folderId: string) => void;
  totalItemCount: number;
  isBoss: boolean;
}

export function FoldersBar({
  folders,
  selectedFolderId,
  onSelectFolder,
  onOpenCreate,
  onOpenEdit,
  onDeleteFolder,
  totalItemCount,
  isBoss,
}: FoldersBarProps) {
  const [activeMenuFolderId, setActiveMenuFolderId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Collections & Folders
          </span>
          <span className="text-xs text-muted-foreground/80">
            (Organize items without moving them)
          </span>
        </div>

        {isBoss && (
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenCreate}
            className="h-7 text-xs gap-1.5 cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span>New Folder</span>
          </Button>
        )}
      </div>

      {/* Horizontal Pinterest-like folder cards container */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {/* "All Items" tab card */}
        <button
          type="button"
          onClick={() => onSelectFolder(null)}
          className={cn(
            "group flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all shrink-0 cursor-pointer shadow-xs",
            selectedFolderId === null
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-card hover:bg-accent/60 text-foreground border-border"
          )}
        >
          <div
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
              selectedFolderId === null
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-primary/10 text-primary"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
          </div>
          <span>All Items</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              selectedFolderId === null
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {totalItemCount}
          </span>
        </button>

        {/* Custom Folder Pills */}
        {folders.map((folder) => {
          const isSelected = selectedFolderId === folder.id;
          const count = folder.itemIds.length;
          const isMenuOpen = activeMenuFolderId === folder.id;

          return (
            <div key={folder.id} className="relative group/folder shrink-0">
              <button
                type="button"
                onClick={() => onSelectFolder(folder.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all cursor-pointer shadow-xs",
                  isSelected
                    ? "bg-card border-2 shadow-sm"
                    : "bg-card hover:bg-accent/50 text-foreground border-border"
                )}
                style={
                  isSelected
                    ? {
                        borderColor: folder.color,
                        boxShadow: `0 0 0 1px ${folder.color}20`,
                      }
                    : undefined
                }
              >
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-md"
                  style={{
                    backgroundColor: `${folder.color}20`,
                    color: folder.color,
                  }}
                >
                  <Folder className="h-3.5 w-3.5" />
                </div>

                <span className="truncate max-w-[140px]">{folder.name}</span>

                <span
                  style={{
                    backgroundColor: isSelected ? `${folder.color}20` : undefined,
                    color: isSelected ? folder.color : undefined,
                  }}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    !isSelected && "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>

                {/* Dropdown menu trigger for Boss */}
                {isBoss && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuFolderId(isMenuOpen ? null : folder.id);
                    }}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors ml-0.5 opacity-60 group-hover/folder:opacity-100"
                    title="Folder options"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </div>
                )}
              </button>

              {/* Folder Actions Popup Menu */}
              {isMenuOpen && isBoss && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setActiveMenuFolderId(null)}
                  />
                  <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border bg-popover p-1 text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenuFolderId(null);
                        onOpenEdit(folder);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent cursor-pointer transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Edit Folder</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenuFolderId(null);
                        onDeleteFolder(folder.id);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      <span>Delete Folder</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
