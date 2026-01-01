"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitTextEntry } from "./submission-actions";
import { useSubmissionStore } from "./submission-store";

interface TextEntrySubmissionProps {
  classId: string;
  assignmentId: string;
  onCancel: () => void;
  onSuccess?: () => void;
}

export function TextEntrySubmission({
  classId,
  assignmentId,
  onCancel,
  onSuccess,
}: TextEntrySubmissionProps) {
  const textContent = useSubmissionStore((state) => state.textContent);
  const setTextContent = useSubmissionStore((state) => state.setTextContent);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!textContent.trim()) {
      toast.error("Please enter your response");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitTextEntry({
        classId,
        assignmentId,
        body: textContent.trim(),
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
    <div className="flex h-full flex-col p-6">
      <div className="flex-1">
        <Textarea
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          placeholder="Type your response here..."
          className="h-full min-h-75 resize-none border-0 p-6 text-base focus-visible:ring-0"
          disabled={isSubmitting}
        />
      </div>
      <div className="mt-6 flex justify-end gap-2 border-t pt-6">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !textContent.trim()}
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </div>
  );
}
