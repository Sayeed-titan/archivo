"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

// Native <input type="checkbox"> exposes `indeterminate` only as a DOM
// property, not an HTML attribute or React prop — has to be set
// imperatively via ref.
export function TriStateCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      className={cn("size-4 accent-primary", className)}
    />
  );
}
