"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Plus,
  Trash2,
  FileImage,
  Loader2,
  Sparkles,
  Layers,
  Wand2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { PsdTemplate, PsdField } from "@/lib/psd-store";

export default function PsdEditorPage() {
  const { realUser, currentUser } = useApp();
  const userRole = realUser?.role || currentUser?.role;
  const isBoss = userRole === "Boss";

  const [psdTemplates, setPsdTemplates] = useState<PsdTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Boss Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [psdFile, setPsdFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<Omit<PsdField, "id">[]>([
    { layerName: "TEXT_1", label: "Title / Main Text", defaultValue: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [layerError, setLayerError] = useState<string | null>(null);

  const fetchPsdTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/psd/templates");
      const data = await res.json();
      if (data.success) {
        setPsdTemplates(data.templates);
      }
    } catch (err) {
      console.error("Failed to load PSD templates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPsdTemplates();
  }, []);

  const addFieldRow = () => {
    setFields((prev) => [
      ...prev,
      {
        layerName: `LAYER_${prev.length + 1}`,
        label: `Field ${prev.length + 1}`,
        defaultValue: "",
      },
    ]);
  };

  const removeFieldRow = (index: number) => {
    if (fields.length === 1) return;
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFieldChange = (
    index: number,
    key: keyof Omit<PsdField, "id">,
    value: string
  ) => {
    setFields((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: value };
      return updated;
    });
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLayerError(null);

    if (!isBoss) {
      toast.error("Only Bosses can upload PSD templates.");
      return;
    }

    if (!psdFile) {
      toast.error("Please select a .psd file.");
      return;
    }

    if (!title.trim()) {
      toast.error("Please enter a template title.");
      return;
    }

    // Validate fields
    for (let i = 0; i < fields.length; i++) {
      if (!fields[i].layerName.trim() || !fields[i].label.trim()) {
        toast.error(`Field #${i + 1} must have a valid Layer Name and Label.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("file", psdFile);
      formData.append("title", title);
      formData.append("description", description);
      formData.append(
        "fields",
        JSON.stringify(
          fields.map((f, idx) => ({ ...f, id: `field-${idx + 1}` }))
        )
      );
      formData.append("createdBy", currentUser.username);

      const res = await fetch("/api/psd/templates", {
        method: "POST",
        headers: {
          "x-user-role": userRole || "",
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setLayerError(data.message || "Failed to create template.");
        toast.error(data.message || "Layer validation error.");
        return;
      }

      toast.success("PSD Template created successfully!");
      setIsUploadOpen(false);
      setPsdFile(null);
      setTitle("");
      setDescription("");
      setFields([{ layerName: "TEXT_1", label: "Title / Main Text", defaultValue: "" }]);
      fetchPsdTemplates();
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Failed to create template."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isBoss) return;
    if (!window.confirm("Are you sure you want to delete this PSD template?")) return;

    try {
      const res = await fetch(`/api/psd/templates?id=${id}`, {
        method: "DELETE",
        headers: {
          "x-user-role": userRole || "",
        },
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Template deleted.");
        fetchPsdTemplates();
      } else {
        toast.error(data.message || "Failed to delete template.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete template.");
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-card/90 via-card/50 to-background p-6 md:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>PSD Graphic Generators</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
              PSD Editor & Image Generator
            </h1>
            <p className="text-sm text-muted-foreground max-w-lg">
              Generate images from PSD templates with custom layer text replacement.
            </p>
          </div>

          {isBoss && (
            <Button
              onClick={() => setIsUploadOpen(true)}
              className="h-10 px-4 rounded-xl gap-2 shadow-md hover:shadow-primary/20 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>New PSD Template</span>
            </Button>
          )}
        </div>
      </div>

      {/* PSD Generator Templates Catalog */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight">Available PSD Templates</h2>
          <Badge variant="outline" className="ml-2 font-mono text-xs">
            {psdTemplates.length} Templates
          </Badge>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-44 rounded-2xl border border-border/50 bg-card p-5 animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && psdTemplates.length === 0 && (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-card/30 p-6 text-center">
            <FileImage className="h-8 w-8 text-muted-foreground" />
            <p className="text-xs text-muted-foreground max-w-sm">
              No custom PSD templates uploaded yet. {isBoss ? "Click 'New PSD Template' above to add your first PSD file." : ""}
            </p>
          </div>
        )}

        {!loading && psdTemplates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {psdTemplates.map((template) => (
              <Card
                key={template.id}
                className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5"
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg font-bold text-foreground">
                      {template.title}
                    </CardTitle>
                    {isBoss && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDeleteTemplate(template.id, e)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                        title="Delete PSD Template"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {template.description && (
                    <CardDescription className="text-xs line-clamp-2 mt-1">
                      {template.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    <span>
                      <strong className="text-foreground font-semibold">
                        {template.fields.length}
                      </strong>{" "}
                      Editable {template.fields.length === 1 ? "Layer" : "Layers"}
                    </span>
                  </div>

                  <Link href={`/psd-editor/${template.id}`} className="block">
                    <Button
                      variant="default"
                      className="w-full h-9 rounded-xl gap-2 font-medium text-xs shadow-xs"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      Open Generator
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Boss Upload PSD Modal */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-6 bg-card border-border/80 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">New PSD Template (Boss Only)</DialogTitle>
            <DialogDescription className="text-xs">
              Upload a .psd file and configure the target layer names that users will edit.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTemplate} className="space-y-5 mt-2">
            {layerError && (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{layerError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="psd-file" className="text-xs font-semibold">
                PSD Source File (.psd)
              </Label>
              <Input
                id="psd-file"
                type="file"
                accept=".psd"
                onChange={(e) => setPsdFile(e.target.files?.[0] || null)}
                required
                className="h-10 rounded-xl bg-muted/20 border-border/60 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="template-title" className="text-xs font-semibold">
                  Template Title
                </Label>
                <Input
                  id="template-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Winner Announcement Banner"
                  required
                  className="h-10 rounded-xl bg-muted/20 border-border/60 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="template-desc" className="text-xs font-semibold">
                  Description (Optional)
                </Label>
                <Input
                  id="template-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of when to use this banner"
                  className="h-10 rounded-xl bg-muted/20 border-border/60 text-xs"
                />
              </div>
            </div>

            {/* Editable Layers Builder */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  Configure Editable Text Layers
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addFieldRow}
                  className="h-7 px-2.5 text-xs rounded-lg gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Layer Field
                </Button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {fields.map((field, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-border/60 bg-muted/20"
                  >
                    <div className="flex-1 space-y-1">
                      <Input
                        value={field.layerName}
                        onChange={(e) =>
                          handleFieldChange(idx, "layerName", e.target.value)
                        }
                        placeholder="PSD Layer Name (e.g. TEXT_TITLE)"
                        required
                        className="h-8 text-xs rounded-lg font-mono"
                        title="Exact Layer Name in PSD"
                      />
                    </div>

                    <div className="flex-1 space-y-1">
                      <Input
                        value={field.label}
                        onChange={(e) =>
                          handleFieldChange(idx, "label", e.target.value)
                        }
                        placeholder="User Field Label (e.g. Title)"
                        required
                        className="h-8 text-xs rounded-lg"
                      />
                    </div>

                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFieldRow(idx)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUploadOpen(false)}
                className="h-10 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="h-10 rounded-xl gap-2 shadow-md"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Validating Layers & Saving...
                  </>
                ) : (
                  <>Save Template</>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
