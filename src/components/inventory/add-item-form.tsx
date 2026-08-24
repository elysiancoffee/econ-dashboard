"use client";

import React, { useState } from "react";
import { PlusCircle, Loader2, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ItemSearchInput } from "@/components/inventory/item-search-input";

interface AddItemFormProps {
  isBoss: boolean;
  onAddItem: (data: {
    name: string;
    quantity: number;
    notes?: string | null;
    estimatedPrice?: string | null;
  }) => Promise<void>;
}

export function AddItemForm({ isBoss, onAddItem }: AddItemFormProps) {
  const [newName, setNewName] = useState("");
  const [newQuantity, setNewQuantity] = useState<number | string>(1);
  const [newEstimatedPrice, setNewEstimatedPrice] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBoss || !newName.trim()) return;

    const qty = Math.max(1, Number(newQuantity) || 1);
    setIsAdding(true);

    try {
      await onAddItem({
        name: newName.trim(),
        quantity: qty,
        notes: newNotes.trim() || null,
        estimatedPrice: newEstimatedPrice.trim() || null,
      });

      setNewName("");
      setNewQuantity(1);
      setNewEstimatedPrice("");
      setNewNotes("");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <PlusCircle className="h-4 w-4 text-primary" /> Add New Item
        </h3>
        {!isBoss && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
            <Lock className="h-3 w-3" /> You cannot add items.
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Item Name
            </label>
            <ItemSearchInput
              id="name-input"
              value={newName}
              onChange={setNewName}
              placeholder={isBoss ? "Type item names..." : "Boss only..."}
              disabled={!isBoss}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Quantity
            </label>
            <Input
              id="quantity-input"
              type="number"
              min="1"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              placeholder="1"
              disabled={!isBoss}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Estimated Price
            </label>
            <Input
              id="price-input"
              type="text"
              value={newEstimatedPrice}
              onChange={(e) => setNewEstimatedPrice(e.target.value)}
              placeholder="e.g. 50k"
              disabled={!isBoss}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Notes
            </label>
            <Input
              id="notes-input"
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Enter notes..."
              disabled={!isBoss}
            />
          </div>

          <div className="md:col-span-2">
            <Button
              type="submit"
              className="w-full gap-1.5 cursor-pointer"
              disabled={!isBoss || isAdding || !newName.trim()}
            >
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Adding...
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" /> Add Item
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
