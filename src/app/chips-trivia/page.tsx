"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  HelpCircle,
  Plus,
  Trash2,
  Save,
  Copy,
  Check,
  Search,
  RefreshCw,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export interface TriviaItem {
  id: string;
  question: string;
  answer: string;
}

export default function RandomBlackChipsTrivia() {
  const [triviaList, setTriviaList] = useState<TriviaItem[]>([]);
  const [visibilityFreq, setVisibilityFreq] = useState<number>(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [copiedRiddles, setCopiedRiddles] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const questionInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Fetch trivia list and visibility frequency from API on mount
  useEffect(() => {
    async function fetchTrivia() {
      try {
        setInitialLoading(true);
        const res = await fetch("/api/chips-trivia?manage=true");
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.trivia)) {
            setTriviaList(data.trivia);
          }
          if (typeof data.visibilityFreq === "number") {
            setVisibilityFreq(data.visibilityFreq);
          }
        } else {
          toast.error("Failed to load trivia from server.");
        }
      } catch (err) {
        console.error("Error fetching trivia:", err);
        toast.error("Could not connect to trivia API.");
      } finally {
        setInitialLoading(false);
      }
    }
    fetchTrivia();
  }, []);

  // Update visibility frequency
  const handleVisibilityFreqChange = (val: number) => {
    const safeVal = Math.max(0, Math.min(300, isNaN(val) ? 0 : val));
    setVisibilityFreq(safeVal);
    setHasUnsavedChanges(true);
  };

  // Update a field in a specific row
  const handleItemChange = (index: number, field: "question" | "answer", value: string) => {
    setTriviaList((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
    setHasUnsavedChanges(true);
  };

  // Add a new trivia row
  const handleAddRow = (autoFocus = true) => {
    const newId = Date.now().toString();
    const newItem: TriviaItem = {
      id: newId,
      question: "",
      answer: "",
    };
    setTriviaList((prev) => [...prev, newItem]);
    setHasUnsavedChanges(true);

    if (autoFocus) {
      setTimeout(() => {
        const lastIdx = triviaList.length;
        if (questionInputRefs.current[lastIdx]) {
          questionInputRefs.current[lastIdx]?.focus();
        }
      }, 50);
    }
  };

  // Delete a specific row
  const handleDeleteRow = (index: number) => {
    setTriviaList((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      return next;
    });
    setHasUnsavedChanges(true);
    toast.info(`Deleted row #${index + 1}`);
  };

  // Save changes to the JSON file API on server
  const handleSaveToApi = async () => {
    try {
      setIsSaving(true);
      const res = await fetch("/api/chips-trivia", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          visibilityFreq,
          trivia: triviaList,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setHasUnsavedChanges(false);
        toast.success(data.message || "Trivia data successfully saved to API!");
      } else {
        toast.error(data.message || "Failed to save trivia.");
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to connect to trivia API.");
    } finally {
      setIsSaving(false);
    }
  };

  // Copy list of riddles (questions only) directly to clipboard
  const handleCopyRiddles = () => {
    const riddlesArray = triviaList
      .map((item) => item.question.trim())
      .filter(Boolean);

    const formattedText = JSON.stringify(riddlesArray, null, 2);
    navigator.clipboard.writeText(formattedText);
    setCopiedRiddles(true);
    toast.success(`Copied ${riddlesArray.length} riddles to clipboard!`);
    setTimeout(() => setCopiedRiddles(false), 2000);
  };

  // Filtered trivia for searching
  const filteredIndices = triviaList
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
      );
    });

  const appearancePercentage = Math.min(100, (visibilityFreq / 300) * 100).toFixed(1);

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Chips Trivia</h1>
            <Badge variant="secondary" className="font-mono text-xs">
              {triviaList.length}
            </Badge>
            {hasUnsavedChanges && (
              <Badge variant="destructive" className="text-xs">
                Unsaved Changes
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Maintain questions, answers, and visibility frequency for Black Chips trivia.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyRiddles}
            className="gap-1.5 h-8 text-xs"
            title="Copy questions list as a formatted array"
          >
            {copiedRiddles ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copiedRiddles ? "Copied!" : "Copy Riddles"}</span>
          </Button>

          <Button
            onClick={handleSaveToApi}
            disabled={isSaving}
            size="sm"
            className="gap-1.5 h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <Save className={`h-3.5 w-3.5 ${isSaving ? "animate-spin" : ""}`} />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Visibility Frequency & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/20 px-3 py-2 rounded-md border text-xs">
        {/* Visibility Frequency Control */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-muted-foreground">Visibility Frequency:</span>
          <Input
            type="number"
            min={0}
            max={300}
            value={visibilityFreq}
            onChange={(e) => handleVisibilityFreqChange(parseInt(e.target.value, 10))}
            className="w-16 h-7 font-mono text-xs text-center bg-background px-1"
          />
          <span className="text-muted-foreground">
            / 300 (<span className="text-foreground font-medium">{appearancePercentage}%</span> chance)
          </span>
        </div>

        {/* Search & Add Question */}
        <div className="flex items-center gap-2 justify-end">
          <div className="relative w-48 sm:w-56">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search trivia..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-7 text-xs bg-background"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[20px] text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            )}
          </div>

          <Button
            onClick={() => handleAddRow(true)}
            size="sm"
            className="h-7 px-2.5 gap-1 bg-primary text-primary-foreground text-xs font-medium shadow-sm hover:bg-primary/90 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Row
          </Button>
        </div>
      </div>

      {/* Main Trivia Maintenance Table */}
      <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
        {/* Table Header - Attached & Flush */}
        <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-muted/40 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider items-center">
          <div className="col-span-2 sm:col-span-1 text-center font-mono">
            #
          </div>
          <div className="col-span-5 sm:col-span-6 md:col-span-7">
            Question
          </div>
          <div className="col-span-4 sm:col-span-4 md:col-span-3">
            Answer
          </div>
          <div className="col-span-1 text-right pr-2">
            Action
          </div>
        </div>

        {/* Table Body / Rows */}
        <div className="divide-y divide-border/60">
          {initialLoading ? (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
              <p className="text-xs">Loading trivia dataset...</p>
            </div>
          ) : filteredIndices.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2 px-4">
              <p className="text-sm font-medium text-foreground">
                {searchQuery ? `No questions matching "${searchQuery}"` : "No trivia questions yet."}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => handleAddRow(true)}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1 mt-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Question
                </Button>
              )}
            </div>
          ) : (
            filteredIndices.map(({ item, idx }) => {
              const actualNumber = idx + 1;

              return (
                <div
                  key={item.id || idx}
                  className="grid grid-cols-12 gap-3 px-4 py-2.5 items-center hover:bg-muted/20 transition-colors"
                >
                  {/* Col 1: Auto incrementing disabled input box */}
                  <div className="col-span-2 sm:col-span-1 flex items-center justify-center">
                    <Input
                      disabled
                      value={actualNumber}
                      className="w-12 sm:w-14 h-9 text-center font-mono font-bold text-xs bg-muted/60 text-muted-foreground border-border/70 cursor-not-allowed select-none shadow-none px-1"
                    />
                  </div>

                  {/* Col 2: Wide Question Input */}
                  <div className="col-span-5 sm:col-span-6 md:col-span-7">
                    <Input
                      ref={(el) => {
                        questionInputRefs.current[idx] = el;
                      }}
                      value={item.question}
                      onChange={(e) => handleItemChange(idx, "question", e.target.value)}
                      placeholder={`Enter question #${actualNumber}...`}
                      className="h-9 w-full bg-background/50 focus:bg-background transition-colors text-sm"
                    />
                  </div>

                  {/* Col 3: Answer Box */}
                  <div className="col-span-4 sm:col-span-4 md:col-span-3">
                    <Input
                      value={item.answer}
                      onChange={(e) => handleItemChange(idx, "answer", e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && idx === triviaList.length - 1) {
                          e.preventDefault();
                          handleAddRow(true);
                        }
                      }}
                      placeholder="Enter answer..."
                      className="h-9 w-full bg-background/50 focus:bg-background transition-colors text-sm"
                    />
                  </div>

                  {/* Col 4: Delete button */}
                  <div className="col-span-1 flex items-center justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRow(idx)}
                      title={`Delete #${actualNumber}`}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Append Bar - Clean & Flush */}
        <div className="px-4 py-3 bg-muted/20 border-t flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddRow(true)}
            className="h-8 text-xs gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Row
          </Button>

          <Button
            size="sm"
            onClick={handleSaveToApi}
            disabled={isSaving}
            className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90"
          >
            <Save className={`h-3.5 w-3.5 ${isSaving ? "animate-spin" : ""}`} />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}