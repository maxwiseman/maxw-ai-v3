import {
  IconDownload,
  IconFile,
  IconFileTypePdf,
  IconMusic,
  IconPhoto,
  IconVideo,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import type { CanvasFile } from "@/types/canvas";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeClass }: { mimeClass: string }) {
  if (mimeClass === "image")
    return <IconPhoto className="size-12 text-muted-foreground" />;
  if (mimeClass === "pdf")
    return <IconFileTypePdf className="size-12 text-muted-foreground" />;
  if (mimeClass === "video")
    return <IconVideo className="size-12 text-muted-foreground" />;
  if (mimeClass === "audio")
    return <IconMusic className="size-12 text-muted-foreground" />;
  return <IconFile className="size-12 text-muted-foreground" />;
}

export function CanvasFilePreview({ file }: { file: CanvasFile }) {
  const isImage =
    file.mime_class === "image" || file.content_type?.startsWith("image/");
  const isPdf =
    file.mime_class === "pdf" || file.content_type === "application/pdf";
  const isVideo =
    file.mime_class === "video" || file.content_type?.startsWith("video/");
  const isAudio =
    file.mime_class === "audio" || file.content_type?.startsWith("audio/");

  return (
    <div className="flex flex-col gap-6">
      {/* Preview area */}
      {isImage && (
        <div className="flex items-center justify-center overflow-hidden rounded-lg bg-muted/40">
          {/* biome-ignore lint/performance/noImgElement: proxied through our API */}
          <img
            src={`/api/canvas-file/${file.id}`}
            alt={file.display_name}
            className="max-h-[60vh] max-w-full object-contain"
          />
        </div>
      )}
      {isPdf && (
        <iframe
          src={`/api/canvas-file/${file.id}`}
          title={file.display_name}
          className="h-[60vh] w-full rounded-lg border"
        />
      )}
      {isVideo && (
        <div className="overflow-hidden rounded-lg bg-black">
          {/* biome-ignore lint/a11y/useMediaCaption: Canvas file captions not available */}
          <video
            src={`/api/canvas-file/${file.id}`}
            controls
            className="max-h-[60vh] w-full"
          />
        </div>
      )}
      {isAudio && (
        <div className="flex items-center justify-center rounded-lg bg-muted/40 p-8">
          {/* biome-ignore lint/a11y/useMediaCaption: Canvas file captions not available */}
          <audio
            src={`/api/canvas-file/${file.id}`}
            controls
            className="w-full"
          />
        </div>
      )}
      {!isImage && !isPdf && !isVideo && !isAudio && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg bg-muted/40 py-12">
          <FileIcon mimeClass={file.mime_class} />
          <span className="text-muted-foreground text-sm">
            {file.content_type}
          </span>
        </div>
      )}

      {/* File metadata + download */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{file.display_name}</span>
          <span className="text-muted-foreground text-sm">
            {file.content_type} &middot; {formatSize(file.size)}
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
