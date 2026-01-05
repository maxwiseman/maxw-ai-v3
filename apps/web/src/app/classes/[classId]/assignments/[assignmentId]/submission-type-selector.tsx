"use client";

import { IconFileUpload, IconTextResize } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

interface SubmissionTypeSelectorProps {
  onSelectType: (type: "text_entry" | "file_upload") => void;
  submissionTypes: readonly string[];
}

export function SubmissionTypeSelector({
  onSelectType,
  submissionTypes,
}: SubmissionTypeSelectorProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8">
      <div className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
        <Button
          disabled={!submissionTypes.includes("text_entry")}
          className="flex h-auto flex-col gap-0 p-8"
          variant="outline"
          onClick={() => onSelectType("text_entry")}
        >
          <IconTextResize className="mb-2 size-8" />
          <span className="font-medium text-base">Text Entry</span>
          <span className="text-muted-foreground text-sm">
            Write your response directly
          </span>
        </Button>
        <Button
          disabled={!submissionTypes.includes("online_upload")}
          className="flex h-auto flex-col gap-0 p-8"
          variant="outline"
          onClick={() => onSelectType("file_upload")}
        >
          <IconFileUpload className="mb-2 size-8" />
          <span className="font-medium text-base">File Upload</span>
          <span className="text-muted-foreground text-sm">
            Upload documents or files
          </span>
        </Button>
      </div>
    </div>
  );
}
