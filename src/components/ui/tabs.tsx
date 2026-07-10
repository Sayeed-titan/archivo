"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

// Minimal MD3-styled tab strip for switching between panels within a
// single card/section (not full-page navigation tabs, which would be
// plain links). Uncontrolled by default (internal useState), matching
// how every other small interactive widget in this codebase (Combobox,
// Menu) manages its own open/active state rather than requiring the
// parent to lift it.
export function Tabs({
  tabs,
  defaultTab,
  className,
}: {
  tabs: { key: string; label: string; content: ReactNode }[];
  defaultTab?: string;
  className?: string;
}) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key);
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div className={className}>
      <div role="tablist" className="flex items-center gap-1 border-b border-outline-variant px-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={tab.key === activeTab?.key}
            onClick={() => setActive(tab.key)}
            className={cn(
              "relative px-3 py-2.5 type-label-large transition-colors",
              tab.key === activeTab?.key ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            {tab.label}
            {tab.key === activeTab?.key && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
      </div>
      <div>{activeTab?.content}</div>
    </div>
  );
}
