import { SidebarExtension } from "@/components/sidebar";

export function ClassSidebarPlaceholder() {
  return (
    <SidebarExtension>
      <div className="flex w-3xs flex-col gap-2 p-4">
        <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
      </div>
    </SidebarExtension>
  );
}
