"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function DatePicker({
  className,
  ...props
}: React.ComponentProps<typeof Calendar>) {
  // @ts-expect-error -- This is fine as long as there's a mode selected
  const [date, setDate] = React.useState<Date | DateRange>(props.selected);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-empty={!date}
          className={cn(
            "w-70 justify-start text-left font-normal data-[empty=true]:text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon />
          {date ? (
            "from" in date ? (
              [
                date.from ? format(date.from, "MMM do") : undefined,
                date.to ? format(date.to, "MMM do") : undefined,
              ].join(" - ")
            ) : (
              format(date, "PPP")
            )
          ) : (
            <span>Pick a date</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        {/*@ts-expect-error*/}
        <Calendar {...props} selected={date} onSelect={setDate} />
      </PopoverContent>
    </Popover>
  );
}
