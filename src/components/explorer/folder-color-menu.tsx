"use client";

import { useTransition } from "react";
import { setFolderColor } from "@/app/actions/explorer";
import { FOLDER_COLORS, type FolderColorKey } from "@/lib/folder-colors";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/cn";

// Deliberately doesn't stop the click from bubbling — a swatch click is
// meant to also close the parent Menu, same as any other menu item.
export function FolderColorMenu({ folderId, current }: { folderId: string; current: string | null }) {
  const [pending, startTransition] = useTransition();

  function pick(color: FolderColorKey) {
    startTransition(() => setFolderColor(folderId, color === "neutral" ? null : color));
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-2">
      {FOLDER_COLORS.map((c) => {
        const active = (current ?? "neutral") === c.key;
        return (
          <button
            key={c.key}
            type="button"
            title={c.label}
            disabled={pending}
            onClick={() => pick(c.key)}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full ring-offset-2 ring-offset-surface-container transition-shadow",
              c.swatchClassName,
              active && "ring-2 ring-on-surface"
            )}
          >
            {active && <Icon name="check" size={14} className="text-surface" />}
          </button>
        );
      })}
    </div>
  );
}
