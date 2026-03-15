"use client";

import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  ArchiveIcon,
  CodeIcon,
  DownloadIcon,
  FileIcon,
  FileTextIcon,
  ImageIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import {
  FilePreviewModal,
  type PreviewFile,
} from "@/components/file-preview-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SandboxFileEntry {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  downloadUrl: string;
}

function getFileIcon(contentType: string): LucideIcon {
  if (contentType.startsWith("image/")) return ImageIcon;
  if (contentType === "application/pdf") return FileTextIcon;
  if (
    contentType.includes("zip") ||
    contentType.includes("tar") ||
    contentType.includes("gzip")
  )
    return ArchiveIcon;
  if (
    contentType.startsWith("text/") ||
    contentType.includes("json") ||
    contentType.includes("xml") ||
    contentType.includes("javascript") ||
    contentType.includes("typescript") ||
    contentType.includes("python")
  )
    return CodeIcon;
  if (
    contentType.includes("word") ||
    contentType.includes("pdf") ||
    contentType.includes("spreadsheet") ||
    contentType.includes("presentation")
  )
    return FileTextIcon;
  return FileIcon;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function useChatFiles(chatId: string) {
  return useQuery<SandboxFileEntry[]>({
    queryKey: ["chat-files", chatId],
    queryFn: () =>
      fetch(`/api/chat/${chatId}/files`).then((r) => {
        if (!r.ok) throw new Error("Failed to fetch files");
        return r.json();
      }),
    refetchOnWindowFocus: false,
    staleTime: 0,
  });
}

export function ChatFilesPanel({
  chatId,
  open,
  onClose,
}: {
  chatId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data: files = [], isLoading } = useChatFiles(chatId);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  function openPreview(file: SandboxFileEntry) {
    setPreviewFile({
      url: file.downloadUrl,
      filename: file.filename,
      contentType: file.contentType,
      sizeBytes: file.sizeBytes,
    });
    setPreviewOpen(true);
  }

  return (
    <>
      <div
        className={cn(
          "flex h-full shrink-0 flex-col overflow-hidden border-l bg-background transition-[width] duration-200 ease-in-out",
          open ? "w-72" : "w-0 border-l-0",
        )}
      >
        <div className="flex h-full w-72 flex-col">
          {/* Header */}
          <div className="flex h-10 shrink-0 items-center justify-between border-b px-3">
            <span className="font-medium text-sm">Workspace files</span>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={onClose}
            >
              <XIcon className="size-3.5" />
            </Button>
          </div>

          {/* File list */}
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="space-y-2 p-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-lg bg-muted/60"
                  />
                ))}
              </div>
            ) : files.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                <FileIcon className="size-8 text-muted-foreground/40" />
                <p className="text-muted-foreground text-xs">
                  Files the agent writes to{" "}
                  <code className="rounded bg-muted px-1 font-mono text-[11px]">
                    /workspace
                  </code>{" "}
                  will appear here.
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {files.map((file) => {
                  const Icon = getFileIcon(file.contentType);
                  return (
                    <li key={file.id}>
                      <button
                        type="button"
                        onClick={() => openPreview(file)}
                        className="group flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted/60"
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">
                          <Icon className="size-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-sm leading-tight">
                            {file.filename}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {formatSize(file.sizeBytes)} ·{" "}
                            {formatDate(file.createdAt)}
                          </p>
                        </div>
                        <DownloadIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      <FilePreviewModal
        file={previewFile}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </>
  );
}
