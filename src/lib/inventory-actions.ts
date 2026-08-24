"use server";

import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  notes: string | null;
  estimatedPrice: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryFolder {
  id: string;
  name: string;
  color: string;
  description: string | null;
  createdAt: string;
  itemIds: string[];
}

let tableInitialized = false;
async function ensureInventoryTables() {
  if (tableInitialized) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "inventory" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "quantity" integer DEFAULT 1 NOT NULL,
        "notes" text,
        "estimated_price" text,
        "created_at" text NOT NULL,
        "updated_at" text NOT NULL
      );
      ALTER TABLE "inventory" ADD COLUMN IF NOT EXISTS "estimated_price" text;

      CREATE TABLE IF NOT EXISTS "inventory_folders" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "color" text DEFAULT '#3b82f6' NOT NULL,
        "description" text,
        "created_at" text NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "inventory_folder_items" (
        "id" text PRIMARY KEY NOT NULL,
        "folder_id" text NOT NULL REFERENCES "inventory_folders"("id") ON DELETE CASCADE,
        "item_id" text NOT NULL REFERENCES "inventory"("id") ON DELETE CASCADE,
        "added_at" text NOT NULL
      );
    `);
    tableInitialized = true;
  } catch (error) {
    console.error("Error ensuring inventory tables exist:", error);
  }
}

// -------------------------------------------------------------
// Inventory Items Actions
// -------------------------------------------------------------

export async function fetchInventoryItems(): Promise<InventoryItem[]> {
  await ensureInventoryTables();
  try {
    const items = await db
      .select()
      .from(schema.inventory)
      .orderBy(desc(schema.inventory.createdAt));
    return items as InventoryItem[];
  } catch (error) {
    console.error("Failed to fetch inventory items:", error);
    return [];
  }
}

export async function dbAddInventoryItem(item: {
  name: string;
  quantity: number;
  notes?: string | null;
  estimatedPrice?: string | null;
}): Promise<{ item: InventoryItem; isIncremented: boolean }> {
  await ensureInventoryTables();
  const trimmedName = item.name.trim();
  const qty = Number(item.quantity) || 1;
  const now = new Date().toISOString();

  // Check if an item with the same name already exists (case-insensitive)
  const allItems = await db.select().from(schema.inventory);
  const existing = allItems.find(
    (i) => i.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );

  if (existing) {
    const updatedQuantity = (existing.quantity || 0) + qty;

    let updatedNotes = existing.notes;
    if (item.notes?.trim()) {
      if (!existing.notes) {
        updatedNotes = item.notes.trim();
      } else if (!existing.notes.includes(item.notes.trim())) {
        updatedNotes = `${existing.notes}, ${item.notes.trim()}`;
      }
    }

    const updatedEstimatedPrice =
      item.estimatedPrice?.trim() || existing.estimatedPrice || null;

    await db
      .update(schema.inventory)
      .set({
        quantity: updatedQuantity,
        notes: updatedNotes,
        estimatedPrice: updatedEstimatedPrice,
        updatedAt: now,
      })
      .where(eq(schema.inventory.id, existing.id));

    const updatedItem: InventoryItem = {
      ...existing,
      quantity: updatedQuantity,
      notes: updatedNotes,
      estimatedPrice: updatedEstimatedPrice,
      updatedAt: now,
    };

    return { item: updatedItem, isIncremented: true };
  }

  const id = `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const newItem: InventoryItem = {
    id,
    name: trimmedName,
    quantity: qty,
    notes: item.notes?.trim() || null,
    estimatedPrice: item.estimatedPrice?.trim() || null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(schema.inventory).values(newItem);
  return { item: newItem, isIncremented: false };
}

