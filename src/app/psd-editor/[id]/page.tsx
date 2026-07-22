"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  Wand2,
  Loader2,
  Copy,
  Check,
  Upload,
  RefreshCw,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import type { PsdTemplate } from "@/lib/psd-store";

export default function PsdGeneratorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [template, setTemplate] = useState<PsdTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [outputFormat, setOutputFormat] = useState<"png" | "jpg">("png");
  const [generating, setGenerating] = useState(false);

  // Preview Modal states
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [generatedDataUrl, setGeneratedDataUrl] = useState<string | null>(null);
  const [generatedFormat, setGeneratedFormat] = useState<string>("png");

  // GitHub Upload states
  const [isUploadingToGitHub, setIsUploadingToGitHub] = useState(false);
  const [uploadedGithubUrl, setUploadedGithubUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchTemplate = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/psd/templates");
        const data = await res.json();
        if (data.success && Array.isArray(data.templates)) {
          const found = data.templates.find((t: PsdTemplate) => t.id === id);
          if (found) {
            setTemplate(found);
            // Initialize fields with default values
            const initialMap: Record<string, string> = {};
            found.fields.forEach((f: any) => {
              initialMap[f.layerName] = f.defaultValue || "";
            });
            setFieldValues(initialMap);
          } else {
            toast.error("PSD Template not found.");
            router.push("/psd-editor");
          }
        }
      } catch (err) {
        console.error("Failed to load template details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [id, router]);

  const handleInputChange = (layerName: string, value: string) => {
    setFieldValues((prev) => ({
      ...prev,
      [layerName]: value,
    }));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) return;

    try {
      setGenerating(true);
      setUploadedGithubUrl(null);

      const res = await fetch("/api/psd/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          fieldValues,
          format: outputFormat,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to generate image.");
      }

      setGeneratedDataUrl(data.dataUrl);
      setGeneratedFormat(data.format);
      setPreviewModalOpen(true);
      toast.success("Image generated! Check the preview.");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Failed to generate image."
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleUploadToGitHub = async () => {
    if (!generatedDataUrl || !template) return;

    try {
      setIsUploadingToGitHub(true);

      // Convert Base64 Data URL to Blob/File
      const res = await fetch(generatedDataUrl);
      const blob = await res.blob();
      const ext = generatedFormat || "png";
      const filename = `${template.id}-${Date.now().toString().slice(-6)}.${ext}`;
      const file = new File([blob], filename, { type: blob.type });

      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await uploadRes.json();

      if (!uploadRes.ok || !result.success) {
        throw new Error(result.message || "Failed to upload to gallery.");
      }

      setUploadedGithubUrl(result.url);
      toast.success("Uploaded directly to GitHub gallery!");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Failed to upload image."
      );
    } finally {
      setIsUploadingToGitHub(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!uploadedGithubUrl) return;
    await navigator.clipboard.writeText(uploadedGithubUrl);
    setCopiedLink(true);
    toast.success("Direct image URL copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!template) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Back button */}
      <div>
        <Link href="/psd-editor">
          <Button variant="ghost" size="sm" className="gap-1 rounded-xl text-xs">
            <ChevronLeft className="h-4 w-4" />
            Back to PSD Editor
          </Button>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-card/90 via-card/50 to-background p-6 md:p-8 shadow-sm">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span>PSD Graphic Generator</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            {template.title}
          </h1>
          {template.description && (
            <p className="text-sm text-muted-foreground max-w-xl">
              {template.description}
            </p>
          )}
        </div>
      </div>

      {/* Generator Form */}
      <Card className="rounded-3xl border-border/70 bg-card/80 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Customize Image Text</CardTitle>
          <CardDescription className="text-xs">
            Enter values for the PSD text layers below. Font styles, alignment, and sizes will be preserved exactly.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleGenerate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {template.fields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">
                      {field.label}
                    </Label>
                    <span className="text-[10px] font-mono text-muted-foreground/80">
                      [{field.layerName}]
                    </span>
                  </div>
                  <Input
                    value={fieldValues[field.layerName] || ""}
                    onChange={(e) =>
                      handleInputChange(field.layerName, e.target.value)
                    }
                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                    className="h-10 rounded-xl bg-background/60 border-border/60 text-sm"
                  />
                </div>
              ))}
            </div>

            {/* Output Format Choice */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <Label className="text-xs font-semibold">Output File Format</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                  <input
                    type="radio"
                    name="format"
                    value="png"
                    checked={outputFormat === "png"}
                    onChange={() => setOutputFormat("png")}
                    className="accent-primary"
                  />
                  <span>PNG (High Quality Lossless)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                  <input
                    type="radio"
                    name="format"
                    value="jpg"
                    checked={outputFormat === "jpg"}
                    onChange={() => setOutputFormat("jpg")}
                    className="accent-primary"
                  />
                  <span>JPG / JPEG (Standard Web Image)</span>
                </label>
              </div>
            </div>

            <Button
              type="submit"
              disabled={generating}
              className="w-full h-11 rounded-2xl gap-2 font-bold shadow-md hover:shadow-primary/20 transition-all text-sm"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Image from PSD...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Generate Image Preview
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Interactive Preview Modal */}
      <Dialog
        open={previewModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewModalOpen(false);
          }
        }}
      >
        <DialogContent className="max-w-[95vw] lg:max-w-4xl p-0 overflow-hidden rounded-3xl border-border/80 bg-card shadow-2xl">
          {generatedDataUrl && (
            <div className="flex flex-col md:flex-row min-h-[480px]">
              {/* Image Preview Area */}
              <div className="relative flex min-h-[350px] max-h-[75vh] md:min-h-[500px] flex-1 items-center justify-center bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] bg-muted/30 p-6 overflow-auto">
                <img
                  src={generatedDataUrl}
                  alt="Generated Preview"
                  className="h-full w-full max-h-[70vh] object-contain rounded-xl shadow-xl"
                />
              </div>

              {/* Action Sidebar */}
              <div className="flex w-full md:w-80 flex-col justify-between border-t md:border-t-0 md:border-l border-border/60 p-6 bg-card shrink-0">
                <div className="space-y-4">
                  <DialogHeader className="p-0 text-left">
                    <DialogTitle className="text-lg font-bold text-foreground">
                      Generated Preview
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Does this image preview look correct?
                    </DialogDescription>
                  </DialogHeader>

                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Format</span>
                      <span className="font-semibold uppercase">{generatedFormat}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Template</span>
                      <span className="font-semibold truncate max-w-[140px]">{template.title}</span>
                    </div>
                  </div>

                  {uploadedGithubUrl && (
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-400 space-y-2">
                        <p className="font-semibold">Uploaded to Gallery!</p>
                        <Input
                          value={uploadedGithubUrl}
                          readOnly
                          className="h-8 text-[11px] font-mono rounded-lg bg-background/80"
                        />
                      </div>

                      <Button
                        onClick={handleCopyUrl}
                        className="w-full h-9 rounded-xl gap-2 shadow-xs"
                      >
                        {copiedLink ? (
                          <>
                            <Check className="h-4 w-4 text-green-400" />
                            Copied to Clipboard!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy Image URL
                          </>
                        )}
                      </Button>

                      <a
                        href={uploadedGithubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-9 rounded-xl gap-2 text-xs border-border/80"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open Direct URL
                        </Button>
                      </a>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-6 mt-4 border-t border-border/60">
                  {!uploadedGithubUrl && (
                    <Button
                      onClick={handleUploadToGitHub}
                      disabled={isUploadingToGitHub}
                      className="w-full h-10 rounded-xl gap-2 font-semibold shadow-md"
                    >
                      {isUploadingToGitHub ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading to Gallery...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Upload to Gallery Server
                        </>
                      )}
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => setPreviewModalOpen(false)}
                    className="w-full h-10 rounded-xl gap-2 border-border/80"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Edit / Re-generate
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
