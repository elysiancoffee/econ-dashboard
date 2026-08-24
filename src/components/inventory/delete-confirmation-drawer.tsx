"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { InventoryItem } from "@/lib/inventory-actions";

interface DeleteConfirmationDrawerProps {
  item: InventoryItem | null;
  isOpen: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmationDrawer({
  item,
  isOpen,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteConfirmationDrawerProps) {
  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isDeleting) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        className="mx-auto max-w-lg rounded-t-2xl border-t p-6 shadow-2xl bg-card"
      >
        <SheetHeader className="p-0 text-left space-y-2">
          <div className="flex items-center gap-2.5 text-destructive font-semibold text-base">
            <div className="rounded-full bg-destructive/10 p-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <SheetTitle className="text-lg">Delete Item Confirmation</SheetTitle>
          </div>
          <SheetDescription className="text-sm text-muted-foreground pt-1">
            Quantity for{" "}
            <span className="font-semibold text-foreground">
              &quot;{item?.name}&quot;
            </span>{" "}
            is at 1. Decreasing it will permanently remove this item from the inventory.
          </SheetDescription>
        </SheetHeader>

        <SheetFooter className="p-0 pt-6 flex flex-row items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="gap-2 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" /> Delete Item
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
