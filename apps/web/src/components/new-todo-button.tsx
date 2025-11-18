"use client";

import { IconPlus } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { generateTodo } from "@/app/actions/generate-todo";
import { cn } from "@/lib/utils";
import { DatePicker } from "./date-picker";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Field, FieldContent, FieldGroup, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

export function TodoButton({ context }: { context: string }) {
  const [open, setOpen] = useState(false);
  const { data, isPending, mutate } = useMutation({
    mutationFn: generateTodo,
    mutationKey: ["todo-autofill", context],
  });

  console.log(data);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        onClick={() => {
          if (data === undefined) {
            mutate(context);
          }
        }}
        asChild
      >
        <Button variant="outline">
          <IconPlus className="text-muted-foreground" />
          Add todo
        </Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          "h-auto overflow-clip transition-[height] duration-300",
          isPending && "h-48",
        )}
      >
        <DialogHeader>
          <DialogTitle>New Todo</DialogTitle>
          <DialogDescription>We'll remind you when it's time</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-2 **:gap-2">
          <Field>
            <FieldLabel>Title</FieldLabel>
            <FieldContent>
              <Input
                defaultValue={data?.title}
                placeholder="Type something..."
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>Notes</FieldLabel>
            <FieldContent>
              <Textarea
                className="wrap-break-word"
                defaultValue={data?.notes ?? ""}
                placeholder="Type something..."
              />
            </FieldContent>
          </Field>
          <FieldGroup className="flex-row">
            <Field>
              <FieldLabel>Date</FieldLabel>
              <FieldContent>
                <DatePicker className="w-auto" mode="single" />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Due Date</FieldLabel>
              <FieldContent>
                <DatePicker className="w-auto" mode="single" />
              </FieldContent>
            </Field>
          </FieldGroup>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button>Add</Button>
        </DialogFooter>
        <div
          className={cn(
            "pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background font-medium text-lg opacity-0 transition-opacity duration-300",
            isPending && "pointer-events-auto opacity-100",
          )}
        >
          Generating...
        </div>
      </DialogContent>
    </Dialog>
  );
}
