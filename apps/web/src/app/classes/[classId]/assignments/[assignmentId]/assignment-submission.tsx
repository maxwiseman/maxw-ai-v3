"use client";

import {
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconChevronDown,
} from "@tabler/icons-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileUploadSubmission } from "./file-upload-submission";
import { SubmissionTypeSelector } from "./submission-type-selector";
import { TextEntrySubmission } from "./text-entry-submission";

const MIN_HEIGHT = 200;
const DEFAULT_HEIGHT = 400;

function getMaxHeight() {
  if (typeof window === "undefined") return 800;
  return window.innerHeight * 0.9;
}

interface ResizeHandleProps {
  isMaximized: boolean;
  isResizing: boolean;
  onResizeStart: (e: React.MouseEvent) => void;
}

const ResizeHandle = memo(function ResizeHandle({
  isMaximized,
  isResizing,
  onResizeStart,
}: ResizeHandleProps) {
  if (isMaximized) return null;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: This is a drag interaction for resizing
    <div
      onMouseDown={onResizeStart}
      className="-top-1.25 group absolute inset-x-0 flex h-2 cursor-ns-resize flex-col justify-center"
    >
      <div
        className={cn(
          "pointer-events-auto h-px w-full transition-all",
          isResizing
            ? "h-0.5 bg-primary"
            : "bg-border group-hover:h-0.5 group-hover:bg-primary/60",
        )}
      />
    </div>
  );
});

interface SubmissionHeaderProps {
  submissionType?: "text_entry" | "file_upload";
  isMaximized: boolean;
  isResizing: boolean;
  onCollapse: () => void;
  onToggleMaximize: () => void;
  onTypeChange: () => void;
  onResizeStart: (e: React.MouseEvent) => void;
}

const SubmissionHeader = memo(function SubmissionHeader({
  submissionType,
  isMaximized,
  isResizing,
  onCollapse,
  onToggleMaximize,
  onTypeChange,
  onResizeStart,
}: SubmissionHeaderProps) {
  return (
    <div className="relative flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-3">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onCollapse();
          }}
          variant="ghost"
          size="icon"
          className="h-8 w-8"
        >
          <IconChevronDown className="size-4" />
        </Button>
        <span className="font-medium">Submit Assignment</span>
        {submissionType && (
          <>
            <span className="text-muted-foreground">•</span>
            <Button
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onTypeChange();
              }}
              className="h-auto p-0 font-normal text-muted-foreground hover:bg-transparent!"
            >
              {submissionType === "text_entry" ? "Text Entry" : "File Upload"}
            </Button>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onToggleMaximize();
          }}
          variant="ghost"
          size="icon"
          className="h-8 w-8"
        >
          {isMaximized ? (
            <IconArrowsMinimize className="size-4" />
          ) : (
            <IconArrowsMaximize className="size-4" />
          )}
        </Button>
      </div>
      <ResizeHandle
        isMaximized={isMaximized}
        isResizing={isResizing}
        onResizeStart={onResizeStart}
      />
    </div>
  );
});

