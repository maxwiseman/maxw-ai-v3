"use client";

import { IconFileUpload, IconX } from "@tabler/icons-react";
import { memo, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { submitFileUpload } from "./submission-actions";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface FileItemProps {
  file: File;
  onRemove: () => void;
}

const FileItem = memo(function FileItem({ file, onRemove }: FileItemProps) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-background p-3">
      <div className="flex items-center gap-3">
        <IconFileUpload className="size-5 text-muted-foreground" />
        <div>
          <p className="font-medium text-sm">{file.name}</p>
          <p className="text-muted-foreground text-xs">
            {formatFileSize(file.size)}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onRemove}
      >
        <IconX className="size-4" />
      </Button>
    </div>
  );
});

interface FileUploadAreaProps {
  files: File[];
  isDragging: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileRemove: (index: number) => void;
}

const FileUploadArea = memo(function FileUploadArea({
  files,
  isDragging,
  onFileSelect,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileRemove,
}: FileUploadAreaProps) {
  const fileInputId = useMemo(() => `file-input-${Math.random()}`, []);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: This is just a drag interaction, it's ok
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={cn(
        "flex min-h-75 flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors",
        files.length === 0
          ? isDragging
            ? "border-primary bg-primary/10"
            : "border-muted-foreground/25 bg-muted/10"
          : "border-primary/50 bg-primary/5",
      )}
    >
      {files.length === 0 ? (
        <div className="flex flex-col items-center gap-4 p-8 text-center">
          <IconFileUpload className="size-12 text-muted-foreground" />
          <div>
            <p className="font-medium">
              Drag and drop files here, or click to browse
            </p>
            <p className="text-muted-foreground text-sm">
              Supported formats: PDF, DOC, DOCX, images, and more
            </p>
          </div>
          <label htmlFor={fileInputId}>
            <Input
              id={fileInputId}
              type="file"
              multiple
              onChange={onFileSelect}
              className="hidden"
            />
            <Button variant="outline" asChild>
              <span>Choose Files</span>
            </Button>
          </label>
        </div>
      ) : (
        <div className="w-full p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-medium">
              {files.length} file{files.length !== 1 ? "s" : ""} selected
            </p>
            <label htmlFor={`${fileInputId}-add`}>
              <Input
                id={`${fileInputId}-add`}
                type="file"
                multiple
                onChange={onFileSelect}
                className="hidden"
              />
              <Button variant="outline" size="sm" asChild>
                <span>Add More</span>
              </Button>
            </label>
          </div>
          <div className="space-y-2">
            {files.map((file, index) => (
              <FileItem
                key={`${file.name}-${file.size}-${index}`}
                file={file}
                onRemove={() => onFileRemove(index)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

interface FileUploadSubmissionProps {
  classId: string;
  assignmentId: string;
  files: File[];
  isDragging: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileRemove: (index: number) => void;
  onCancel: () => void;
  onSuccess?: () => void;
}

export function FileUploadSubmission({
  classId,
  assignmentId,
  files,
  isDragging,
  onFileSelect,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileRemove,
  onCancel,
  onSuccess,
}: FileUploadSubmissionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error("Please select at least one file");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitFileUpload({
        classId,
        assignmentId,
        files,
      });

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Assignment submitted successfully!");
        onSuccess?.();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit assignment",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col p-0">
      <div className="flex-1">
        <FileUploadArea
          files={files}
          isDragging={isDragging}
          onFileSelect={onFileSelect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onFileRemove={onFileRemove}
        />
      </div>
      <div className="mt-6 flex justify-end gap-2 border-t pt-6">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || files.length === 0}
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </div>
  );
}
