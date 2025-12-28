/** biome-ignore-all lint/correctness/useUniqueElementIds: <explanation> */
"use client";

import {
  IconCards,
  IconCheckbox,
  IconPencil,
  IconPlus,
} from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
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

const chartData = [
  { browser: "safari", visitors: 75, fill: "var(--color-safari)" },
];
const chartConfig = {
  visitors: {
    label: "Visitors",
  },
  safari: {
    label: "Safari",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export default function StudyPage() {
  return (
    <div className="mx-auto w-full">
      <PageHeader className="mb-8 border-border border-b">
        <PageHeaderContent>
          <PageHeaderTitle>Study Sets</PageHeaderTitle>
          <PageHeaderDescription>
            Refine your knowledge and improve your scores
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild variant="outline">
            <Link href="/study/new">
              <IconPlus />
              New study set
            </Link>
          </Button>
        </PageHeaderActions>
      </PageHeader>
      {/* <div className="mb-8 border-b p-8 flex justify-between">
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
      </div> */}
      <div className="space-y-8 px-8">
        <div className="flex flex-col gap-2">
          <div className="font-medium text-lg">Continue Studying</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StudySetCard
              numberOfQuestions={104}
              numberOfTerms={0}
              tags={[]}
              id="1"
              title="Science Bowl Practice"
            />
            <Card className="size-full flex-row items-start justify-between gap-0 p-0">
              <div className="w-max grow">
                <CardHeader className="block w-full p-4 pb-0">
                  <CardTitle className="font-normal text-lg">
                    3 hours studied this week
                  </CardTitle>
                </CardHeader>
                <CardContent className="!pt-0 w-full p-4">
                  <div className="text-muted-foreground">20% of your goal</div>
                </CardContent>
              </div>
              <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square h-full"
              >
                <RadialBarChart
                  data={chartData}
                  startAngle={90}
                  endAngle={450}
                  innerRadius={18}
                  outerRadius={24}
                  className="[&_.recharts-radial-bar-background_*]:!fill-none/50"
                >
                  <PolarAngleAxis
                    type="number"
                    domain={[0, 100]}
                    angleAxisId={0}
                    tick={false}
                    axisLine={false}
                  />
                  <RadialBar
                    stackId="a"
                    dataKey="visitors"
                    background
                    cornerRadius={10}
                  />
                </RadialBarChart>
              </ChartContainer>
            </Card>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="font-medium text-lg">Explore</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <Card className="flex h-auto cursor-pointer flex-col items-start gap-0 p-0">
            <CardHeader className="block w-full p-4 pb-0">
              <CardTitle className="font-normal text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent className="!pt-0 w-full p-4">
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
                <SelectItem value="short-answer">
                  <IconPencil className="size-4 text-muted-foreground" />
                  Short Answer
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
                {tags.map((tag) => (
                  <DropdownMenuCheckboxItem
                    key={tag}
                    onSelect={(e) => {
                      e.preventDefault();
                      if (activeTags.includes(tag)) {
                        setActiveTags((prev) =>
                          prev.filter((val) => val !== tag),
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