export default function AssignmentSubmission() {
  const [expanded, setExpanded] = useState(false);
  const [submissionType, setSubmissionType] = useState<
    undefined | "text_entry" | "file_upload"
  >(undefined);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);
  const isResizingRef = useRef(false);
  const maxHeightRef = useRef(getMaxHeight());
  const rafIdRef = useRef<number | null>(null);

  // Update max height on window resize (throttled)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const updateMaxHeight = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        maxHeightRef.current = getMaxHeight();
      }, 150);
    };
    window.addEventListener("resize", updateMaxHeight);
    return () => {
      window.removeEventListener("resize", updateMaxHeight);
      clearTimeout(timeoutId);
    };
  }, []);

  const handleResize = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current || !panelRef.current) return;

    // Cancel any pending animation frame
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    // Use requestAnimationFrame for smooth updates
    rafIdRef.current = requestAnimationFrame(() => {
      if (!panelRef.current || !isResizingRef.current) return;

      const deltaY = startYRef.current - e.clientY;
      const newHeight = Math.max(
        MIN_HEIGHT,
        Math.min(maxHeightRef.current, startHeightRef.current + deltaY),
      );

      // Update DOM directly for smooth dragging
      panelRef.current.style.height = `${newHeight}px`;
      panelRef.current.style.maxHeight = `${maxHeightRef.current}px`;
    });
  }, []);

  const handleResizeEnd = useCallback(() => {
    if (!isResizingRef.current) return;

    // Cancel any pending animation frame
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Sync state with actual DOM height
    if (panelRef.current) {
      const actualHeight = panelRef.current.offsetHeight;
      setHeight(actualHeight);
    }

    isResizingRef.current = false;
    setIsResizing(false);
    document.removeEventListener("mousemove", handleResize);
    document.removeEventListener("mouseup", handleResizeEnd);
  }, [handleResize]);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (!panelRef.current) return;

      isResizingRef.current = true;
      setIsResizing(true);
      startYRef.current = e.clientY;
      startHeightRef.current = panelRef.current.offsetHeight;

      document.addEventListener("mousemove", handleResize);
      document.addEventListener("mouseup", handleResizeEnd);
    },
    [handleResize, handleResizeEnd],
  );

  const toggleMaximize = useCallback(() => {
    setIsMaximized((prev) => {
      if (prev) {
        setHeight(DEFAULT_HEIGHT);
        return false;
      }
      setHeight(maxHeightRef.current);
      return true;
    });
  }, []);

  const handleCollapse = useCallback(() => {
    setExpanded(false);
    setSubmissionType(undefined);
    setIsMaximized(false);
    setHeight(DEFAULT_HEIGHT);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        setUploadedFiles((prev) => [...prev, ...files]);
      }
    },
    [],
  );

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      setUploadedFiles((prev) => [...prev, ...files]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileRemove = useCallback((index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleTypeChange = useCallback(() => {
    setSubmissionType(undefined);
  }, []);

  // Cleanup event listeners and animation frames
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleResize);
      document.removeEventListener("mouseup", handleResizeEnd);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [handleResize, handleResizeEnd]);

  const panelStyle = useMemo(
    () => ({
      height: isMaximized ? "100vh" : `${height}px`,
      maxHeight: isMaximized ? "100vh" : `${maxHeightRef.current}px`,
    }),
    [isMaximized, height],
  );

  // Collapsed state - just show Submit button
  if (!expanded) {
    return (
      <div className="sticky bottom-0 z-40 w-full border-t bg-background shadow-lg transition-all">
        <Button
          onClick={() => setExpanded(true)}
          className="w-full rounded-none"
          size="lg"
        >
          Submit Assignment
        </Button>
      </div>
    );
  }

  // Expanded state - show panel
  return (
    <div
      ref={panelRef}
      className={cn(
        "sticky bottom-0 z-50 flex w-full flex-col border-t bg-background shadow-2xl transition-all duration-300 ease-out",
        isMaximized && "fixed right-0 bottom-0 h-full",
        isResizing && "transition-none", // Disable transitions during resize for smooth dragging
      )}
      style={panelStyle}
    >
      <SubmissionHeader
        submissionType={submissionType}
        isMaximized={isMaximized}
        isResizing={isResizing}
        onCollapse={handleCollapse}
        onToggleMaximize={toggleMaximize}
        onTypeChange={handleTypeChange}
        onResizeStart={handleResizeStart}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {submissionType === undefined ? (
          <SubmissionTypeSelector
            onSelectType={(type) => setSubmissionType(type)}
          />
        ) : submissionType === "text_entry" ? (
          <TextEntrySubmission onCancel={() => setSubmissionType(undefined)} />
        ) : (
          <FileUploadSubmission
            files={uploadedFiles}
            isDragging={isDragging}
            onFileSelect={handleFileSelect}
            onDrop={handleFileDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onFileRemove={handleFileRemove}
            onCancel={() => {
              setSubmissionType(undefined);
              setUploadedFiles([]);
            }}
          />
        )}
      </div>
    </div>
  );
}
