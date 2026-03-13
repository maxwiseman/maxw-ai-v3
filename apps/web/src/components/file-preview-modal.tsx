"use client";

import {
  IconDownload,
  IconFile,
  IconFileTypePdf,
  IconMusic,
  IconPhoto,
  IconVideo,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export interface PreviewFile {
  url: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getLanguage(filename: string, contentType: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const extMap: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    jsx: "jsx",
    tsx: "tsx",
    py: "python",
    json: "json",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    sh: "bash",
    bash: "bash",
    md: "markdown",
    csv: "plaintext",
    txt: "plaintext",
    html: "html",
    htm: "html",
    css: "css",
    sql: "sql",
    rs: "rust",
    go: "go",
    java: "java",
    rb: "ruby",
    php: "php",
    c: "c",
    cpp: "cpp",
    h: "c",
  };
  if (extMap[ext]) return extMap[ext];
  if (contentType.includes("json")) return "json";
  if (contentType.includes("xml")) return "xml";
  if (contentType.includes("html")) return "html";
  if (contentType.includes("javascript")) return "javascript";
  if (contentType.includes("typescript")) return "typescript";
  if (contentType.includes("python")) return "python";
  return "plaintext";
}

const TEXT_SIZE_LIMIT = 500 * 1024; // 500 KB

function isTextType(contentType: string): boolean {
  return (
    contentType.startsWith("text/") ||
    contentType.includes("json") ||
    contentType.includes("xml") ||
    contentType.includes("javascript") ||
    contentType.includes("typescript") ||
    contentType.includes("python") ||
    contentType.includes("yaml") ||
    contentType.includes("x-sh")
  );
}

function TypeIcon({ contentType }: { contentType: string }) {
  if (contentType.startsWith("image/"))
    return <IconPhoto className="size-12 text-muted-foreground" />;
  if (contentType === "application/pdf")
    return <IconFileTypePdf className="size-12 text-muted-foreground" />;
  if (contentType.startsWith("video/"))
    return <IconVideo className="size-12 text-muted-foreground" />;
  if (contentType.startsWith("audio/"))
    return <IconMusic className="size-12 text-muted-foreground" />;
  return <IconFile className="size-12 text-muted-foreground" />;
}

function FilePreviewBody({ file }: { file: PreviewFile }) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  const isImage = file.contentType.startsWith("image/");
  const isPdf = file.contentType === "application/pdf";
  const isVideo = file.contentType.startsWith("video/");
  const isAudio = file.contentType.startsWith("audio/");
  const isText = isTextType(file.contentType);
  const tooBigForText = file.sizeBytes > TEXT_SIZE_LIMIT;

  // Fetch PDF into a local blob URL so the browser always renders it inline,
  // regardless of Content-Disposition headers on the server response.
  useEffect(() => {
    if (!isPdf) return;
    let objectUrl: string | null = null;
    fetch(file.url)
      .then((r) => r.blob())
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(objectUrl);
      })
      .catch(() => setPdfBlobUrl(null));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setPdfBlobUrl(null);
    };
  }, [file.url, isPdf]);

  useEffect(() => {
    if (!isText || tooBigForText) return;
    setTextLoading(true);
    fetch(file.url)
      .then((r) => r.text())
      .then((t) => setTextContent(t))
      .catch(() => setTextContent(null))
      .finally(() => setTextLoading(false));
  }, [file.url, isText, tooBigForText]);

  return (
    <div className="flex flex-col gap-6">
      {/* Preview area */}
      {isImage && (
        <div className="flex max-h-[60vh] items-center justify-center overflow-hidden rounded-lg bg-muted/40">
          {/* biome-ignore lint/performance/noImgElement: proxied through our API */}
          <img
            src={file.url}
            alt={file.filename}
            className="max-h-[60vh] max-w-full object-contain"
          />
        </div>
      )}

      {isPdf && (
        <div className="h-[60vh] w-full overflow-hidden rounded-lg border">
          {pdfBlobUrl ? (
            <iframe
              src={pdfBlobUrl}
              title={file.filename}
              className="h-full w-full"
            />
          ) : (
            <div className="flex h-full flex-col gap-2 p-4">
              {[...Array(6)].map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          )}
        </div>
      )}

      {isVideo && (
        <div className="overflow-hidden rounded-lg bg-black">
          {/* biome-ignore lint/a11y/useMediaCaption: captions not available */}
          <video src={file.url} controls className="max-h-[60vh] w-full" />
        </div>
      )}

      {isAudio && (
        <div className="flex items-center justify-center rounded-lg bg-muted/40 p-8">
          {/* biome-ignore lint/a11y/useMediaCaption: captions not available */}
          <audio src={file.url} controls className="w-full" />
        </div>
      )}

      {isText && !tooBigForText && (
        <div className="max-h-[60vh] overflow-auto rounded-lg border text-xs">
          {textLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-3 w-full" />
              ))}
            </div>
          ) : textContent !== null ? (
            <CodeBlock
              code={textContent}
              language={getLanguage(file.filename, file.contentType)}
            />
          ) : (
            <p className="p-4 text-muted-foreground text-sm">
              Could not load file content.
            </p>
          )}
        </div>
      )}

      {isText && tooBigForText && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg bg-muted/40 py-12">
          <TypeIcon contentType={file.contentType} />
          <span className="text-muted-foreground text-sm">
            File too large to preview ({formatSize(file.sizeBytes)})
          </span>
        </div>
      )}

      {!isImage && !isPdf && !isVideo && !isAudio && !isText && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg bg-muted/40 py-12">
          <TypeIcon contentType={file.contentType} />
          <span className="text-muted-foreground text-sm">
            {file.contentType}
          </span>
        </div>
      )}

      {/* Metadata + download */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{file.filename}</span>
          <span className="text-muted-foreground text-sm">
            {file.contentType} &middot; {formatSize(file.sizeBytes)}
          </span>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <a href={file.url} download={file.filename}>
            <IconDownload />
            Download
          </a>
        </Button>
      </div>
    </div>
  );
}

interface FilePreviewModalProps {
  file: PreviewFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilePreviewModal({
  file,
  open,
  onOpenChange,
}: FilePreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{file?.filename ?? "File"}</DialogTitle>
        </DialogHeader>
        {file ? (
          <FilePreviewBody file={file} />
        ) : (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-64 w-full rounded-lg" />
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
