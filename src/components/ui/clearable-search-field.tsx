"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/cn";

// A plain text input with a leading search icon and a trailing clear
// "x" (shown once there's text), for standalone search/filter boxes that
// aren't a Combobox (e.g. the search page's free-text query field).
// Native <form> submission still works — this only manages the input's
// own value, not a separate controlled prop, so it's a drop-in swap for
// a bare <input name="...">.
export function ClearableSearchField({
  name,
  defaultValue,
  placeholder,
  className,
  onChange,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  /** Fires on every keystroke/clear, in addition to the field's own uncontrolled value — for instant client-side filtering (e.g. the dashboard's Recent Archives filter), independent of the <input name> still working in a native form submission. */
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  function update(next: string) {
    setValue(next);
    onChange?.(next);
  }

  return (
    <div className={cn("relative", className)}>
      <Icon name="search" size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
      <input
        ref={inputRef}
        type="text"
        name={name}
        value={value}
        onChange={(e) => update(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-xs border border-outline bg-surface py-2 pl-10 pr-9 type-body-medium text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {value !== "" && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            update("");
            inputRef.current?.focus();
          }}
          className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-on-surface-variant hover:bg-on-surface-8"
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
}
