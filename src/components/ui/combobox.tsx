"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/icon";

// MD3-styled searchable, clearable single-select — the app's replacement
// for native <select> everywhere a dropdown appears. Hand-rolled on the
// same outside-click/Escape skeleton as Menu.tsx rather than adding a
// headless combobox library, since Dialog/Menu/Snackbar already proved
// out that pattern on native elements + MD3 tokens.
//
// Every current call site is a native <form action="..."> submission
// (search filters, audit-log filters, metadata forms), not controlled
// React state — so this renders a hidden <input type="hidden" name>
// alongside the visible text input, meaning it's a drop-in replacement
// for SelectField's `name`/`defaultValue` contract with zero changes
// needed to the surrounding form or server-side param parsing.

export type ComboboxOption = {
  value: string;
  label: string;
  description?: string;
};

type ComboboxProps<T extends ComboboxOption> = {
  name?: string;
  options: T[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  compact?: boolean;
  clearable?: boolean;
  className?: string;
  /** Render prop for richer, multi-column option rows (e.g. name + department). */
  renderOption?: (option: T, state: { active: boolean; selected: boolean }) => ReactNode;
  label?: ReactNode;
  hint?: string;
  error?: string;
};

const controlClasses =
  "w-full rounded-xs border border-outline bg-surface pl-3 pr-16 py-2 type-body-medium text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:border-on-surface-12 disabled:bg-on-surface-8 disabled:text-on-surface/38";
const compactControlClasses =
  "w-full rounded-xs border border-outline bg-surface pl-2 pr-14 py-1 type-body-medium text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

export function Combobox<T extends ComboboxOption>({
  name,
  options,
  defaultValue,
  value: controlledValue,
  onValueChange,
  placeholder = "Select…",
  compact,
  clearable = true,
  className,
  renderOption,
  label,
  hint,
  error,
}: ComboboxProps<T>) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? "");
  const value = controlledValue ?? uncontrolledValue;
  const setValue = (v: string) => {
    if (onValueChange) onValueChange(v);
    if (controlledValue === undefined) setUncontrolledValue(v);
  };

  const selectedOption = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);
  const selectedLabel = selectedOption?.label ?? "";

  const [open, setOpen] = useState(false);
  // "Free text the user has typed while the dropdown is open" — null
  // means "not editing," so the visible text derives from the current
  // selection instead of needing an effect to stay in sync with it.
  const [draftQuery, setDraftQuery] = useState<string | null>(null);
  const query = draftQuery ?? selectedLabel;
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  // A stable, per-instance-unique DOM id decoupled from `name` — `name`
  // is the form field key and is often reused across multiple mounted
  // instances of the same field (e.g. one per row in a mapped list), so
  // using it directly as `id` would produce duplicate DOM ids.
  const inputId = useId();

  function closeAndResetDraft() {
    setOpen(false);
    setDraftQuery(null);
  }

  const filtered = useMemo(() => {
    if (!open || draftQuery === null || draftQuery.trim() === "") return options;
    const q = draftQuery.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q));
  }, [options, draftQuery, open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) closeAndResetDraft();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function select(option: T) {
    setValue(option.value);
    closeAndResetDraft();
  }

  function clear() {
    setValue("");
    setDraftQuery(null);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(0);
        return;
      }
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && filtered[activeIndex]) select(filtered[activeIndex]);
    } else if (e.key === "Escape") {
      closeAndResetDraft();
    } else if ((e.key === "Backspace" || e.key === "Delete") && draftQuery === null && value !== "") {
      // The input is showing the selected label as one atomic value (the
      // user hasn't started typing a replacement) — treat the first
      // Backspace/Delete as "clear the selection," not "delete a
      // character," matching a chip-like clear affordance.
      e.preventDefault();
      clear();
    }
  }

  return (
    <div className="space-y-1">
      {label && (
        <label className="block type-label-large text-on-surface-variant" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div ref={rootRef} className={cn("relative", className)}>
        {name && <input type="hidden" name={name} value={value} />}
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={open && filtered[activeIndex] ? `${listId}-${activeIndex}` : undefined}
          autoComplete="off"
          className={cn(compact ? compactControlClasses : controlClasses, error && "border-error focus:border-error focus:ring-error")}
          placeholder={placeholder}
          value={query}
          onClick={() => {
            if (!open) {
              setOpen(true);
              setActiveIndex(0);
            }
          }}
          onChange={(e) => {
            setDraftQuery(e.target.value);
            setActiveIndex(0);
            setOpen(true);
            if (e.target.value === "") setValue("");
          }}
          onKeyDown={onKeyDown}
        />
        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
          {clearable && value !== "" && (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Clear selection"
              className="flex h-6 w-6 items-center justify-center rounded-full text-on-surface-variant hover:bg-on-surface-8"
              onClick={clear}
            >
              <Icon name="close" size={16} />
            </button>
          )}
          <Icon name="arrow_drop_down" size={20} className="text-on-surface-variant" />
        </div>

        {open && (
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            className="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-xs bg-surface-container shadow-elevation-2"
          >
            {filtered.length === 0 && (
              <p className="px-3 py-2.5 type-body-medium text-on-surface-variant">No matches.</p>
            )}
            {filtered.map((option, index) => {
              const selected = option.value === value;
              const active = index === activeIndex;
              return (
                <div
                  key={option.value}
                  id={`${listId}-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(e) => {
                    e.preventDefault(); // keep focus in the input
                    select(option);
                  }}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 px-3 py-2.5 type-body-medium text-on-surface transition-colors",
                    active && "bg-on-surface-8"
                  )}
                >
                  {renderOption ? (
                    <div className="min-w-0 flex-1">{renderOption(option, { active, selected })}</div>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{option.label}</p>
                      {option.description && (
                        <p className="truncate type-body-small text-on-surface-variant">{option.description}</p>
                      )}
                    </div>
                  )}
                  {selected && <Icon name="check" size={18} className="shrink-0 text-primary" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {hint && !error && <p className="type-body-small text-on-surface-variant">{hint}</p>}
      {error && <p className="type-body-small text-error">{error}</p>}
    </div>
  );
}
