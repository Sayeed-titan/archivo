"use client";

import { cn } from "@/lib/cn";
import { useRef, type ReactNode, type TdHTMLAttributes, type ThHTMLAttributes } from "react";
import { useScrollShadows } from "@/hooks/use-scroll-shadows";
import { useEdgeHoverAutoScroll } from "@/hooks/use-edge-hover-autoscroll";

// MD3-styled data table shell — including the overflow-x-auto wrapper
// every table needs (see globals.css comment on why: wide tables can
// otherwise blow out the whole page's width on mobile). Edge fade shadows
// signal there's more to scroll instead of relying on the user finding
// the (often thin/hidden) scrollbar; hovering right at the left/right
// edge auto-scrolls that direction for the same reason.
export function Table({ children }: { children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { showLeft, showRight } = useScrollShadows(scrollRef);
  useEdgeHoverAutoScroll(scrollRef);

  return (
    <div className="relative overflow-hidden rounded-md border border-outline-variant bg-surface">
      <div ref={scrollRef} className="overflow-x-auto">
        <table className="w-full text-left type-body-medium">{children}</table>
      </div>
      <div
        aria-hidden
        className={cn(
          "no-print pointer-events-none absolute inset-y-0 left-0 w-8 bg-linear-to-r from-scrim/12 to-transparent transition-opacity",
          showLeft ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        aria-hidden
        className={cn(
          "no-print pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-scrim/12 to-transparent transition-opacity",
          showRight ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-outline-variant bg-surface-container-low text-on-surface-variant">{children}</tr>
    </thead>
  );
}

export function Th({ className, children, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn("whitespace-nowrap px-3 py-2.5 type-label-large", className)} {...rest}>
      {children}
    </th>
  );
}

export function Td({ className, children, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("whitespace-nowrap px-3 py-2", className)} {...rest}>
      {children}
    </td>
  );
}

export function TableRow({ children }: { children: ReactNode }) {
  return (
    <tr className="group border-b border-outline-variant/60 transition-colors hover:bg-on-surface-8 last:border-b-0">
      {children}
    </tr>
  );
}

// Applied to a row's first visible cell so it stays pinned while the rest
// of a wide table scrolls horizontally underneath it (see Table's edge
// fade shadows for the matching "more to scroll" affordance). Needs its
// own fully opaque background at all times — matching each context's own
// bg — since sticky positioning would otherwise let scrolled-under cells
// show through. The row hover state normally uses a translucent
// on-surface-8 tint (a state layer meant to blend with whatever's behind
// it), which is exactly wrong here: over a sticky cell it lets the
// scrolled-under cells' text ghost through. bg-surface-container-high is
// used instead as an opaque stand-in for the hover state on this cell only.
// Split header/body variants since TableHead's row background differs
// from a plain body row's (and only body rows get a hover state).
export const STICKY_FIRST_COL_HEAD_CLASS =
  "sticky left-0 z-10 max-w-56 overflow-hidden bg-surface-container-low after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-outline-variant";
export const STICKY_FIRST_COL_BODY_CLASS =
  "sticky left-0 z-10 max-w-56 overflow-hidden bg-surface group-hover:bg-surface-container-high after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-outline-variant";

export function TableEmptyState({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-6 text-center type-body-medium text-on-surface-variant">
        {message}
      </td>
    </tr>
  );
}
