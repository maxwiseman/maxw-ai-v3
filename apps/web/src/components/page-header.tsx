import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "./ui/item";

export function PageHeader({
  className,
  ...props
}: ComponentProps<typeof Item>) {
  return (
    <Item
      className={cn("flex items-center border-0 border-border p-8", className)}
      {...props}
    />
  );
}

export function PageHeaderTitle({
  className,
  ...props
}: ComponentProps<typeof Item>) {
  return (
    <ItemTitle
      className={cn("font-medium font-serif text-4xl", className)}
      {...props}
    />
  );
}

export function PageHeaderDescription({
  className,
  ...props
}: ComponentProps<typeof Item>) {
  return <ItemDescription className={cn("text-base", className)} {...props} />;
}

export const PageHeaderContent = ItemContent;
export const PageHeaderActions = ItemActions;
export const PageHeaderMedia = ItemMedia;
