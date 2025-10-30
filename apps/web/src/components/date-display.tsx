"use client";

import type { ComponentProps } from "react";

export function DateDisplay({
  date,
  options,
  ...props
}: {
  date?: Date | string | number;
  options?: Intl.DateTimeFormatOptions;
} & Omit<ComponentProps<"div">, "children">) {
  if (!date) return null;
  if (typeof date === "string" && date === "") return null;
  if (typeof date === "number" && (date === 0 || Number.isNaN(date)))
    return null;
  const newDate = new Date(date);

  const isServer = typeof window === "undefined";
  return (
    <span {...props}>
      {newDate.toLocaleString(isServer ? "en-us" : undefined, {
        timeZone: isServer ? "America/New_York" : undefined,
        ...options,
      })}
    </span>
  );
}
