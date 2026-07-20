"use client";

import {
  AlertCircleIcon,
  FileArchiveIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FileUpIcon,
  HeadphonesIcon,
  ImageIcon,
  PencilIcon,
  VideoIcon,
  XIcon,
} from "lucide-react";

import {
  formatBytes,
  useFileUpload,
  type FileMetadata,
  type FileWithPreview,
} from "@/hooks/use-file-upload";
import { Button } from "@/components/ui/button";

export interface FileUploadProps {
  initialFiles?: FileMetadata[];
  maxSize?: number;
  maxFiles?: number;
  accept?: string;
  multiple?: boolean;
  onFilesChange?: (files: FileWithPreview[]) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}

const getFileIcon = (file: FileWithPreview) => {
  const fileObj = file.file;
  const fileType = fileObj.type || "";
  const fileName = fileObj.name || "";

  if (file.preview && fileType.startsWith("image/")) {
    return (
      <img
        src={file.preview}
        alt={fileName}
        className="size-full object-cover rounded"
      />
    );
  }

  if (
    fileType.includes("pdf") ||
    fileName.endsWith(".pdf") ||
    fileType.includes("word") ||
    fileName.endsWith(".doc") ||
    fileName.endsWith(".docx")
  ) {
    return <FileTextIcon className="size-4 opacity-60" />;
  }
  if (
    fileType.includes("zip") ||
    fileType.includes("archive") ||
    fileName.endsWith(".zip") ||
    fileName.endsWith(".rar")
  ) {
    return <FileArchiveIcon className="size-4 opacity-60" />;
  }
  if (
    fileType.includes("excel") ||
    fileName.endsWith(".xls") ||
    fileName.endsWith(".xlsx")
  ) {
    return <FileSpreadsheetIcon className="size-4 opacity-60" />;
  }
  if (fileType.includes("video/")) {
    return <VideoIcon className="size-4 opacity-60" />;
  }
  if (fileType.includes("audio/")) {
    return <HeadphonesIcon className="size-4 opacity-60" />;
  }
  if (fileType.startsWith("image/")) {
    return <ImageIcon className="size-4 opacity-60" />;
  }
  return <FileIcon className="size-4 opacity-60" />;
};

export default function FileUpload({
  initialFiles = [],
  maxSize = 5 * 1024 * 1024,
  maxFiles = 1,
  accept = "image/*",
  multiple = false,
  onFilesChange,
  disabled = false,
  label = "Upload file",
  description = "Drag & drop or click to browse",
}: FileUploadProps) {
  const [
    { files, isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      clearFiles,
      getInputProps,
      updateFileName,
    },
  ] = useFileUpload({
    initialFiles,
    maxFiles,
    maxSize,
    accept,
    multiple,
    onFilesChange,
  });

  return (
    <div className="flex flex-col gap-2">
      {/* Drop area */}
      <div
        className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-input border-dashed p-4 transition-colors hover:bg-accent/50 has-disabled:pointer-events-none has-[input:focus]:border-ring has-disabled:opacity-50 has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 data-[dragging=true]:bg-accent/50 cursor-pointer"
        data-dragging={isDragging || undefined}
        onClick={disabled ? undefined : openFileDialog}
        onDragEnter={disabled ? undefined : handleDragEnter}
        onDragLeave={disabled ? undefined : handleDragLeave}
        onDragOver={disabled ? undefined : handleDragOver}
        onDrop={disabled ? undefined : handleDrop}
        role="button"
        tabIndex={-1}
      >
        <input
          {...getInputProps()}
          disabled={disabled}
          aria-label={label}
          className="sr-only"
        />

        <div className="flex flex-col items-center justify-center text-center">
          <div
            aria-hidden="true"
            className="mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border bg-background"
          >
            <FileUpIcon className="size-4 opacity-60" />
          </div>
          <p className="mb-1.5 font-medium text-sm">{label}</p>
          <p className="mb-2 text-muted-foreground text-xs">
            {description}
          </p>
          <div className="flex flex-wrap justify-center gap-1 text-muted-foreground/70 text-xs">
            <span>{accept === "image/*" ? "Images only" : "All files"}</span>
            <span>∙</span>
            <span>Max {maxFiles} {maxFiles === 1 ? "file" : "files"}</span>
            <span>∙</span>
            <span>Up to {formatBytes(maxSize)}</span>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div
          className="flex items-center gap-1 text-destructive text-xs"
          role="alert"
        >
          <AlertCircleIcon className="size-3 shrink-0" />
          <span>{errors[0]}</span>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => {
            const fileName = file.file.name;
            const lastDotIndex = fileName.lastIndexOf(".");
            const stem = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
            const ext = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : "";

            return (
              <div
                className="flex items-center justify-between gap-2 rounded-lg border bg-background p-2 pe-3"
                key={file.id}
              >
                <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                  <div className="flex aspect-square size-10 shrink-0 items-center justify-center rounded border overflow-hidden">
                    {getFileIcon(file)}
                  </div>
                  <div className="flex min-w-0 flex-col gap-1 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="relative flex-1 min-w-0 flex items-center">
                        <input
                          type="text"
                          value={stem}
                          onChange={(e) => updateFileName(file.id, e.target.value)}
                          disabled={disabled}
                          className="h-7 w-full pl-2 pr-6 font-medium text-[13px] bg-background border border-input rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          placeholder="File name"
                          title="Click to edit file name before submit"
                        />
                        <PencilIcon className="size-3 text-muted-foreground/60 absolute right-2 pointer-events-none" />
                      </div>
                      {ext && (
                        <span className="text-muted-foreground text-xs font-mono shrink-0 select-none bg-muted/50 px-1.5 py-0.5 rounded border border-border/50">
                          {ext}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {formatBytes(file.file.size)}
                    </p>
                  </div>
                </div>

                {!disabled && (
                  <Button
                    aria-label="Remove file"
                    className="-me-2 size-8 text-muted-foreground/80 hover:bg-transparent hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.id);
                    }}
                    size="icon"
                    variant="ghost"
                    type="button"
                  >
                    <XIcon aria-hidden="true" className="size-4" />
                  </Button>
                )}
              </div>
            );
          })}

          {/* Remove all files button */}
          {files.length > 1 && !disabled && (
            <div>
              <Button onClick={clearFiles} size="sm" variant="outline" type="button">
                Remove all files
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


