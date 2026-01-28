"use client";

import {
  IconBook,
  IconBrain,
  IconDeviceDesktop,
  IconFile,
  IconHome,
  IconListCheck,
  IconMessageCircle,
  IconMoon,
  IconSchool,
  IconSearch,
  IconSun,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useState } from "react";
import { queryCanvasIndex } from "@/ai/utils/upstash-helpers";
import { getDashboardData } from "@/app/actions/dashboard";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "./ui/button";
import { Kbd } from "./ui/kbd";

type StaticItem = {
  id: string;
  label: string;
  keywords?: string[];
  icon: React.ReactNode;
  onSelect: () => void;
  shortcut?: React.ReactNode;
};

function matchesQuery(item: StaticItem, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const labelMatch = item.label.toLowerCase().includes(q);
  const keywordMatch = item.keywords?.some((k) => k.toLowerCase().includes(q));
  return labelMatch || !!keywordMatch;
}

export function SearchCommand() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const router = useRouter();
  const { setTheme, theme } = useTheme();

  // Fetch user's classes for navigation
  const { data: dashboardData } = useQuery({
    queryKey: ["dashboard-data"],
    queryFn: getDashboardData,
    staleTime: 1000 * 60 * 5,
  });

  // Search results from Upstash
  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => queryCanvasIndex(debouncedQuery),
    enabled: debouncedQuery.length > 2,
    staleTime: 1000 * 60,
  });

  // Show loading when query is being debounced or when fetching
  const isLoading =
    (query.length > 2 && query !== debouncedQuery) || isSearching;

  // Keyboard shortcut to open command palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const classes =
    dashboardData && "courses" in dashboardData
      ? (dashboardData.courses ?? [])
      : [];

  // Define static items
  const pages: StaticItem[] = useMemo(
    () => [
      {
        id: "home",
        label: "Home",
        keywords: ["dashboard", "main"],
        icon: <IconHome className="size-4" />,
        onSelect: () => runCommand(() => router.push("/")),
      },
      {
        id: "chat",
        label: "Chat",
        keywords: ["ai", "assistant", "message"],
        icon: <IconMessageCircle className="size-4" />,
        onSelect: () => runCommand(() => router.push("/chat")),
      },
      {
        id: "classes",
        label: "Classes",
        keywords: ["courses", "school"],
        icon: <IconSchool className="size-4" />,
        onSelect: () => runCommand(() => router.push("/classes")),
      },
      {
        id: "study",
        label: "Study",
        keywords: ["flashcards", "learn", "review"],
        icon: <IconBrain className="size-4" />,
        onSelect: () => runCommand(() => router.push("/study")),
      },
      {
        id: "todo",
        label: "Todo",
        keywords: ["tasks", "checklist", "assignments"],
        icon: <IconListCheck className="size-4" />,
        onSelect: () => runCommand(() => router.push("/todo")),
      },
    ],
    [runCommand, router],
  );

  const actions: StaticItem[] = useMemo(
    () => [
      {
        id: "light-mode",
        label: "Light Mode",
        keywords: ["theme", "bright", "day"],
        icon: <IconSun className="size-4" />,
        onSelect: () => runCommand(() => setTheme("light")),
        shortcut:
          theme === "light" ? <CommandShortcut>Active</CommandShortcut> : null,
      },
      {
        id: "dark-mode",
        label: "Dark Mode",
        keywords: ["theme", "night"],
        icon: <IconMoon className="size-4" />,
        onSelect: () => runCommand(() => setTheme("dark")),
        shortcut:
          theme === "dark" ? <CommandShortcut>Active</CommandShortcut> : null,
      },
      {
        id: "system-theme",
        label: "System Theme",
        keywords: ["theme", "auto", "automatic"],
        icon: <IconDeviceDesktop className="size-4" />,
        onSelect: () => runCommand(() => setTheme("system")),
        shortcut:
          theme === "system" ? <CommandShortcut>Active</CommandShortcut> : null,
      },
    ],
    [runCommand, setTheme, theme],
  );

  const classItems: StaticItem[] = useMemo(
    () =>
      classes.map((course) => ({
        id: `class-${course.id}`,
        label: course.name,
        keywords: ["course", "class"],
        icon: <IconSchool className="size-4" />,
        onSelect: () => runCommand(() => router.push(`/classes/${course.id}`)),
      })),
    [classes, runCommand, router],
  );

  // Filter items based on query
  const filteredPages = useMemo(
    () => pages.filter((item) => matchesQuery(item, query)),
    [pages, query],
  );
  const filteredActions = useMemo(
    () => actions.filter((item) => matchesQuery(item, query)),
    [actions, query],
  );
  const filteredClasses = useMemo(
    () => classItems.filter((item) => matchesQuery(item, query)),
    [classItems, query],
  );

  // Check if we have any matching static items
  const hasMatchingStaticItems =
    filteredPages.length > 0 ||
    filteredActions.length > 0 ||
    filteredClasses.length > 0;

  // When there's a query, show matching static items first
  const showStaticFirst = query.length > 0 && hasMatchingStaticItems;

  const renderStaticItems = () => (
    <>
      {filteredPages.length > 0 && (
        <CommandGroup heading="Pages">
          {filteredPages.map((item) => (
            <CommandItem key={item.id} onSelect={item.onSelect}>
              {item.icon}
              <span>{item.label}</span>
              {item.shortcut}
            </CommandItem>
          ))}
        </CommandGroup>
      )}

      {filteredClasses.length > 0 && (
        <CommandGroup heading="Classes">
          {filteredClasses.map((item) => (
            <CommandItem key={item.id} onSelect={item.onSelect}>
              {item.icon}
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      )}

      {filteredActions.length > 0 && (
        <>
          {(filteredPages.length > 0 || filteredClasses.length > 0) && (
            <CommandSeparator />
          )}
          <CommandGroup heading="Actions">
            {filteredActions.map((item) => (
              <CommandItem key={item.id} onSelect={item.onSelect}>
                {item.icon}
                <span>{item.label}</span>
                {item.shortcut}
              </CommandItem>
            ))}
          </CommandGroup>
        </>
      )}
    </>
  );

  const renderSearchResults = () =>
    searchResults &&
    searchResults.length > 0 && (
      <CommandGroup heading="Search Results">
        {searchResults.map((result) => {
          const content = result.content as Record<string, unknown>;
          const metadata = result.metadata as Record<string, unknown>;
          const name =
            (content.name as string) || (content.title as string) || "Untitled";
          const type = metadata.type as string;
          const classId = metadata.classId as number;
          const id = result.id;

          const classFriendlyName = classes.find((c) => c.id === classId)?.name;

          // Extract the actual ID from the stored ID (e.g., "assignment-123" -> "123")
          const actualId = id.split("-").slice(1).join("-").split("-")[0];

          return (
            <CommandItem
              key={id}
              onSelect={() =>
                runCommand(() => {
                  if (type === "assignment") {
                    router.push(`/classes/${classId}/assignments/${actualId}`);
                  } else if (type === "page") {
                    router.push(`/classes/${classId}/pages/${actualId}`);
                  } else {
                    router.push(`/classes/${classId}`);
                  }
                })
              }
            >
              {type === "assignment" ? (
                <IconBook className="size-4" />
              ) : (
                <IconFile className="size-4" />
              )}
              <div className="flex flex-col">
                <span>{name}</span>
                <span className="text-muted-foreground text-xs">
                  {classFriendlyName ?? (content.className as string)}
                </span>
              </div>
            </CommandItem>
          );
        })}
      </CommandGroup>
    );

  return (
    <>
      <Button
        variant="outline"
        type="button"
        onClick={() => setOpen(true)}
        // className="relative hidden h-9 w-64 items-center justify-start gap-2 rounded-md border border-input bg-transparent px-3 text-muted-foreground text-sm shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground sm:flex"
        className="border-none font-normal text-muted-foreground shadow-none"
      >
        <IconSearch className="size-4" />
        <span>Find anything...</span>
        <Kbd className="ml-4 rounded-[5px] border">⌘K</Kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Search for anything or navigate to a page"
        shouldFilter={false}
      >
        <CommandInput
          placeholder="Search Canvas content, pages, or actions..."
          value={query}
          onValueChange={setQuery}
          isLoading={isLoading}
        />
        <CommandList className="h-[300px]">
          <CommandEmpty>
            {isLoading ? "Searching..." : "No results found."}
          </CommandEmpty>

          {showStaticFirst ? (
            <>
              {renderStaticItems()}
              {renderSearchResults()}
            </>
          ) : (
            <>
              {renderSearchResults()}
              {renderStaticItems()}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
