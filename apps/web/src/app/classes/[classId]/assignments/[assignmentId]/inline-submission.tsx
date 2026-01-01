"use client";

import { IconLayoutBottombarExpand } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { FileUploadSubmission } from "./file-upload-submission";
import { useSubmissionStore } from "./submission-store";
import { SubmissionTypeSelector } from "./submission-type-selector";
import { TextEntrySubmission } from "./text-entry-submission";

interface InlineSubmissionProps {
  classId: string;
  assignmentId: string;
  submissionTypes: string[];
}

export function InlineSubmission({
  classId,
  assignmentId,
  submissionTypes,
}: InlineSubmissionProps) {
  const submissionType = useSubmissionStore((state) => state.submissionType);
  const setSubmissionType = useSubmissionStore(
    (state) => state.setSubmissionType,
  );
  const setMode = useSubmissionStore((state) => state.setMode);
  const uploadedFiles = useSubmissionStore((state) => state.uploadedFiles);
  const isDragging = useSubmissionStore((state) => state.isDragging);
  const addFiles = useSubmissionStore((state) => state.addFiles);
  const removeFile = useSubmissionStore((state) => state.removeFile);
  const setIsDragging = useSubmissionStore((state) => state.setIsDragging);
  const reset = useSubmissionStore((state) => state.reset);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      addFiles(files);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      addFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleSuccess = () => {
    reset();
  };

  return (
    <div className="mt-8 border-t px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-lg">Submit Assignment</h2>
          {submissionType && (
            <>
              <span className="text-muted-foreground">•</span>
              <Button
                variant="ghost"
                onClick={() => setSubmissionType(undefined)}
                className="h-auto p-0 font-normal text-muted-foreground hover:bg-transparent!"
              >
                {submissionType === "text_entry" ? "Text Entry" : "File Upload"}
              </Button>
            </>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMode("floating")}
          className="gap-2"
        >
          <IconLayoutBottombarExpand className="size-4" />
          Pop out
        </Button>
      </div>

      {submissionType === undefined ? (
        <SubmissionTypeSelector
          submissionTypes={submissionTypes}
          onSelectType={(type) => setSubmissionType(type)}
        />
      ) : submissionType === "text_entry" ? (
        <TextEntrySubmission
          classId={classId}
          assignmentId={assignmentId}
          onCancel={() => setSubmissionType(undefined)}
          onSuccess={handleSuccess}
        />
      ) : (
        <FileUploadSubmission
          classId={classId}
          assignmentId={assignmentId}
          files={uploadedFiles}
          isDragging={isDragging}
          onFileSelect={handleFileSelect}
          onDrop={handleFileDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onFileRemove={removeFile}
          onCancel={() => {
            setSubmissionType(undefined);
            reset();
          }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
