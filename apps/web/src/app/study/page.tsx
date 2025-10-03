"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  IconCards,
  IconCheckbox,
  IconKeyboard,
  IconPlus,
} from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";

export default function StudyPage() {
  return (
    <div className="mx-auto w-full">
      <div className="mb-8 border-b p-8 flex justify-between">
        <div>
          <h1 className="text-4xl font-medium font-serif">Study Sets</h1>
          <p className="text-muted-foreground">
            Refine your knowledge and improve your scores
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/study/new">
            <IconPlus />
            New study set
          </Link>
        </Button>
      </div>
      <div className="px-8 space-y-8">
        <div className="flex flex-col gap-2">
          <div className="font-medium text-lg">Continue Studying</div>
          <div className="grid grid-cols-3 gap-4">
            <StudySetCard
              numberOfQuestions={104}
              numberOfTerms={0}
              tags={[]}
              id="1"
              title="Science Bowl Practice"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="font-medium text-lg">Explore</div>
          <div className="grid grid-cols-3 gap-4">
            <StudySetCard
              tags={["Math", "Earth and Space", "Biology"]}
              numberOfQuestions={104}
              numberOfTerms={0}
              id="1"
              title="Science Bowl Practice"
            />
            <StudySetCard
              numberOfQuestions={105}
              numberOfTerms={10}
              tags={[]}
              id="2"
              title="ACT Practice"
            />
            <StudySetCard
              numberOfQuestions={50}
              numberOfTerms={50}
              tags={[]}
              id="3"
              title="SAT Practice"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StudySetCard({
  children,
  title,
  tags,
  numberOfTerms,
  numberOfQuestions,
  id,
}: {
  children?: React.ReactNode;
  title: string;
  tags: string[];
  numberOfTerms: number;
  numberOfQuestions: number;
  id: string;
}) {
  const [mode, setMode] = useState("flashcards");
  const [activeTags, setActiveTags] = useState(tags);
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild className="text-left">
        <Button variant="outline" asChild>
          <Card className="p-0 flex flex-col gap-0 h-auto items-start cursor-pointer">
            <CardHeader className="p-4 pb-0 block">
              <CardTitle className="text-lg font-normal">{title}</CardTitle>
            </CardHeader>
            <CardContent className="!pt-0 p-4">
              <div className="text-muted-foreground">
                {numberOfQuestions} questions, {numberOfTerms} terms
              </div>
              {children}
            </CardContent>
          </Card>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="gap-1">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>How do you want to study?</DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex flex-col gap-6">
          <div>
            <Label className="mb-2">Game mode</Label>
            <Select
              value={mode}
              onValueChange={setMode}
              defaultValue="flashcards"
            >
              <SelectTrigger>
                <SelectValue placeholder="Study mode..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flashcards">
                  <IconCards className="size-4 text-muted-foreground" />
                  Flashcards
                </SelectItem>
                <SelectItem value="typing">
                  <IconKeyboard className="size-4 text-muted-foreground" />
                  Typing
                </SelectItem>
                <SelectItem value="multiple-choice">
                  <IconCheckbox className="size-4 text-muted-foreground" />
                  Multiple Choice
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2">Active Items</Label>
            <DropdownMenu>
              <DropdownMenuTrigger disabled={tags.length < 1} asChild>
                <Button variant={"outline"}>
                  {tags.length === activeTags.length
                    ? "All items"
                    : `${activeTags.length} tag${
                        activeTags.length > 1 ? "s" : ""
                      } selected`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {tags.map((tag, i) => (
                  <DropdownMenuCheckboxItem
                    key={`${tag}-${i}`}
                    onSelect={(e) => {
                      e.preventDefault();
                      if (activeTags.includes(tag)) {
                        setActiveTags((prev) =>
                          prev.filter((val) => val !== tag)
                        );
                      } else {
                        setActiveTags((prev) => [...prev, tag]);
                      }
                    }}
                    checked={activeTags.includes(tag)}
                  >
                    {tag}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <DialogFooter>
          <Button asChild>
            <Link
              prefetch
              href={`/study/${id}?mode=${mode}&tags=${activeTags.join(",")}`}
            >
              Start
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
