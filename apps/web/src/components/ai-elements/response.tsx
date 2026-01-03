"use client";

import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(
  ({ className, children, ...props }: ResponseProps) => (
    <Streamdown
      className={cn(
        "streamdown-content size-full **:leading-7 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
      {...props}
    >
      {children
        ?.replaceAll("\\(", "$$$$")
        .replaceAll("\\)", "$$$$")
        .replaceAll("\\[", "$$$$")
        .replaceAll("\\]", "$$$$")}
    </Streamdown>
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);

Response.displayName = "Response";
