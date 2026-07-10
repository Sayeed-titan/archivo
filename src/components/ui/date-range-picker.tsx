"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/icon";
import { Combobox } from "./combobox";
import { SwitchField } from "./form-field";

// MD3-styled date picker for a single day or a multi-day range, built on
// the same outside-click/Escape popover skeleton as Combobox/Menu rather
// than a headless calendar library. Month + year are dropdowns (year is a
// searchable Combobox, per product ask) instead of the usual prev/next
// month arrows — faster to jump to an old event than clicking back 40
// times, and this app has no need to browse a continuous calendar.
//
// Renders hidden <input type="hidden"> fields (`name` for the start date,
// `${name}End` for the end date, both "YYYY-MM-DD") so it drop-in
// replaces a native date input in a <form action="..."> submission, same
// contract as Combobox.

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fromIso(s: string | undefined | null): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDisplay(d: Date): string {
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function sameDay(a: Date | null, b: Date | null): boolean {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const currentYear = new Date().getFullYear();
// Generous span for past archives plus a little headroom for future planning.
const YEAR_OPTIONS = Array.from({ length: currentYear - 1979 + 6 }, (_, i) => currentYear + 5 - i).map((y) => ({
  value: String(y),
  label: String(y),
}));

type DateRangePickerProps = {
  name: string;
  label?: ReactNode;
  hint?: string;
  error?: string;
  compact?: boolean;
  className?: string;
  defaultStart?: string | null; // "YYYY-MM-DD"
  defaultEnd?: string | null;
  /** Fire on every start/end change (incl. clear), in addition to the hidden <input name>s still working in a native form submission — for instant client-side filtering (e.g. the dashboard's Recent Archives filter). Values are "YYYY-MM-DD" or "" when cleared. */
  onChangeStart?: (value: string) => void;
  onChangeEnd?: (value: string) => void;
};

export function DateRangePicker({
  name,
  label,
  hint,
  error,
  compact,
  className,
  defaultStart,
  defaultEnd,
  onChangeStart,
  onChangeEnd,
}: DateRangePickerProps) {
  const [start, setStartState] = useState<Date | null>(fromIso(defaultStart));
  const [end, setEndState] = useState<Date | null>(fromIso(defaultEnd));

  function setStart(d: Date | null) {
    setStartState(d);
    onChangeStart?.(d ? toIso(d) : "");
  }
  function setEnd(d: Date | null) {
    setEndState(d);
    onChangeEnd?.(d ? toIso(d) : "");
  }
  const [isRange, setIsRange] = useState(!!fromIso(defaultEnd) && !sameDay(fromIso(defaultStart), fromIso(defaultEnd)));

  // Which end of the range the calendar is currently placing — only
  // meaningful while isRange is true.
  const [placing, setPlacing] = useState<"start" | "end">("start");

  const anchor = start ?? new Date();
  const [viewYear, setViewYear] = useState(anchor.getFullYear());
  const [viewMonth, setViewMonth] = useState(anchor.getMonth());

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const displayLabel = useMemo(() => {
    if (!start) return "";
    if (!isRange || !end || sameDay(start, end)) return formatDisplay(start);
    return `${formatDisplay(start)} – ${formatDisplay(end)}`;
  }, [start, end, isRange]);

  const weeks = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const leading = first.getDay(); // 0 = Sunday
    const total = daysInMonth(viewYear, viewMonth);
    const cells: (Date | null)[] = [];
    for (let i = 0; i < leading; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(new Date(viewYear, viewMonth, d));
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [viewYear, viewMonth]);

  function pickDay(d: Date) {
    if (!isRange) {
      setStart(d);
      setEnd(d);
      setOpen(false);
      return;
    }
    if (placing === "start") {
      setStart(d);
      // If the existing end is now before the new start, clear it so the
      // range stays valid instead of silently inverting.
      if (end && d > end) setEnd(null);
      setPlacing("end");
    } else {
      if (start && d < start) {
        // Picked an end before the start — treat it as a new start instead
        // of rejecting the click, matching common range-picker behavior.
        setStart(d);
        setEnd(null);
        setPlacing("end");
        return;
      }
      setEnd(d);
      setOpen(false);
      setPlacing("start");
    }
  }

  function clear() {
    setStart(null);
    setEnd(null);
    setPlacing("start");
  }

  function toggleRange(checked: boolean) {
    setIsRange(checked);
    setPlacing("start");
    if (!checked) setEnd(start);
  }

  const startIso = start ? toIso(start) : "";
  const endIso = isRange && end ? toIso(end) : startIso;

  const controlClasses = compact
    ? "w-full rounded-xs border border-outline bg-surface pl-2 pr-8 py-1 type-body-medium text-on-surface text-left placeholder:text-on-surface-variant/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
    : "w-full rounded-xs border border-outline bg-surface pl-3 pr-9 py-2 type-body-medium text-on-surface text-left placeholder:text-on-surface-variant/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="space-y-1">
      {label && (
        <label className="block type-label-large text-on-surface-variant" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div ref={rootRef} className={cn("relative", className)}>
        <input type="hidden" name={name} value={startIso} />
        <input type="hidden" name={`${name}End`} value={endIso} />

        <button
          type="button"
          id={inputId}
          onClick={() => setOpen((v) => !v)}
          className={cn(controlClasses, error && "border-error focus:border-error focus:ring-error", !displayLabel && "text-on-surface-variant/70")}
        >
          {displayLabel || "Select date…"}
        </button>
        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
          <Icon name="calendar_month" size={18} className="text-on-surface-variant" />
        </div>

        {open && (
          <div className="absolute z-40 mt-1 w-80 space-y-3 rounded-xs bg-surface-container p-4 shadow-elevation-2">
            <SwitchField
              label="Multiple days"
              description="Turn on for an event spanning a date range."
              checked={isRange}
              onChange={(e) => toggleRange(e.target.checked)}
            />

            {isRange && (
              <p className="type-body-small text-on-surface-variant">
                {placing === "start" ? "Pick the start date." : "Pick the end date."}
              </p>
            )}

            <div className="flex items-center gap-2">
              <Combobox
                compact
                className="flex-[1.3]"
                value={String(viewMonth)}
                onValueChange={(v) => setViewMonth(Number(v))}
                clearable={false}
                options={MONTHS.map((m, i) => ({ value: String(i), label: m }))}
              />
              <Combobox
                compact
                className="flex-1"
                value={String(viewYear)}
                onValueChange={(v) => setViewYear(Number(v))}
                clearable={false}
                options={YEAR_OPTIONS}
              />
            </div>

            <div>
              <div className="grid grid-cols-7 gap-1 pb-1 text-center type-label-small text-on-surface-variant">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>
              {weeks.map((row, ri) => (
                <div key={ri} className="grid grid-cols-7 gap-1 py-0.5">
                  {row.map((d, di) => {
                    if (!d) return <span key={di} />;
                    const isStart = sameDay(d, start);
                    const isEnd = isRange && sameDay(d, end);
                    const inRange = isRange && start && end && d > start && d < end;
                    const isToday = sameDay(d, new Date());
                    return (
                      <button
                        key={di}
                        type="button"
                        onClick={() => pickDay(d)}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full type-body-small transition-colors hover:bg-on-surface-8",
                          (isStart || isEnd) && "bg-primary text-on-primary hover:bg-primary",
                          inRange && "rounded-none bg-primary-container text-on-primary-container",
                          !isStart && !isEnd && !inRange && isToday && "border border-primary",
                        )}
                      >
                        {d.getDate()}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={clear}
                className="type-label-large text-primary hover:underline"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="type-label-large text-primary hover:underline"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
      {hint && !error && <p className="type-body-small text-on-surface-variant">{hint}</p>}
      {error && <p className="type-body-small text-error">{error}</p>}
    </div>
  );
}
