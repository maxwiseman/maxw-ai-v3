"use client";

import {
  IconBrain,
  IconHome,
  IconListCheck,
  IconMenu2,
  IconMessageCircle,
  IconSchool,
} from "@tabler/icons-react";
import type { RouteType } from "next/dist/lib/load-custom-routes";
import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";

// Context for sidebar extension (for class-specific navigation)
type MobileNavExtensionContextData = {
  node: React.ReactNode;
  setNode: Dispatch<SetStateAction<React.ReactNode>>;
};

const MobileNavExtensionContext = createContext<MobileNavExtensionContextData>({
  node: null,
  setNode: () => {},
});

export function MobileNavExtension({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setNode } = useContext(MobileNavExtensionContext);

  useEffect(() => {
    setNode(children);
    return () => {
      setNode(null);
    };
  }, [children, setNode]);

  return null;
}

export function MobileNavExtensionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [node, setNode] = useState<React.ReactNode>(null);

  return (
    <MobileNavExtensionContext.Provider value={{ node, setNode }}>
      {children}
    </MobileNavExtensionContext.Provider>
  );
}

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { node: extensionNode } = useContext(MobileNavExtensionContext);

  const navItems: Array<{
    icon: React.ReactNode;
    href: LinkProps<RouteType>["href"];
    label: string;
    isActive: boolean;
  }> = [
    {
      icon: <IconHome className="size-5" />,
      href: "/",
      label: "Home",
      isActive: pathname === "/",
    },
    {
      icon: <IconMessageCircle className="size-5" />,
      href: "/chat",
      label: "Chat",
      isActive: pathname === "/chat",
    },
    {
      icon: <IconSchool className="size-5" />,
      href: "/classes",
      label: "Classes",
      isActive: pathname.startsWith("/classes"),
    },
    {
      icon: <IconBrain className="size-5" />,
      href: "/study",
      label: "Study",
      isActive: pathname.startsWith("/study"),
    },
    {
      icon: <IconListCheck className="size-5" />,
      href: "/todo",
      label: "Todo List",
      isActive: pathname.startsWith("/todo"),
    },
  ];

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <IconMenu2 className="size-5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetHeader className="border-b p-4">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 p-4">
            {navItems.map((item, index) => (
              <Button
                key={index}
                variant={item.isActive ? "secondary" : "ghost"}
                className="justify-start gap-3"
                asChild
              >
                <Link href={item.href} onClick={() => setOpen(false)} prefetch>
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </Button>
            ))}
          </nav>
          {extensionNode && (
            <>
              <Separator />
              <div className="p-4">{extensionNode}</div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
