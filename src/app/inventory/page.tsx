"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "@/lib/store";
import { notFound } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Search } from "lucide-react";
import { toast } from "sonner";

// Modular Inventory Components
import { AddItemForm } from "@/components/inventory/add-item-form";
import { FoldersBar } from "@/components/inventory/folders-bar";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { CreateFolderDialog } from "@/components/inventory/create-folder-dialog";
import { DeleteConfirmationDrawer } from "@/components/inventory/delete-confirmation-drawer";

import {
  fetchInventoryItems,
  fetchFoldersWithItems,
  dbAddInventoryItem,
  dbUpdateInventoryItem,
  dbDeleteInventoryItem,
  dbCreateFolder,
  dbUpdateFolder,
  dbDeleteFolder,
  dbToggleItemInFolder,
  InventoryItem,
  InventoryFolder,
} from "@/lib/inventory-actions";

export default function Inventory() {
  const { currentUser } = useApp();

  // Role protection: Only Boss and Bagman can view this page
  if (currentUser.role !== "Boss" && currentUser.role !== "Bagman") {
    notFound();
  }

  const isBoss = currentUser.role === "Boss";

  // Data states
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [folders, setFolders] = useState<InventoryFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Folder selection state (null = "All Items")
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Sorting state: "name" | "quantity" | null
  const [sortField, setSortField] = useState<"name" | "quantity" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Modals / Drawers state
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<InventoryFolder | null>(null);

  // Initial Load
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [loadedItems, loadedFolders] = await Promise.all([
          fetchInventoryItems(),
          fetchFoldersWithItems(),
        ]);
        setItems(loadedItems);
        setFolders(loadedFolders);
      } catch (err) {
        console.error("Error loading inventory data:", err);
        toast.error("Failed to load inventory.");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // 3-state sort toggle: asc -> desc -> normal (null)
  const handleSort = (field: "name" | "quantity") => {
    if (sortField !== field) {
      setSortField(field);
      setSortDirection("asc");
    } else {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
    }
  };

  // Add Item
  const handleAddItem = async (data: {
    name: string;
    quantity: number;
    notes?: string | null;
    estimatedPrice?: string | null;
  }) => {
    try {
      const result = await dbAddInventoryItem(data);

      if (result.isIncremented) {
        setItems((prev) =>
          prev.map((i) => (i.id === result.item.id ? result.item : i))
        );
        toast.success(
          `"${result.item.name}" already in inventory. Increased quantity to ${result.item.quantity}.`
        );
      } else {
        setItems((prev) => [result.item, ...prev]);

        // If currently inside a folder, automatically tag new item into current folder too!
        if (selectedFolderId) {
          await dbToggleItemInFolder(selectedFolderId, result.item.id);
          setFolders((prev) =>
            prev.map((f) =>
              f.id === selectedFolderId
                ? { ...f, itemIds: [...f.itemIds, result.item.id] }
                : f
            )
          );
        }

        toast.success(`Added "${result.item.name}" to inventory.`);
      }
    } catch (err) {
      console.error("Error adding item:", err);
      toast.error("Failed to add item.");
      throw err;
    }
  };

  // Increment Quantity
  const handleIncrement = async (item: InventoryItem) => {
    if (!isBoss) return;
    const newQty = item.quantity + 1;

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i))
    );

    try {
      await dbUpdateInventoryItem(item.id, { quantity: newQty });
      toast.success(`Increased "${item.name}" quantity to ${newQty}.`);
    } catch (err) {
      console.error("Failed to increase quantity:", err);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, quantity: item.quantity } : i))
      );
      toast.error("Failed to update quantity.");
    }
  };

  // Decrement Quantity (triggers delete confirmation when count is 1)
  const handleDecrement = async (item: InventoryItem) => {
    if (!isBoss) return;

    if (item.quantity <= 1) {
      setItemToDelete(item);
      return;
    }

    const newQty = item.quantity - 1;

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i))
    );

    try {
      await dbUpdateInventoryItem(item.id, { quantity: newQty });
      toast.success(`Decreased "${item.name}" quantity to ${newQty}.`);
    } catch (err) {
      console.error("Failed to decrease quantity:", err);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, quantity: item.quantity } : i))
      );
      toast.error("Failed to update quantity.");
    }
  };

  // Confirm Permanent Deletion
  const handleConfirmDelete = async () => {
    if (!itemToDelete || !isBoss) return;
    const targetItem = itemToDelete;
    setIsDeleting(true);

    try {
      await dbDeleteInventoryItem(targetItem.id);
      setItems((prev) => prev.filter((i) => i.id !== targetItem.id));
      // Remove from all folder itemIds locally
      setFolders((prev) =>
        prev.map((f) => ({
          ...f,
          itemIds: f.itemIds.filter((id) => id !== targetItem.id),
        }))
      );
      toast.success(`"${targetItem.name}" deleted from inventory.`);
      setItemToDelete(null);
    } catch (err) {
      console.error("Failed to delete item:", err);
      toast.error(`Failed to delete "${targetItem.name}".`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Direct Quantity Input Change
  const handleQuantityChange = (id: string, val: string) => {
    if (!isBoss) return;
    const num = val === "" ? "" : Math.max(0, parseInt(val, 10) || 0);
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: num === "" ? (0 as any) : num }
          : item
      )
    );
  };

  // Direct Quantity Input Blur
  const handleQuantityBlur = async (item: InventoryItem) => {
    if (!isBoss) return;
    if (item.quantity <= 0) {
      setItemToDelete(item);
      return;
    }

    try {
      await dbUpdateInventoryItem(item.id, { quantity: item.quantity });
    } catch (err) {
      console.error("Failed to save quantity:", err);
      toast.error("Failed to save quantity.");
    }
  };

  // Inline Field Edit (Local)
  const handleFieldChange = (
    id: string,
    field: "name" | "estimatedPrice" | "notes",
    val: string
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  // Auto-save Field on Blur
  const handleFieldBlur = async (
    id: string,
    field: "name" | "estimatedPrice" | "notes",
    value: string
  ) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    if (field === "name" && !isBoss) return;
    if (field === "name" && !value.trim()) {
      toast.error("Item name cannot be empty.");
      return;
    }

    try {
      await dbUpdateInventoryItem(id, {
        [field]: value.trim() || null,
      });
    } catch (err) {
      console.error(`Failed to save ${field}:`, err);
      toast.error(`Failed to save ${field}.`);
    }
  };

  // Folder CRUD & Tagging
  const handleCreateOrUpdateFolder = async (data: {
    name: string;
    color: string;
    description?: string;
  }) => {
    if (!isBoss) return;

    if (folderToEdit) {
      await dbUpdateFolder(folderToEdit.id, data);
      setFolders((prev) =>
        prev.map((f) => (f.id === folderToEdit.id ? { ...f, ...data } : f))
      );
      toast.success(`Folder "${data.name}" updated.`);
    } else {
      const created = await dbCreateFolder(data);
      setFolders((prev) => [...prev, created]);
      toast.success(`Folder "${data.name}" created.`);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!isBoss) return;
    const folder = folders.find((f) => f.id === folderId);
    try {
      await dbDeleteFolder(folderId);
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
      }
      toast.success(`Folder "${folder?.name || ""}" deleted.`);
    } catch (err) {
      console.error("Failed to delete folder:", err);
      toast.error("Failed to delete folder.");
    }
  };

  const handleToggleFolder = async (folderId: string, itemId: string) => {
    if (!isBoss) return;
    try {
      const { added } = await dbToggleItemInFolder(folderId, itemId);
      setFolders((prev) =>
        prev.map((f) => {
          if (f.id !== folderId) return f;
          return {
            ...f,
            itemIds: added
              ? [...f.itemIds, itemId]
              : f.itemIds.filter((id) => id !== itemId),
          };
        })
      );
      const folder = folders.find((f) => f.id === folderId);
      toast.success(
        added
          ? `Added item to "${folder?.name}".`
          : `Removed item from "${folder?.name}".`
      );
    } catch (err) {
      console.error("Failed to toggle folder:", err);
      toast.error("Failed to update folder.");
    }
  };

  // Filtered and Sorted Items Calculation
  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // 1. Folder filter (if a specific folder is selected)
    if (selectedFolderId) {
      const activeFolder = folders.find((f) => f.id === selectedFolderId);
      const allowedIds = new Set(activeFolder?.itemIds || []);
      result = result.filter((item) => allowedIds.has(item.id));
    }

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.notes && item.notes.toLowerCase().includes(q)) ||
          (item.estimatedPrice && item.estimatedPrice.toLowerCase().includes(q))
      );
    }

    // 3. Sorting
    if (sortField && sortDirection) {
      result.sort((a, b) => {
        if (sortField === "name") {
          const nameA = a.name.toLowerCase();
          const nameB = b.name.toLowerCase();
          return sortDirection === "asc"
            ? nameA.localeCompare(nameB)
            : nameB.localeCompare(nameA);
        } else if (sortField === "quantity") {
          const qtyA = a.quantity || 0;
          const qtyB = b.quantity || 0;
          return sortDirection === "asc" ? qtyA - qtyB : qtyB - qtyA;
        }
        return 0;
      });
    }

    return result;
  }, [items, folders, selectedFolderId, searchQuery, sortField, sortDirection]);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1 mt-4">
          Inventory
        </h1>
        <p className="text-muted-foreground text-sm">
          Here you can find a list of all the items there are in the inventory, with notes, estimated prices, and Pinterest-style collections.
        </p>
      </div>

      <Separator />

      {/* Add New Item Section */}
      <AddItemForm isBoss={isBoss} onAddItem={handleAddItem} />

      {/* Pinterest-style Folders / Collections Bar */}
      <FoldersBar
        folders={folders}
        selectedFolderId={selectedFolderId}
        onSelectFolder={setSelectedFolderId}
        onOpenCreate={() => {
          setFolderToEdit(null);
          setIsFolderDialogOpen(true);
        }}
        onOpenEdit={(folder) => {
          setFolderToEdit(folder);
          setIsFolderDialogOpen(true);
        }}
        onDeleteFolder={handleDeleteFolder}
        totalItemCount={items.length}
        isBoss={isBoss}
      />

      {/* Search & List Header */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              {selectedFolderId
                ? `${folders.find((f) => f.id === selectedFolderId)?.name || "Folder"} Items`
                : "Inventory List"}
            </h2>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {filteredAndSortedItems.length}{" "}
              {filteredAndSortedItems.length === 1 ? "item" : "items"}
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter items, notes, prices..."
              className="pl-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Modular Table Component */}
        <InventoryTable
          items={filteredAndSortedItems}
          folders={folders}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onClearSearch={() => setSearchQuery("")}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          isBoss={isBoss}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          onQuantityChange={handleQuantityChange}
          onQuantityBlur={handleQuantityBlur}
          onFieldChange={handleFieldChange}
          onFieldBlur={handleFieldBlur}
          onToggleFolder={handleToggleFolder}
        />
      </div>

      {/* Create / Edit Folder Dialog */}
      <CreateFolderDialog
        isOpen={isFolderDialogOpen}
        onClose={() => {
          setIsFolderDialogOpen(false);
          setFolderToEdit(null);
        }}
        onSubmit={handleCreateOrUpdateFolder}
        editFolder={folderToEdit}
      />

      {/* Delete Item Confirmation Drawer (triggered on quantity 1 -> 0) */}
      <DeleteConfirmationDrawer
        item={itemToDelete}
        isOpen={!!itemToDelete}
        isDeleting={isDeleting}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}