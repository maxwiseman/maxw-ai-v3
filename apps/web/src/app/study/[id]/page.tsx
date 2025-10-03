"use client";
import { Button } from "@/components/ui/button";
import { IconDotsVertical, IconSettings } from "@tabler/icons-react";
import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringEnum,
  useQueryState,
} from "nuqs";
import { Flashcards } from "./flashcards";

export default function Page() {
  const [tags, setTags] = useQueryState("tags", parseAsArrayOf(parseAsString));
  const [mode, setMode] = useQueryState(
    "mode",
    parseAsStringEnum(["flashcards", "typing", "multiple-choice"])
  );

  if (mode === "flashcards") return <Flashcards />;

  return (
    <div className="relative h-full flex flex-col justify-center items-center">
      <div>{mode}</div>
      <div>{tags?.join(", ")}</div>
      <Button size="icon" variant="outline" className="absolute top-4 right-4">
        <IconSettings />
      </Button>
    </div>
  );
}
