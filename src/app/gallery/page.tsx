"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  ImageIcon,
  Loader2,
  RefreshCw,
  Trash2,
  Search,
  ExternalLink,
  Eye,
  Plus,
  HardDrive,
  Grid,
  List,
  Filter,
  FileImage,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApp } from "@/lib/store";

type ImageItem = {
  name: string;
  path: string;
  url: string;
  downloadUrl: string;
  sha: string;
  size: number;
};

type SortOption =
  | "newest"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "size-desc"
  | "size-asc";

type ViewMode = "grid" | "list";

export default function GalleryPage() {
  const { realUser, currentUser } = useApp();
  const userRole = realUser?.role || currentUser?.role;
  const isBoss = userRole === "Boss";

  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);

  const [loading, setLoading] = useState(true);
  const [deletingSha, setDeletingSha] = useState<string | null>(null);
  const [copiedSha, setCopiedSha] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [isZoomed, setIsZoomed] = useState(false);

  const fetchImages = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/images");
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load images.");
      }

      setImages(result.images);
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error ? error.message : "Failed to load images."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const copyLink = async (url: string, sha: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    await navigator.clipboard.writeText(url);

    setCopiedSha(sha);
    toast.success("Direct image URL copied!");

    setTimeout(() => {
      setCopiedSha((prev) => (prev === sha ? null : prev));
    }, 2000);
  };

  const handleDelete = async (image: ImageItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!isBoss) {
      toast.error("Unauthorized. Only Bosses can delete images.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${image.name}"?`
    );

    if (!confirmed) return;

    try {
      setDeletingSha(image.sha);

      const response = await fetch("/api/images", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userRole || "",
        },
        body: JSON.stringify({
          path: image.path,
          sha: image.sha,
          role: userRole,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to delete image.");
      }

      toast.success("Image deleted successfully.");
      setImages((prev) => prev.filter((img) => img.sha !== image.sha));

      if (selectedImage?.sha === image.sha) {
        setSelectedImage(null);
      }
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete image."
      );
    } finally {
      setDeletingSha(null);
    }
  };

  const getTimestampFromFilename = (filename: string): number => {
    const match = filename.match(/-(\d{10,15})\.[^/.]+$/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return 0;
  };

  const totalStorage = useMemo(() => {
    const bytes = images.reduce((acc, img) => acc + (img.size || 0), 0);
    if (bytes === 0) return "0 KB";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }, [images]);

  const processedImages = useMemo(() => {
    let filtered = images.filter((image) =>
      image.name.toLowerCase().includes(search.toLowerCase())
    );

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest": {
          const timeA = getTimestampFromFilename(a.name);
          const timeB = getTimestampFromFilename(b.name);
          if (timeA || timeB) return timeB - timeA;
          return b.name.localeCompare(a.name);
        }
        case "oldest": {
          const timeA = getTimestampFromFilename(a.name);
          const timeB = getTimestampFromFilename(b.name);
          if (timeA || timeB) return timeA - timeB;
          return a.name.localeCompare(b.name);
        }
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "size-asc":
          return a.size - b.size;
        case "size-desc":
          return b.size - a.size;
        default:
          return 0;
      }
    });
  }, [images, search, sortBy]);

  return (
    <div className="space-y-8 pb-10">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-card/90 via-card/50 to-background p-6 md:p-8 shadow-sm">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
              ECON Image Gallery
            </h1>
            <p className="text-sm text-muted-foreground max-w-lg">
              Here you can find all the images uploaded on the site and copy link whenever you need them.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Stats badges */}
            <div className="hidden lg:flex items-center gap-4 mr-2 border-r border-border/60 pr-5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <FileImage className="h-4 w-4 text-primary" />
                <span>
                  <strong className="font-semibold text-foreground">{images.length}</strong> Images
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <HardDrive className="h-4 w-4 text-primary" />
                <span>
                  <strong className="font-semibold text-foreground">{totalStorage}</strong> Used
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchImages}
              disabled={loading}
              className="h-10 px-4 rounded-xl border-border/80 hover:bg-muted/50 transition-all"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <Link href="/img-host">
              <Button size="sm" className="h-10 px-4 rounded-xl gap-2 shadow-md hover:shadow-primary/20 transition-all">
                <Plus className="h-4 w-4" />
                Upload Image
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Control Toolbar: Search, Sort, View Modes */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-border/80 bg-card/60 p-3 backdrop-blur-md shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search images by name..."
            className="pl-10 h-10 rounded-xl border-border/60 bg-background/60 focus:bg-background transition-all text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 justify-between md:justify-end">
          {/* Item Count */}
          <span className="text-xs text-muted-foreground font-medium px-2">
            Showing <strong className="text-foreground">{processedImages.length}</strong> of {images.length}
          </span>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 bg-background/60 border border-border/60 rounded-xl px-3 h-10">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="size-desc">Size (Largest)</option>
              <option value="size-asc">Size (Smallest)</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center border border-border/60 rounded-xl p-1 bg-background/60">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "grid" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Grid View"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "list" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card p-3 shadow-xs animate-pulse"
            >
              <div className="aspect-square w-full rounded-xl bg-muted/40" />
              <div className="h-4 w-3/4 rounded bg-muted/40" />
              <div className="h-3 w-1/2 rounded bg-muted/30" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && processedImages.length === 0 && (
        <div className="flex min-h-[350px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border/80 bg-card/30 p-8 text-center backdrop-blur-xs">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 border border-border/60 text-muted-foreground shadow-xs">
            <ImageIcon className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">No images found</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              {search
                ? `No images match "${search}". Try searching with a different filename.`
                : "You haven't uploaded any images to your repository yet."}
            </p>
          </div>
          {search ? (
            <Button variant="outline" size="sm" onClick={() => setSearch("")} className="rounded-xl">
              Clear Search
            </Button>
          ) : (
            <Link href="/img-host">
              <Button size="sm" className="rounded-xl gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                Upload Your First Image
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Gallery Content - Grid View */}
      {!loading && processedImages.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {processedImages.map((image) => {
            const isDeleting = deletingSha === image.sha;
            const isCopied = copiedSha === image.sha;
            const ext = image.name.split(".").pop()?.toUpperCase() || "IMG";

            return (
              <div
                key={image.sha}
                onClick={() => {
                  if (!isDeleting) {
                    setSelectedImage(image);
                    setIsZoomed(false);
                  }
                }}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/80 transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 cursor-pointer"
              >
                {/* Format Badge */}
                <div className="absolute top-2.5 left-2.5 z-10 rounded-md bg-background/80 px-2 py-0.5 text-[10px] font-bold tracking-wider text-foreground/80 backdrop-blur-md border border-border/40 shadow-xs">
                  {ext}
                </div>

                {/* Quick Action Overlay on Hover */}
                <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={(e) => copyLink(image.url, image.sha, e)}
                    className="h-7 w-7 rounded-lg bg-background/90 hover:bg-background text-foreground backdrop-blur-md border border-border/50 shadow-sm"
                    title="Copy direct link"
                  >
                    {isCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>

                  {isBoss && (
                    <Button
                      variant="destructive"
                      size="icon"
                      disabled={isDeleting}
                      onClick={(e) => handleDelete(image, e)}
                      className="h-7 w-7 rounded-lg shadow-sm"
                      title="Delete image (Boss only)"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </div>

                {/* Thumbnail Canvas */}
                <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:12px_12px] bg-muted/20 p-3">
                  <img
                    src={image.url}
                    alt={image.name}
                    loading="lazy"
                    className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Hover Inspect Icon indicator */}
                  <div className="absolute inset-0 bg-background/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
                    <div className="h-9 w-9 rounded-full bg-background/80 backdrop-blur-md border border-border/60 flex items-center justify-center text-foreground shadow-md">
                      <Eye className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Metadata Footer */}
                <div className="border-t border-border/60 p-3 bg-card">
                  <p className="truncate text-xs font-semibold text-foreground" title={image.name}>
                    {image.name}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{(image.size / 1024).toFixed(1)} KB</span>
                    <span className="text-[10px] text-muted-foreground/70 font-mono">
                      {image.sha.substring(0, 7)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Gallery Content - List View */}
      {!loading && processedImages.length > 0 && viewMode === "list" && (
        <div className="space-y-2">
          {processedImages.map((image) => {
            const isDeleting = deletingSha === image.sha;
            const isCopied = copiedSha === image.sha;

            return (
              <div
                key={image.sha}
                onClick={() => {
                  if (!isDeleting) {
                    setSelectedImage(image);
                    setIsZoomed(false);
                  }
                }}
                className="group flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-card/80 p-3 transition-all duration-200 hover:border-primary/50 hover:bg-card hover:shadow-md cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden border border-border/60 bg-muted/30 p-1 flex items-center justify-center">
                    <img src={image.url} alt={image.name} className="h-full w-full object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground" title={image.name}>
                      {image.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(image.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => copyLink(image.url, image.sha, e)}
                    className="h-8 px-2.5 text-xs rounded-lg gap-1.5"
                  >
                    {isCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{isCopied ? "Copied" : "Copy Link"}</span>
                  </Button>

                  {isBoss && (
                    <Button
                      variant="destructive"
                      size="icon"
                      disabled={isDeleting}
                      onClick={(e) => handleDelete(image, e)}
                      className="h-8 w-8 rounded-lg"
                      title="Delete image (Boss only)"
                    >
                      {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Enhanced Image Detail Modal */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedImage(null);
            setIsZoomed(false);
          }
        }}
      >
        <DialogContent className="max-w-[95vw] lg:max-w-5xl xl:max-w-6xl p-0 overflow-hidden rounded-3xl border-border/80 bg-card shadow-2xl">
          {selectedImage && (
            <div className="flex flex-col md:flex-row min-h-[500px]">
              {/* Image Preview Canvas */}
              <div className="relative flex min-h-[380px] max-h-[80vh] md:min-h-[550px] flex-1 items-center justify-center bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] bg-muted/30 p-4 md:p-6 overflow-auto group">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.name}
                  onClick={() => setIsZoomed(!isZoomed)}
                  className={`transition-all duration-300 rounded-xl shadow-lg cursor-pointer ${
                    isZoomed
                      ? "max-h-none max-w-none scale-125 cursor-zoom-out"
                      : "h-full w-full max-h-[72vh] object-contain cursor-zoom-in hover:scale-[1.01]"
                  }`}
                />

                {/* Floating Zoom Controls Overlay */}
                <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 rounded-xl bg-background/80 p-1.5 backdrop-blur-md border border-border/60 shadow-md">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsZoomed(!isZoomed)}
                    className="h-8 w-8 rounded-lg hover:bg-muted"
                    title={isZoomed ? "Zoom Out" : "Zoom In"}
                  >
                    {isZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsZoomed(!isZoomed)}
                    className="h-8 w-8 rounded-lg hover:bg-muted"
                    title={isZoomed ? "Fit to Screen" : "Expand"}
                  >
                    {isZoomed ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Detail Sidebar */}
              <div className="flex w-full md:w-80 lg:w-96 flex-col justify-between border-t md:border-t-0 md:border-l border-border/60 p-6 bg-card shrink-0">
                <div className="space-y-6">
                  <div>
                    <DialogHeader className="p-0 text-left">
                      <DialogTitle className="text-lg font-bold text-foreground break-all leading-snug">
                        {selectedImage.name}
                      </DialogTitle>
                    </DialogHeader>
                  </div>

                  {/* Metadata Table */}
                  <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">File Size</span>
                      <span className="font-semibold text-foreground">
                        {(selectedImage.size / 1024).toFixed(1)} KB
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">Format</span>
                      <span className="font-semibold text-foreground uppercase">
                        {selectedImage.name.split(".").pop()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1">
                      <span className="text-muted-foreground font-medium">Commit SHA</span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {selectedImage.sha.substring(0, 10)}
                      </span>
                    </div>
                  </div>

                  {/* Direct Link Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Direct URL</label>
                    <Input value={selectedImage.url} readOnly className="h-9 font-mono text-xs rounded-xl bg-muted/30 border-border/60" />
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2.5 pt-6 mt-4 border-t border-border/60">
                  <Button
                    variant="default"
                    onClick={(e) => copyLink(selectedImage.url, selectedImage.sha, e)}
                    className="w-full h-10 rounded-xl gap-2 shadow-md"
                  >
                    {copiedSha === selectedImage.sha ? (
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

                  <a href={selectedImage.url} target="_blank" rel="noopener noreferrer" className="block">
                    <Button variant="outline" className="w-full h-10 rounded-xl gap-2 border-border/80">
                      <ExternalLink className="h-4 w-4" />
                      Open Full Size
                    </Button>
                  </a>

                  {isBoss ? (
                    <Button
                      variant="destructive"
                      disabled={deletingSha === selectedImage.sha}
                      onClick={() => handleDelete(selectedImage)}
                      className="w-full h-10 rounded-xl gap-2 mt-1"
                    >
                      {deletingSha === selectedImage.sha ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Delete File
                    </Button>
                  ) : ""}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}



