"use client";

import type { ToolUIPart } from "ai";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  DownloadIcon,
  FileIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { isValidElement, useState } from "react";
import {
  FilePreviewModal,
  type PreviewFile,
} from "@/components/file-preview-modal";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "../ui/card";
import { CodeBlock } from "./code-block";
import { Response } from "./response";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn("not-prose mb-4 w-full rounded-md border", className)}
    {...props}
  />
);

export type ToolHeaderProps = {
  title?: string;
  type: ToolUIPart["type"];
  state: ToolUIPart["state"];
  className?: string;
};

const getStatusBadge = (status: ToolUIPart["state"]) => {
  const labels: Record<ToolUIPart["state"], string> = {
    "input-streaming": "Pending",
    "input-available": "Running",
    "output-available": "Completed",
    "output-error": "Error",
    "approval-requested": "Awaiting Approval",
    "approval-responded": "Approved",
    "output-denied": "Denied",
  };

  const icons: Record<ToolUIPart["state"], React.ReactNode> = {
    "input-streaming": <CircleIcon className="size-4" />,
    "input-available": <ClockIcon className="size-4 animate-pulse" />,
    "output-available": <CheckCircleIcon className="size-4 text-green-600" />,
    "output-error": <XCircleIcon className="size-4 text-red-600" />,
    "approval-requested": <ClockIcon className="size-4" />,
    "approval-responded": <CheckCircleIcon className="size-4 text-green-600" />,
    "output-denied": <XCircleIcon className="size-4 text-red-600" />,
  };

  return (
    <Badge className="gap-1.5 rounded-full text-xs" variant="secondary">
      {icons[status]}
      {labels[status]}
    </Badge>
  );
};

export const ToolHeader = ({
  className,
  title,
  type,
  state,
  ...props
}: ToolHeaderProps) => (
  <CollapsibleTrigger
    className={cn(
      "flex w-full items-center justify-between gap-4 p-3",
      className,
    )}
    {...props}
  >
    <div className="flex items-center gap-2">
      <WrenchIcon className="size-4 text-muted-foreground" />
      <span className="font-medium text-sm">
        {title ?? type.split("-").slice(1).join("-")}
      </span>
      {getStatusBadge(state)}
    </div>
    <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
  </CollapsibleTrigger>
);

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className,
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolUIPart["input"];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn("space-y-2 overflow-hidden p-4", className)} {...props}>
    <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
      Parameters
    </h4>
    <div className="rounded-md bg-muted/50">
      <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
    </div>
  </div>
);

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ToolUIPart["output"];
  errorText: ToolUIPart["errorText"];
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  let Output = <div>{output as ReactNode}</div>;

  if (typeof output === "object" && !isValidElement(output)) {
    Output = (
      <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />
    );
  } else if (typeof output === "string") {
    Output = <CodeBlock code={output} language="json" />;
  }

  return (
    <div className={cn("space-y-2 p-4", className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {errorText ? "Error" : "Result"}
      </h4>
      <div
        className={cn(
          "overflow-x-auto rounded-md text-xs [&_table]:w-full",
          errorText
            ? "bg-destructive/10 text-destructive"
            : "bg-muted/50 text-foreground",
        )}
      >
        {errorText && <div>{errorText}</div>}
        {Output}
      </div>
    </div>
  );
};

export function UpdatePlanCard({ part }: { part: ToolUIPart }) {
  const { content } = part.input as { content: string };
  return (
    <Card className="max-h-80 overflow-scroll p-8">
      <CardContent className="p-0">
        <Response>{content}</Response>
      </CardContent>
    </Card>
  );
}

export function ShareFileCard({ part }: { part: ToolUIPart }) {
  const [previewOpen, setPreviewOpen] = useState(false);

  if (part.state !== "output-available" || !part.output) return null;

  const output = part.output as {
    url: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
  };

  if (typeof output !== "object" || !output.url) return null;

  const sizeLabel =
    output.sizeBytes < 1024
      ? `${output.sizeBytes} B`
      : output.sizeBytes < 1024 * 1024
        ? `${(output.sizeBytes / 1024).toFixed(1)} KB`
        : `${(output.sizeBytes / (1024 * 1024)).toFixed(1)} MB`;

  const previewFile: PreviewFile = {
    url: output.url,
    filename: output.filename,
    contentType: output.contentType,
    sizeBytes: output.sizeBytes,
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="flex w-full items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-left transition-colors hover:bg-muted"
      >
        <FileIcon className="size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground text-sm">
            {output.filename}
          </p>
          <p className="text-muted-foreground text-xs">{sizeLabel}</p>
        </div>
        <DownloadIcon className="size-4 shrink-0 text-muted-foreground" />
      </button>

      <FilePreviewModal
        file={previewFile}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </>
  );
}
