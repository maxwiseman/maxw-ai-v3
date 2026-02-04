import {
  IconBell,
  IconBlocks,
  IconHome,
  IconPencil,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentProps, use } from "react";
import { MobileNavExtension } from "@/components/mobile-nav";
import { SidebarExtension } from "@/components/sidebar";
import { Button } from "@/components/ui/button";

export function ClassSidebar({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const classId = use(params).classId;

  const content = (
    <div className="flex w-3xs flex-col gap-2 p-4">
      <ClassSidebarButton path={{ slug: "", strict: true }} classId={classId}>
        <IconHome className="text-muted-foreground" />
        Home
      </ClassSidebarButton>
      <ClassSidebarButton path={{ slug: "/modules" }} classId={classId}>
        <IconBlocks className="text-muted-foreground" />
        Modules
      </ClassSidebarButton>
      <ClassSidebarButton path={{ slug: "/assignments" }} classId={classId}>
        <IconPencil className="text-muted-foreground" />
        Assignments
      </ClassSidebarButton>
      <ClassSidebarButton path={{ slug: "/announcements" }} classId={classId}>
        <IconBell className="text-muted-foreground" />
        Announcements
      </ClassSidebarButton>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <SidebarExtension>{content}</SidebarExtension>
      {/* Mobile navigation */}
      <MobileNavExtension>
        <div className="flex flex-col gap-2">
          <div className="mb-2 font-medium text-sm">Class Menu</div>
          <ClassSidebarButton
            path={{ slug: "", strict: true }}
            classId={classId}
          >
            <IconHome className="text-muted-foreground" />
            Home
          </ClassSidebarButton>
          <ClassSidebarButton path={{ slug: "/modules" }} classId={classId}>
            <IconBlocks className="text-muted-foreground" />
            Modules
          </ClassSidebarButton>
          <ClassSidebarButton path={{ slug: "/assignments" }} classId={classId}>
            <IconPencil className="text-muted-foreground" />
            Assignments
          </ClassSidebarButton>
          <ClassSidebarButton
            path={{ slug: "/announcements" }}
            classId={classId}
          >
            <IconBell className="text-muted-foreground" />
            Announcements
          </ClassSidebarButton>
        </div>
      </MobileNavExtension>
    </>
  );
}

function ClassSidebarButton({
  path,
  children,
  classId,
}: {
  path: { strict?: boolean; slug: string };
  classId: string;
} & ComponentProps<"div">) {
  const pathname = usePathname();
  const isActive =
    path.strict === false
      ? pathname.startsWith(`/classes/${classId}${path.slug}`)
      : pathname === `/classes/${classId}${path.slug}`;

  return (
    <Button
      asChild
      className="justify-start shadow-none"
      variant={isActive ? "secondary" : "ghost"}
    >
      <Link prefetch href={`/classes/${classId}${path.slug}`}>
        {children}
      </Link>
    </Button>
  );
}
