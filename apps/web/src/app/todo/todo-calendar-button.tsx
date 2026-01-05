"use client";

import {
  type Icon,
  IconArchive,
  IconCalendar,
  IconMoon,
  IconStack2,
  IconStar,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, humanReadableDate } from "@/lib/utils";

type DateType = "calendar" | "calendarEvening" | "anytime" | "someday";

const quickPicks = {
  calendar: {
    icon: IconStar,
    label: "Today",
  },
  calendarEvening: {
    icon: IconMoon,
    label: "Evening",
  },
  anytime: {
    icon: IconStack2,
    label: "Anytime",
  },
  someday: {
    icon: IconArchive,
    label: "Someday",
  },
} as const satisfies Record<DateType, { icon: Icon; label: string }>;

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getDisplayText(dateType: DateType | null, scheduledDate: Date | null) {
  if (!dateType) return "";

  const today = new Date();

  if (dateType === "anytime") return "Anytime";
  if (dateType === "someday") return "Someday";

  const isToday = Boolean(
    scheduledDate && isSameLocalDay(scheduledDate, today),
  );

  if (dateType === "calendarEvening" && isToday) return "This Evening";
  if (dateType === "calendar" && isToday) return "Today";

  if (dateType === "calendarEvening" && scheduledDate) {
    return `${humanReadableDate(scheduledDate)} Evening`;
  }

  if (scheduledDate) return humanReadableDate(scheduledDate);

  return "";
}

export function TodoDatePicker({
  icon: IconComponent,
  dateType,
  scheduledDate,
  onValueChange,
}: {
  icon?: Icon;
  dateType: DateType | null;
  scheduledDate: Date | null;
  onValueChange: (dateType: DateType, scheduledDate: Date | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const displayText = getDisplayText(dateType, scheduledDate);
  const hasValue = dateType && dateType !== "anytime";

  const DisplayIcon = useMemo<Icon | undefined>(() => {
    if (!dateType) return IconComponent;

    // Anytime should show the prop icon (calendar) so the row stays consistent.
    if (dateType === "anytime") return IconComponent;

    // For explicit quick picks, use their icons.
    if (dateType === "someday") return quickPicks.someday.icon;
    if (dateType === "calendarEvening") return quickPicks.calendarEvening.icon;

    if (dateType === "calendar") {
      // For "calendar", show the star when it's today, otherwise show a calendar icon.
      const today = new Date();
      const isToday = Boolean(
        scheduledDate && isSameLocalDay(scheduledDate, today),
      );
      return isToday ? quickPicks.calendar.icon : IconCalendar;
    }

    return IconComponent;
  }, [dateType, scheduledDate, IconComponent]);

  const handleQuickPick = (type: DateType, date: Date | null) => {
    onValueChange(type, date);
    setOpen(false);
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      onValueChange("calendar", date);
      setOpen(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            "h-8 w-8 max-w-8 justify-start gap-2 overflow-clip p-2! text-muted-foreground transition-[width,max-width]",
            hasValue && "w-auto max-w-max",
          )}
          size="sm"
          variant="ghost"
        >
          {DisplayIcon && <DisplayIcon />}
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-auto flex-row p-0">
        <div className="flex flex-col gap-1 border-r p-2">
          <Button
            variant="ghost"
            size="sm"
            className="justify-start pr-10!"
            onClick={() => handleQuickPick("calendar", today)}
          >
            <quickPicks.calendar.icon className="text-muted-foreground" />
            {quickPicks.calendar.label}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start pr-10!"
            onClick={() => handleQuickPick("calendarEvening", today)}
          >
            <quickPicks.calendarEvening.icon className="text-muted-foreground" />
            {quickPicks.calendarEvening.label}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start pr-10!"
            onClick={() => handleQuickPick("anytime", null)}
          >
            <quickPicks.anytime.icon className="text-muted-foreground" />
            {quickPicks.anytime.label}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start pr-10!"
            onClick={() => handleQuickPick("someday", null)}
          >
            <quickPicks.someday.icon className="text-muted-foreground" />
            {quickPicks.someday.label}
          </Button>
        </div>
        <Calendar
          selected={scheduledDate ?? undefined}
          onSelect={handleCalendarSelect}
          mode="single"
        />
      </PopoverContent>
    </Popover>
  );
}

// Keep the old component for due date picking (which only needs a date, not dateType)
export function TodoCalendarButton({
  icon: Icon,
  value: date,
  onValueChange: setDate,
}: {
  icon?: Icon;
  value: Date | undefined;
  onValueChange: (newVal: Date | undefined) => void;
}) {
  const [displayDate, setDisplayDate] = useState("");

  useEffect(() => {
    if (date) setDisplayDate(humanReadableDate(date));
  }, [date]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            "h-8 w-8 max-w-8 justify-start gap-2 overflow-clip p-2! text-muted-foreground transition-[width,max-width]",
            date !== undefined && "w-auto max-w-max",
          )}
          size="sm"
          variant="ghost"
        >
          {Icon && <Icon />}
          {displayDate}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar selected={date} onSelect={setDate} mode="single" />
      </PopoverContent>
    </Popover>
  );
}
