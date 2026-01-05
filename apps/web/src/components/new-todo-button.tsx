"use client";

import { IconPlus } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  type GenerateTodoInput,
  generateTodo,
} from "@/app/actions/generate-todo";
import { useCreateTodo } from "@/app/todo/use-todos";
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
import { Spinner } from "./ui/spinner";
import { Textarea } from "./ui/textarea";

export function TodoButton({
  name,
  dueDate,
  description,
  assignmentId,
  classId,
}: GenerateTodoInput & { assignmentId: number; classId: number }) {
  const [open, setOpen] = useState(false);
  const createTodo = useCreateTodo();
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [taskDueDate, setTaskDueDate] = useState<Date | undefined>();
  const [subTasks, setSubTasks] = useState<string[]>([]);

  const { data, isPending, mutate } = useMutation({
    mutationFn: generateTodo,
    mutationKey: ["todo-autofill", name],
  });

  // Update form state when generated data arrives
  useEffect(() => {
    if (data) {
      setTitle(data.title);
      // setNotes(data.notes ?? "");
      setDate(data.date);
      setTaskDueDate(data.dueDate);
      setSubTasks(data.subTasks);
    }
  }, [data]);

  const handleAdd = () => {
    setSubmitting(true);
    createTodo({
      insertIntoDb: true,
      title,
      description: notes || null,
      scheduledDate: date ?? null,
      dueDate: taskDueDate ?? null,
      subTasks:
        subTasks.length > 0
          ? subTasks.map((st) => ({
              id: crypto.randomUUID(),
              title: st,
              checked: false,
            }))
          : null,
      canvasContentType: "assignment",
      canvasClassId: classId,
      canvasContentId: assignmentId,
    }).then(() => {
      setSubmitting(false);
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        onClick={() => {
          if (data === undefined) {
            mutate({ name, dueDate, description });
          }
        }}
        asChild
      >
        <Button variant="outline">
          {submitting ? (
            <Spinner className="text-muted-foreground" />
          ) : (
            <IconPlus className="text-muted-foreground" />
          )}
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
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Type something..."
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>Notes</FieldLabel>
            <FieldContent>
              <Textarea
                className="w-full max-w-full resize-y break-all"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Type something..."
              />
            </FieldContent>
          </Field>
          <FieldGroup className="flex-row">
            <Field>
              <FieldLabel>Date</FieldLabel>
              <FieldContent>
                <DatePicker
                  className="w-auto"
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Due Date</FieldLabel>
              <FieldContent>
                <DatePicker
                  className="w-auto"
                  mode="single"
                  selected={taskDueDate}
                  onSelect={setTaskDueDate}
                />
              </FieldContent>
            </Field>
          </FieldGroup>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleAdd}>Add</Button>
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
