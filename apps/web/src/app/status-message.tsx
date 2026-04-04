"use client";

import { useEffect, useState } from "react";
import { Streamdown } from "streamdown";

export function StatusMessage() {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchStatus() {
      try {
        const response = await fetch("/api/status-message");
        if (!response.ok || !response.body) {
          if (!cancelled) setIsLoading(false);
          return;
        }

        if (!cancelled) setIsLoading(false);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let isFirstChunk = true;

        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;
          const chunk = decoder.decode(value, { stream: true });
          // First chunk replaces any stale content (handles router cache re-activation
          // and React Strict Mode double-invocation without duplicating text)
          if (isFirstChunk) {
            setContent(chunk);
            isFirstChunk = false;
          } else {
            setContent((prev) => (prev ?? "") + chunk);
          }
        }
      } catch {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-3.5 w-full animate-pulse rounded-sm bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-3.5 w-4/5 animate-pulse rounded-sm bg-neutral-200 dark:bg-neutral-800" />
      </div>
    );
  }

  if (!content) return null;

  return (
    <Streamdown
      className="text-neutral-500 dark:text-neutral-400 [&>p]:m-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 **:data-[streamdown='strong']:font-medium **:data-[streamdown='strong']:text-foreground"
    >
      {content}
    </Streamdown>
  );
}
