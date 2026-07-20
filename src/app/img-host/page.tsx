"use client";

import { useEffect, useState } from "react";
import { Upload, Copy, Check, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FileUpload from "@/components/comp-549";
import type { FileWithPreview } from "@/hooks/use-file-upload";

export default function ImageUploadPage() {
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [existingNames, setExistingNames] = useState<string[]>([]);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const refreshExistingImages = async () => {
    try {
      const res = await fetch("/api/images");
      const data = await res.json();
      if (data.success && Array.isArray(data.images)) {
        setExistingNames(data.images.map((img: { name: string }) => img.name.toLowerCase()));
      }
    } catch (err) {
      console.error("Failed to load existing image list:", err);
    }
  };

  useEffect(() => {
    refreshExistingImages();
  }, []);

  const handleFilesChange = (files: FileWithPreview[]) => {
    setSelectedFiles(files);
    setImageUrl("");

    if (files.length > 0 && files[0].file) {
      const fileName = files[0].file.name.toLowerCase();
      if (existingNames.includes(fileName)) {
        const msg = `An image named "${files[0].file.name}" already exists in the repository. Please edit the filename stem above.`;
        setDuplicateError(msg);
        toast.error(msg);
        return;
      }
    }
    setDuplicateError(null);
  };

  const handleUpload = async () => {
    const selected = selectedFiles[0];
    if (!selected || !(selected.file instanceof File)) {
      toast.error("Please select an image first.");
      return;
    }

    if (duplicateError) {
      toast.error(duplicateError);
      return;
    }

    try {
      setIsUploading(true);
      setImageUrl("");

      const formData = new FormData();
      formData.append("file", selected.file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to upload image."
        );
      }

      setImageUrl(result.url);
      toast.success("Image uploaded successfully.");
      refreshExistingImages();
    } catch (error) {
      console.error("Upload failed:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to upload image."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopy = async () => {
    if (!imageUrl) return;

    await navigator.clipboard.writeText(imageUrl);

    setCopied(true);
    toast.success("Image URL copied.");

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const hasFile = selectedFiles.length > 0 && selectedFiles[0].file instanceof File;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Image Upload
        </h1>
        <p className="text-muted-foreground mt-1">
          Upload an image and generate a direct image URL.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Image</CardTitle>
          <CardDescription>
            Select or drag & drop an image to upload to the Elysian Coffee image repository.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <FileUpload
            accept="image/*"
            maxSize={5 * 1024 * 1024}
            maxFiles={1}
            multiple={false}
            label="Upload image"
            description="Drag & drop your image here, or click to browse"
            disabled={isUploading}
            onFilesChange={handleFilesChange}
          />

          {duplicateError && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{duplicateError}</span>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!hasFile || isUploading || !!duplicateError}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Image
              </>
            )}
          </Button>

          {imageUrl && (
            <div className="space-y-3 rounded-lg border p-4">
              <div>
                <p className="font-medium">
                  Upload Successful
                </p>

                <p className="text-sm text-muted-foreground">
                  Your direct image URL is ready.
                </p>
              </div>

              <div className="flex gap-2">
                <Input
                  value={imageUrl}
                  readOnly
                />

                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="rounded-lg border bg-muted/20 p-4">
                <img
                  src={imageUrl}
                  alt="Uploaded image"
                  className="max-h-[400px] max-w-full mx-auto object-contain rounded-md"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