export async function dbUpdateInventoryItem(
  id: string,
  updates: {
    name?: string;
    quantity?: number;
    notes?: string | null;
    estimatedPrice?: string | null;
  }
): Promise<void> {
  await ensureInventoryTables();
  const updateData: Partial<typeof schema.inventory.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };

  if (updates.name !== undefined) {
    updateData.name = updates.name.trim();
  }
  if (updates.quantity !== undefined) {
    updateData.quantity = Number(updates.quantity) || 0;
  }
  if (updates.notes !== undefined) {
    updateData.notes = updates.notes?.trim() || null;
  }
  if (updates.estimatedPrice !== undefined) {
    updateData.estimatedPrice = updates.estimatedPrice?.trim() || null;
  }

  await db
    .update(schema.inventory)
    .set(updateData)
    .where(eq(schema.inventory.id, id));
}

export async function dbDeleteInventoryItem(id: string): Promise<void> {
  await ensureInventoryTables();
  // Junction records cascade deleted automatically
  await db.delete(schema.inventory).where(eq(schema.inventory.id, id));
}

// -------------------------------------------------------------
// Folders Actions
// -------------------------------------------------------------

export async function fetchFoldersWithItems(): Promise<InventoryFolder[]> {
  await ensureInventoryTables();
  try {
    const [foldersList, folderItemsList] = await Promise.all([
      db.select().from(schema.inventoryFolders).orderBy(schema.inventoryFolders.createdAt),
      db.select().from(schema.inventoryFolderItems),
    ]);

    const folderMap = new Map<string, string[]>();
    foldersList.forEach((f) => folderMap.set(f.id, []));

    folderItemsList.forEach((entry) => {
      const list = folderMap.get(entry.folderId);
      if (list) {
        list.push(entry.itemId);
      }
    });

    return foldersList.map((f) => ({
      id: f.id,
      name: f.name,
      color: f.color || "#3b82f6",
      description: f.description || null,
      createdAt: f.createdAt,
      itemIds: folderMap.get(f.id) || [],
    }));
  } catch (error) {
    console.error("Failed to fetch folders:", error);
    return [];
  }
}

export async function dbCreateFolder(data: {
  name: string;
  color?: string;
  description?: string;
}): Promise<InventoryFolder> {
  await ensureInventoryTables();
  const id = `fld-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  const newFolder = {
    id,
    name: data.name.trim(),
    color: data.color || "#3b82f6",
    description: data.description?.trim() || null,
    createdAt: now,
  };

  await db.insert(schema.inventoryFolders).values(newFolder);

  return {
    ...newFolder,
    itemIds: [],
  };
}

export async function dbUpdateFolder(
  id: string,
  data: { name?: string; color?: string; description?: string }
): Promise<void> {
  await ensureInventoryTables();
  const updateData: Partial<typeof schema.inventoryFolders.$inferInsert> = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.color !== undefined) updateData.color = data.color;
  if (data.description !== undefined) updateData.description = data.description?.trim() || null;

  await db
    .update(schema.inventoryFolders)
    .set(updateData)
    .where(eq(schema.inventoryFolders.id, id));
}

export async function dbDeleteFolder(id: string): Promise<void> {
  await ensureInventoryTables();
  await db.delete(schema.inventoryFolders).where(eq(schema.inventoryFolders.id, id));
}

export async function dbToggleItemInFolder(
  folderId: string,
  itemId: string
): Promise<{ added: boolean }> {
  await ensureInventoryTables();

  const existing = await db
    .select()
    .from(schema.inventoryFolderItems)
    .where(
      and(
        eq(schema.inventoryFolderItems.folderId, folderId),
        eq(schema.inventoryFolderItems.itemId, itemId)
      )
    );

  if (existing.length > 0) {
    await db
      .delete(schema.inventoryFolderItems)
      .where(
        and(
          eq(schema.inventoryFolderItems.folderId, folderId),
          eq(schema.inventoryFolderItems.itemId, itemId)
        )
      );
    return { added: false };
  } else {
    const id = `fi-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await db.insert(schema.inventoryFolderItems).values({
      id,
      folderId,
      itemId,
      addedAt: new Date().toISOString(),
    });
    return { added: true };
  }
}
