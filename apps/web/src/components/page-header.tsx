import { cn } from "@/lib/utils";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "./ui/item";
import type { ComponentProps } from "react";

export function PageHeader({
  className,
  ...props
}: ComponentProps<typeof Item>) {
  return (
    <Item
      className={cn("p-8 flex items-center border-0 border-border", className)}
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
      className={cn("text-4xl font-medium font-serif", className)}
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
