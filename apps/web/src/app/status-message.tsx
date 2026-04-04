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
          setIsLoading(false);
          return;
        }

        setIsLoading(false);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;
          const chunk = decoder.decode(value, { stream: true });
          setContent((prev) => (prev ?? "") + chunk);
        }
      } catch {
        setIsLoading(false);
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
      className="text-neutral-500 dark:text-neutral-400 [&>p]:m-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_strong]:font-medium [&_strong]:text-foreground"
    >
      {content}
    </Streamdown>
  );
}
