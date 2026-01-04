"use client";

import type { CanvasAssignment } from "@/types/canvas";
import { FloatingSubmission } from "./floating-submission";
import { InlineSubmission } from "./inline-submission";
import { useSubmissionStore } from "./submission-store";

interface SubmissionProviderProps {
  classId: string;
  assignmentId: string;
  submissionTypes: CanvasAssignment["submission_types"];
}

export function SubmissionProvider({
  classId,
  assignmentId,
  submissionTypes,
}: SubmissionProviderProps) {
  const mode = useSubmissionStore((state) => state.mode);

  return (
    <>
      {mode === "inline" ? (
        <InlineSubmission
          classId={classId}
          assignmentId={assignmentId}
          submissionTypes={submissionTypes}
        />
      ) : (
        <>
          {/* Placeholder button in inline position when floating */}
          {/*<div className="mt-8 border-t pt-6">
            <Button
              variant="outline"
              onClick={() => setMode("inline")}
              className="w-full gap-2"
            >
              <IconChevronDown className="size-4" />
              Dock to bottom
            </Button>
          </div>*/}
          {/* Floating panel rendered in-place with sticky positioning */}
          <FloatingSubmission
            classId={classId}
            assignmentId={assignmentId}
            submissionTypes={submissionTypes}
          />
        </>
      )}
    </>
  );
}
