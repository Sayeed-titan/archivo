"use client";

import { Icon } from "@/components/icon";
import { cn } from "@/lib/cn";

export type ExplorerView = "grid" | "list" | "details";

const OPTIONS: { value: ExplorerView; icon: string; label: string }[] = [
  { value: "grid", icon: "grid_view", label: "Grid view" },
  { value: "list", icon: "view_list", label: "List view" },
  { value: "details", icon: "view_agenda", label: "Details view" },
];

export function ViewToggle({ view, onChange }: { view: ExplorerView; onChange: (v: ExplorerView) => void }) {
  return (
    <div className="flex items-center rounded-full border border-outline-variant p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.label}
          aria-label={o.label}
          aria-pressed={view === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
            view === o.value ? "bg-secondary-container text-on-secondary-container" : "text-on-surface-variant hover:bg-on-surface-8"
          )}
        >
          <Icon name={o.icon} size={18} />
        </button>
      ))}
    </div>
  );
}
