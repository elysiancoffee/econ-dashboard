"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Code2,
  Link2,
  Sparkles,
  Eye,
  Sliders,
  Monitor,
  Moon,
  Sun,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ScheduleShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScheduleShareModal({ isOpen, onClose }: ScheduleShareModalProps) {
  const [activeTab, setActiveTab] = useState<"embed" | "link" | "preview">("embed");
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Customization options
  const [themeMode, setThemeMode] = useState<"system" | "dark" | "light">("system");
  const [hideRoster, setHideRoster] = useState(false);
  const [hideHeader, setHideHeader] = useState(false);
  const [iframeHeight, setIframeHeight] = useState<string>("650");
  const [responsiveWrapper, setResponsiveWrapper] = useState(true);

  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  // Compute embed URL with parameters
  const embedUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (themeMode !== "system") params.set("theme", themeMode);
    if (hideRoster) params.set("hideRoster", "true");
    if (hideHeader) params.set("hideHeader", "true");

    const query = params.toString() ? `?${params.toString()}` : "";
    return `${origin}/schedule/embed${query}`;
  }, [origin, themeMode, hideRoster, hideHeader]);

  // Compute direct public view URL
  const directPublicUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("standalone", "true");
    if (themeMode !== "system") params.set("theme", themeMode);
    if (hideRoster) params.set("hideRoster", "true");

    const query = params.toString() ? `?${params.toString()}` : "";
    return `${origin}/schedule/view${query}`;
  }, [origin, themeMode, hideRoster]);

  // Full internal app URL
  const inAppUrl = useMemo(() => {
    return `${origin}/schedule`;
  }, [origin]);

  // Generate HTML Embed Code
  const embedCode = useMemo(() => {
    if (responsiveWrapper) {
      return `<!-- ECON Team Schedule Embed -->
<div style="position:relative; width:100%; max-width:100%; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.15);">
  <iframe
    src="${embedUrl}"
    width="100%"
    height="${iframeHeight}"
    style="border:0; width:100%; height:${iframeHeight}px; display:block;"
    title="ECON Team Schedule"
    loading="lazy"
    allow="clipboard-write"
  ></iframe>
</div>`;
    }

    return `<iframe src="${embedUrl}" width="100%" height="${iframeHeight}" style="border:none; border-radius:16px; overflow:hidden; width:100%;" title="ECON Team Schedule" loading="lazy"></iframe>`;
  }, [embedUrl, iframeHeight, responsiveWrapper]);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    toast.success("Copied to clipboard!");
    setTimeout(() => {
      setCopiedType(null);
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-popover border border-border/80 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Share & Embed Schedule</h2>
              <p className="text-xs text-muted-foreground">
                Embed a clean live schedule in any webpage, or share direct links.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border/50 bg-muted/10 px-6 pt-2 gap-2">
          <button
            onClick={() => setActiveTab("embed")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer",
              activeTab === "embed"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>HTML Embed Code</span>
          </button>
          <button
            onClick={() => setActiveTab("link")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer",
              activeTab === "link"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Link2 className="h-3.5 w-3.5" />
            <span>Direct URLs</span>
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer",
              activeTab === "preview"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Live Preview</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: HTML EMBED */}
          {activeTab === "embed" && (
            <div className="space-y-5">
              {/* Embed Code Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    HTML Embed Snippet (Iframe)
                  </label>
                  <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1">
                    <Check className="h-3 w-3" /> Ready to paste in any site or CMS
                  </span>
                </div>
                <div className="relative group">
                  <pre className="p-3.5 rounded-xl bg-neutral-950 text-neutral-200 border border-border/40 text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-36">
                    {embedCode}
                  </pre>
                  <button
                    onClick={() => handleCopy(embedCode, "embed")}
                    className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all shadow-sm"
                  >
                    {copiedType === "embed" ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy Code
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Embed Customization Controls */}
              <div className="border border-border/50 rounded-xl p-4 bg-muted/20 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Sliders className="h-3.5 w-3.5 text-primary" />
                  <span>Customize Embed Options</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Theme Mode */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground">Theme</label>
                    <div className="grid grid-cols-3 gap-1 bg-background p-1 rounded-xl border border-border/60">
                      <button
                        type="button"
                        onClick={() => setThemeMode("system")}
                        className={cn(
                          "flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-medium transition-all",
                          themeMode === "system"
                            ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Monitor className="h-3 w-3" /> Auto
                      </button>
                      <button
                        type="button"
                        onClick={() => setThemeMode("dark")}
                        className={cn(
                          "flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-medium transition-all",
                          themeMode === "dark"
                            ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Moon className="h-3 w-3" /> Dark
                      </button>
                      <button
                        type="button"
                        onClick={() => setThemeMode("light")}
                        className={cn(
                          "flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-medium transition-all",
                          themeMode === "light"
                            ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Sun className="h-3 w-3" /> Light
                      </button>
                    </div>
                  </div>

                  {/* Height */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground">Height</label>
                    <select
                      value={iframeHeight}
                      onChange={(e) => setIframeHeight(e.target.value)}
                      className="w-full bg-background border border-border/60 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                    >
                      <option value="500">500px (Compact)</option>
                      <option value="650">650px (Standard / Recommended)</option>
                      <option value="800">800px (Spacious)</option>
                      <option value="1000">1000px (Full View)</option>
                    </select>
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex flex-wrap gap-4 pt-1 border-t border-border/30">
                  <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hideRoster}
                      onChange={(e) => setHideRoster(e.target.checked)}
                      className="rounded border-border/60 text-primary focus:ring-primary/40 h-4 w-4"
                    />
                    <span>Hide Roster (Table Only)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hideHeader}
                      onChange={(e) => setHideHeader(e.target.checked)}
                      className="rounded border-border/60 text-primary focus:ring-primary/40 h-4 w-4"
                    />
                    <span>Hide Header (Borderless Widget)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={responsiveWrapper}
                      onChange={(e) => setResponsiveWrapper(e.target.checked)}
                      className="rounded border-border/60 text-primary focus:ring-primary/40 h-4 w-4"
                    />
                    <span>Include Responsive Card Wrapper</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DIRECT URLS */}
          {activeTab === "link" && (
            <div className="space-y-5">
              {/* Clean Public URL */}
              <div className="border border-border/60 rounded-xl p-4 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-foreground">Clean Direct Schedule Link</h3>
                    <p className="text-[11px] text-muted-foreground">
                      Public standalone view for sharing with anyone (no sidebar, no login required).
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    Public View
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={directPublicUrl}
                    className="flex-1 bg-background border border-border/60 rounded-xl px-3 py-2 text-xs font-mono text-muted-foreground outline-none select-all"
                  />
                  <button
                    onClick={() => handleCopy(directPublicUrl, "public-link")}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity shadow-xs shrink-0"
                  >
                    {copiedType === "public-link" ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy Link
                      </>
                    )}
                  </button>
                  <a
                    href={directPublicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl border border-border/60 bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>

              {/* In-App Link */}
              <div className="border border-border/40 rounded-xl p-4 bg-background space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-foreground">Internal App URL</h3>
                    <p className="text-[11px] text-muted-foreground">
                      Full workspace link for logged-in Inner Circle members.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                    Members Only
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inAppUrl}
                    className="flex-1 bg-muted/40 border border-border/40 rounded-xl px-3 py-2 text-xs font-mono text-muted-foreground outline-none select-all"
                  />
                  <button
                    onClick={() => handleCopy(inAppUrl, "app-link")}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/60 bg-muted/50 hover:bg-muted text-foreground text-xs font-semibold transition-colors shrink-0"
                  >
                    {copiedType === "app-link" ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE PREVIEW */}
          {activeTab === "preview" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-muted-foreground">Live Embed Preview</p>
                <a
                  href={embedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-primary hover:underline flex items-center gap-1"
                >
                  <span>Open URL in separate window</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/30 overflow-hidden shadow-inner flex flex-col">
                <div className="bg-muted/60 px-4 py-2 border-b border-border/40 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                  <span className="truncate max-w-[320px]">{embedUrl}</span>
                  <span className="shrink-0">{iframeHeight}px</span>
                </div>
                <iframe
                  src={embedUrl}
                  style={{ height: `${Math.min(parseInt(iframeHeight, 10), 450)}px` }}
                  className="w-full border-none bg-background"
                  title="Schedule Preview"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-border/40 bg-muted/10">
          <span className="text-[11px] text-muted-foreground">
            Any changes saved on the schedule page will update live in all embeds.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-foreground text-background text-xs font-bold hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
