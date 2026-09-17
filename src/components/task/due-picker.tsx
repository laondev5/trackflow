"use client";

import { CalendarX2, Sun, Sunrise, CalendarRange, Sofa } from "lucide-react";
import { cn } from "@/lib/utils";
import { addDays, endOfDay, fromInputs, isSameDay, toDateInput, toTimeInput } from "@/lib/dates";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface DueValue {
  dueDate: string | null;
  hasTime: boolean;
}

function nextWeekday(target: number) {
  const d = new Date();
  const diff = (target - d.getDay() + 7) % 7 || 7;
  return addDays(d, diff);
}

export function DuePicker({ value, onChange }: { value: DueValue; onChange: (v: DueValue) => void }) {
  const current = value.dueDate ? new Date(value.dueDate) : null;

  const presets = [
    { label: "Today", icon: Sun, date: new Date() },
    { label: "Tomorrow", icon: Sunrise, date: addDays(new Date(), 1) },
    { label: "Weekend", icon: Sofa, date: nextWeekday(6) },
    { label: "Next week", icon: CalendarRange, date: nextWeekday(1) },
  ];

  const setDay = (date: Date) => {
    if (value.hasTime && current) {
      const d = new Date(date);
      d.setHours(current.getHours(), current.getMinutes(), 0, 0);
      onChange({ dueDate: d.toISOString(), hasTime: true });
    } else {
      onChange({ dueDate: endOfDay(date).toISOString(), hasTime: false });
    }
  };

  return (
    <div className="space-y-3">
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        {presets.map((p) => {
          const active = current && isSameDay(current, p.date);
          return (
            <Button
              key={p.label}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              className="shrink-0 rounded-full"
              onClick={() => setDay(p.date)}
            >
              <p.icon /> {p.label}
            </Button>
          );
        })}
        <Button
          type="button"
          size="sm"
          variant={!current ? "secondary" : "outline"}
          className="shrink-0 rounded-full"
          onClick={() => onChange({ dueDate: null, hasTime: false })}
        >
          <CalendarX2 /> No date
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input
          type="date"
          aria-label="Due date"
          value={current ? toDateInput(current) : ""}
          onChange={(e) => {
            if (!e.target.value) return onChange({ dueDate: null, hasTime: false });
            onChange({
              dueDate: fromInputs(e.target.value, value.hasTime && current ? toTimeInput(current) : null).toISOString(),
              hasTime: value.hasTime,
            });
          }}
        />
        <div className="relative">
          <Input
            type="time"
            aria-label="Due time"
            className={cn(!value.hasTime && "text-muted-foreground")}
            value={current && value.hasTime ? toTimeInput(current) : ""}
            onChange={(e) => {
              const day = current ?? new Date();
              if (!e.target.value) return onChange({ dueDate: endOfDay(day).toISOString(), hasTime: false });
              onChange({ dueDate: fromInputs(toDateInput(day), e.target.value).toISOString(), hasTime: true });
            }}
          />
        </div>
      </div>
    </div>
  );
}
