"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ItemSearchInput } from "@/components/inventory/item-search-input";
import { ItemFolderPicker } from "@/components/inventory/item-folder-picker";
import {
  InventoryItem,
  InventoryFolder,
} from "@/lib/inventory-actions";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Minus,
  Plus,
  Trash2,
  Package,
  Loader2,
} from "lucide-react";

interface InventoryTableProps {
  items: InventoryItem[];
  folders: InventoryFolder[];
  isLoading: boolean;
  searchQuery: string;
  onClearSearch: () => void;
  sortField: "name" | "quantity" | null;
  sortDirection: "asc" | "desc" | null;
  onSort: (field: "name" | "quantity") => void;
  isBoss: boolean;
  onIncrement: (item: InventoryItem) => void;
  onDecrement: (item: InventoryItem) => void;
  onQuantityChange: (id: string, val: string) => void;
  onQuantityBlur: (item: InventoryItem) => void;
  onFieldChange: (
    id: string,
    field: "name" | "estimatedPrice" | "notes",
    val: string
  ) => void;
  onFieldBlur: (
    id: string,
    field: "name" | "estimatedPrice" | "notes",
    val: string
  ) => void;
  onToggleFolder: (folderId: string, itemId: string) => Promise<void>;
}

export function InventoryTable({
  items,
  folders,
  isLoading,
  searchQuery,
  onClearSearch,
  sortField,
  sortDirection,
  onSort,
  isBoss,
  onIncrement,
  onDecrement,
  onQuantityChange,
  onQuantityBlur,
  onFieldChange,
  onFieldBlur,
  onToggleFolder,
}: InventoryTableProps) {
  const [editingNameId, setEditingNameId] = useState<string | null>(null);

  return (
    <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/50 select-none">
          <TableRow>
            {/* Item Name Column Header */}
            <TableHead
              className="w-[32%] cursor-pointer hover:text-foreground transition-colors group"
              onClick={() => onSort("name")}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                <span>Item</span>
                {sortField === "name" ? (
                  sortDirection === "asc" ? (
                    <ArrowUp className="h-3.5 w-3.5 text-primary shrink-0" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5 text-primary shrink-0" />
                  )
                ) : (
                  <ArrowUpDown className="h-3.5 w-3.5 opacity-30 group-hover:opacity-100 transition-opacity shrink-0" />
                )}
              </div>
            </TableHead>

            {/* Quantity Column Header */}
            <TableHead
              className="w-[20%] cursor-pointer hover:text-foreground transition-colors group"
              onClick={() => onSort("quantity")}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                <span>Quantity</span>
                {sortField === "quantity" ? (
                  sortDirection === "asc" ? (
                    <ArrowUp className="h-3.5 w-3.5 text-primary shrink-0" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5 text-primary shrink-0" />
                  )
                ) : (
                  <ArrowUpDown className="h-3.5 w-3.5 opacity-30 group-hover:opacity-100 transition-opacity shrink-0" />
                )}
              </div>
            </TableHead>

            {/* Estimated Price Column Header */}
            <TableHead className="w-[24%] font-semibold">
              Estimated Price
            </TableHead>

            {/* Notes Column Header */}
            <TableHead className="w-[24%] font-semibold">
              Notes
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={4} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-sm">Loading inventory items...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Package className="h-8 w-8 opacity-40" />
                  <span className="text-sm font-medium">
                    {searchQuery
                      ? `No items matching "${searchQuery}"`
                      : "No items in this collection."}
                  </span>
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClearSearch}
                      className="cursor-pointer"
                    >
                      Clear search filter
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => {
              const isEditingName = isBoss && editingNameId === item.id;

              return (
                <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                  {/* Item Name + Folder Tags */}
                  <TableCell className="font-medium">
                    <div className="space-y-1.5 py-0.5">
                      {isEditingName ? (
                        <ItemSearchInput
                          value={item.name}
                          onChange={(val) => onFieldChange(item.id, "name", val)}
                          onSelect={(val) => {
                            onFieldChange(item.id, "name", val);
                            onFieldBlur(item.id, "name", val);
                            setEditingNameId(null);
                          }}
                          placeholder="Item name..."
                          className="w-full"
                          autoFocus
                        />
                      ) : isBoss ? (
                        <div
                          onClick={() => setEditingNameId(item.id)}
                          className="cursor-pointer group flex items-center gap-2"
                          title="Click to edit item name"
                        >
                          <span className="font-medium group-hover:text-primary transition-colors">
                            {item.name}
                          </span>
                        </div>
                      ) : (
                        <span className="font-medium text-foreground block">
                          {item.name}
                        </span>
                      )}

                      {/* Folder tags & picker */}
                      <ItemFolderPicker
                        itemId={item.id}
                        folders={folders}
                        onToggleFolder={onToggleFolder}
                        disabled={!isBoss}
                      />
                    </div>
                  </TableCell>

                  {/* Quantity (Paired [-] [input] [+] with Delete Drawer on 1 -> 0) */}
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-md shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                        onClick={() => onDecrement(item)}
                        disabled={!isBoss}
                        title={
                          !isBoss
                            ? "Boss only"
                            : item.quantity === 1
                            ? "Delete item"
                            : "Decrease quantity"
                        }
                      >
                        {item.quantity === 1 ? (
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        ) : (
                          <Minus className="h-3.5 w-3.5" />
                        )}
                      </Button>

                      <Input
                        type="number"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => onQuantityChange(item.id, e.target.value)}
                        onBlur={() => onQuantityBlur(item)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          }
                        }}
                        disabled={!isBoss}
                        className="h-8 w-16 text-center text-sm font-semibold px-1 disabled:opacity-60 disabled:bg-muted/40"
                      />

                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-md shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
                        onClick={() => onIncrement(item)}
                        disabled={!isBoss}
                        title={isBoss ? "Increase quantity" : "Boss only"}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>

                  {/* Estimated Price (Editable by BOTH Boss and Bagman) */}
                  <TableCell>
                    <Input
                      type="text"
                      value={item.estimatedPrice || ""}
                      onChange={(e) =>
                        onFieldChange(item.id, "estimatedPrice", e.target.value)
                      }
                      onBlur={(e) =>
                        onFieldBlur(item.id, "estimatedPrice", e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur();
                        }
                      }}
                      placeholder="—"
                      className="h-8 text-sm"
                    />
                  </TableCell>

                  {/* Notes (Editable by BOTH Boss and Bagman) */}
                  <TableCell>
                    <Input
                      type="text"
                      value={item.notes || ""}
                      onChange={(e) =>
                        onFieldChange(item.id, "notes", e.target.value)
                      }
                      onBlur={(e) =>
                        onFieldBlur(item.id, "notes", e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur();
                        }
                      }}
                      placeholder="Add notes..."
                      className="h-8 text-sm"
                    />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
