"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface TextEntrySubmissionProps {
  onCancel: () => void;
}

export function TextEntrySubmission({ onCancel }: TextEntrySubmissionProps) {
  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex-1">
        <Textarea
          placeholder="Type your response here..."
          className="h-full min-h-[300px] resize-none border-0 p-6 text-base focus-visible:ring-0"
        />
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button>Submit</Button>
      </div>
    </div>
  );
}

