"use client";

import { type ReactNode, useState } from "react";
import { getCanvasFile } from "@/app/classes/classes-actions";
import { CanvasFilePreview } from "@/components/canvas-file-preview";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { File } from "@maxw-ai/canvas";

interface CanvasFileModalProps {
  courseId: string;
  fileId: string;
  children: ReactNode;
}

export function CanvasFileModal({
  courseId,
  fileId,
  children,
}: CanvasFileModalProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen && !file) {
      setLoading(true);
      try {
        const data = await getCanvasFile({ classId: courseId, fileId });
        if (typeof data !== "string") setFile(data);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <button
        type="button"
        className="cursor-pointer underline underline-offset-2"
        onClick={() => handleOpenChange(true)}
      >
        {children}
      </button>
      <DialogContent className="md:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{file?.display_name ?? "File"}</DialogTitle>
        </DialogHeader>
        {loading && (
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
        {!loading && file && <CanvasFilePreview file={file} />}
        {!loading && !file && open && (
          <p className="text-muted-foreground text-sm">
            Could not load file. It may be locked or unavailable.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
