"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  PlusIcon,
  Trash2,
  Save,
  Code2,
  ExternalLink,
  Copy,
  Plus,
  Image as ImageIcon,
  Check,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ArchiveItem,
  ArchiveTier,
  BlackArchiveData,
  DEFAULT_BLACK_ARCHIVE,
  loadLocalBlackArchive,
  saveLocalBlackArchive,
} from "@/lib/black-archive-data";
import { dbFetchBlackArchive, dbSaveBlackArchive } from "@/lib/actions";

export default function BlackArchivePage() {
  const { currentUser } = useApp();
  const isBoss = currentUser?.role === "Boss";

  const [archiveData, setArchiveData] = useState<BlackArchiveData>(() => loadLocalBlackArchive());
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const isFirstRender = useRef(true);

  // Background fetch from database (never blocks render, falls back seamlessly)
  useEffect(() => {
    dbFetchBlackArchive()
      .then((dbData) => {
        if (dbData?.tiers && Array.isArray(dbData.tiers) && dbData.tiers.length > 0) {
          setArchiveData(dbData);
          saveLocalBlackArchive(dbData);
        } else {
          dbSaveBlackArchive(DEFAULT_BLACK_ARCHIVE);
        }
      })
      .catch((err) => {
        console.warn("Could not sync from DB, using cached black archive data:", err);
      });
  }, []);

  // Save to local storage on change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    saveLocalBlackArchive(archiveData);
    setHasUnsavedChanges(true);
  }, [archiveData]);

  // Save to DB
  const handleSaveToDb = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...archiveData,
        updatedAt: new Date().toISOString(),
      };
      const res = await dbSaveBlackArchive(payload);
      if (res.success) {
        setHasUnsavedChanges(false);
        toast.success("Saved to database & synced with API!");
      } else {
        toast.error("Failed to save: " + res.error);
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const handleResetDefaults = () => {
    if (window.confirm("Reset all items to default?")) {
      setArchiveData(DEFAULT_BLACK_ARCHIVE);
      saveLocalBlackArchive(DEFAULT_BLACK_ARCHIVE);
      dbSaveBlackArchive(DEFAULT_BLACK_ARCHIVE);
      setHasUnsavedChanges(false);
      toast.info("Reset to default screenshot items.");
    }
  };

  // Update item field directly (inline)
  const updateItemField = (
    tierId: string,
    itemId: string,
    field: keyof ArchiveItem,
    value: string
  ) => {
    setArchiveData((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t) => {
        if (t.id !== tierId) return t;
        return {
          ...t,
          items: t.items.map((item) => {
            if (item.id !== itemId) return item;
            return { ...item, [field]: value };
          }),
        };
      }),
    }));
  };

  // Add new row to tier
  const handleAddRow = (tierId: string) => {
    const newItem: ArchiveItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: "New Item",
      price: "100 Chips",
      stock: "1",
      imageUrl: "",
    };

    setArchiveData((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t) => (t.id === tierId ? { ...t, items: [...t.items, newItem] } : t)),
    }));
  };

  // Delete row
  const handleDeleteRow = (tierId: string, itemId: string) => {
    setArchiveData((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t) =>
        t.id === tierId ? { ...t, items: t.items.filter((i) => i.id !== itemId) } : t
      ),
    }));
  };

  // Add new tier
  const handleAddTier = () => {
    const newTier: ArchiveTier = {
      id: `tier-${Date.now()}`,
      name: `TIER ${archiveData.tiers.length + 1}: NEW TIER`,
      items: [
        {
          id: `item-${Date.now()}`,
          name: "Item 1",
          price: "100 Chips",
          stock: "1",
          imageUrl: "",
        },
      ],
    };

    setArchiveData((prev) => ({
      ...prev,
      tiers: [...prev.tiers, newTier],
    }));
  };

  // Delete tier
  const handleDeleteTier = (tierId: string) => {
    if (window.confirm("Delete this tier and its items?")) {
      setArchiveData((prev) => ({
        ...prev,
        tiers: prev.tiers.filter((t) => t.id !== tierId),
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── User's Existing Top Content (Intact) ─── */}
      <div>
        <h1 className="text-3xl">Black Archive</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
          This page is currently under construction.
        </p>
        <div className="flex justify-between items-center p-3 border border-gray-800 light:border-gray-200 rounded-md mt-5 gap-10">
          <p className="text-gray-400 dark:text-gray-600 text-sm">
            Here you can customize the currently running black chips page, all of the data is
            directly pulled through here.
          </p>
          <Button
            onClick={() => {
              if (archiveData.tiers.length > 0) {
                handleAddRow(archiveData.tiers[0].id);
              } else {
                handleAddTier();
              }
            }}
          >
            <PlusIcon /> Add New Black Chips
          </Button>
        </div>
      </div>

      {/* ─── Management Action Toolbar (Boss Only) ─── */}
      {isBoss && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSaveToDb}
              disabled={isSaving}
              className={cn(
                "text-xs font-semibold gap-1.5",
                hasUnsavedChanges && "bg-amber-600 hover:bg-amber-500 text-white"
              )}
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isSaving ? "Saving..." : hasUnsavedChanges ? "Save Changes *" : "Saved"}</span>
            </Button>

            <Button size="sm" variant="outline" onClick={handleAddTier} className="text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Tier
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsApiModalOpen(true)}
              className="text-xs gap-1.5"
            >
              <Code2 className="h-3.5 w-3.5" /> API
            </Button>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetDefaults}
            className="text-xs text-muted-foreground hover:text-destructive gap-1"
          >
            <Undo2 className="h-3 w-3" /> Reset Defaults
          </Button>
        </div>
      )}

      {/* ─── Compact Tables for Each Tier ─── */}
      <div className="space-y-6">
        {archiveData.tiers.map((tier) => (
          <div key={tier.id} className="border border-border/70 rounded-lg overflow-hidden bg-card/40">
            {/* Tier Header */}
            <div className="flex items-center justify-between px-3.5 py-2 bg-muted/40 border-b border-border/60">
              <input
                type="text"
                disabled={!isBoss}
                value={tier.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setArchiveData((prev) => ({
                    ...prev,
                    tiers: prev.tiers.map((t) => (t.id === tier.id ? { ...t, name: val } : t)),
                  }));
                }}
                className="bg-transparent text-xs font-bold uppercase tracking-wider outline-none focus:bg-background/80 px-1 py-0.5 rounded flex-1 mr-2"
                placeholder="Tier Name..."
              />

              <div className="flex items-center gap-1 shrink-0">
                {isBoss && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAddRow(tier.id)}
                      className="h-7 px-2 text-xs gap-1"
                      title="Add item to tier"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Item
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteTier(tier.id)}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                      title="Delete tier"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-muted/20 border-b border-border/40 text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-2 px-3 w-12 text-center">Image</th>
                    <th className="py-2 px-3 min-w-[200px]">Item Name</th>
                    <th className="py-2 px-3 min-w-[220px]">Image URL</th>
                    <th className="py-2 px-3 w-32">Chips / Price</th>
                    <th className="py-2 px-3 w-28">Stock</th>
                    {isBoss && <th className="py-2 px-3 w-10 text-center" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {tier.items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                      {/* Image Thumbnail */}
                      <td className="py-1.5 px-3 text-center align-middle">
                        <div className="h-7 w-7 rounded border border-border/60 bg-muted/40 flex items-center justify-center overflow-hidden mx-auto">
                          {item.imageUrl && item.imageUrl.trim() !== "" ? (
                            <img
                              src={item.imageUrl}
                              alt=""
                              className="h-full w-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="text-[10px] font-bold text-muted-foreground">?</span>
                          )}
                        </div>
                      </td>

                      {/* Item Name */}
                      <td className="py-1.5 px-3">
                        <input
                          type="text"
                          disabled={!isBoss}
                          value={item.name}
                          onChange={(e) =>
                            updateItemField(tier.id, item.id, "name", e.target.value)
                          }
                          className="w-full bg-transparent font-medium outline-none focus:bg-background px-1.5 py-1 rounded border border-transparent focus:border-border/60"
                          placeholder="Item Name"
                        />
                      </td>

                      {/* Direct Image URL */}
                      <td className="py-1.5 px-3">
                        <input
                          type="text"
                          disabled={!isBoss}
                          value={item.imageUrl || ""}
                          onChange={(e) =>
                            updateItemField(tier.id, item.id, "imageUrl", e.target.value)
                          }
                          className="w-full bg-transparent font-mono text-[11px] text-muted-foreground outline-none focus:bg-background focus:text-foreground px-1.5 py-1 rounded border border-transparent focus:border-border/60"
                          placeholder="https://... (leave blank for ? box)"
                        />
                      </td>

                      {/* Chips Price */}
                      <td className="py-1.5 px-3">
                        <input
                          type="text"
                          disabled={!isBoss}
                          value={item.price}
                          onChange={(e) =>
                            updateItemField(tier.id, item.id, "price", e.target.value)
                          }
                          className="w-full bg-transparent outline-none focus:bg-background px-1.5 py-1 rounded border border-transparent focus:border-border/60"
                          placeholder="e.g. 200 Chips"
                        />
                      </td>

                      {/* Stock */}
                      <td className="py-1.5 px-3">
                        <input
                          type="text"
                          disabled={!isBoss}
                          value={item.stock}
                          onChange={(e) =>
                            updateItemField(tier.id, item.id, "stock", e.target.value)
                          }
                          className="w-full bg-transparent outline-none focus:bg-background px-1.5 py-1 rounded border border-transparent focus:border-border/60"
                          placeholder="e.g. 1"
                        />
                      </td>

                      {/* Delete Action */}
                      {isBoss && (
                        <td className="py-1.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(tier.id, item.id)}
                            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                            title="Delete item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}

                  {tier.items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-3 text-center text-xs text-muted-foreground italic">
                        No items in this tier.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Optional Tier Note */}
            {isBoss && (
              <div className="px-3 py-1.5 bg-muted/10 border-t border-border/40 flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-semibold shrink-0">
                  Note:
                </span>
                <input
                  type="text"
                  value={tier.note || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setArchiveData((prev) => ({
                      ...prev,
                      tiers: prev.tiers.map((t) => (t.id === tier.id ? { ...t, note: val } : t)),
                    }));
                  }}
                  placeholder="Optional note for this tier (e.g. *Tier 2 changes every 3 months...)"
                  className="w-full bg-transparent text-[11px] text-muted-foreground italic outline-none focus:bg-background px-1 py-0.5 rounded border border-transparent focus:border-border/60"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ─── API Endpoint Modal ─── */}
      {isApiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-popover border border-border rounded-xl p-5 max-w-md w-full space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Code2 className="h-4 w-4 text-primary" /> API Data URL
              </h3>
              <button
                onClick={() => setIsApiModalOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Dynamic endpoint for fetching the latest Black Archive items:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={
                  typeof window !== "undefined"
                    ? `${window.location.origin}/api/black-archive`
                    : "/api/black-archive"
                }
                className="flex-1 bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono select-all outline-none"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    navigator.clipboard.writeText(`${window.location.origin}/api/black-archive`);
                    toast.success("Copied API URL!");
                  }
                }}
                className="text-xs h-8"
              >
                <Copy className="h-3.5 w-3.5 mr-1" /> Copy
              </Button>
            </div>
            <div className="pt-2 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setIsApiModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}