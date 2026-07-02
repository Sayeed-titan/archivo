"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/icon";

// MD3 menu (https://m3.material.io/components/menus): trigger + anchored
// surface-container dropdown at elevation 2. Closes on outside click,
// Escape, or selecting an item.
export function Menu({
  trigger,
  align = "end",
  children,
  className,
}: {
  /** Render prop so the trigger can reflect open state. */
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  align?: "start" | "end";
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={rootRef} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          role="menu"
          // Selecting any item closes the menu; navigation/actions proceed.
          onClick={() => setOpen(false)}
          className={cn(
            "absolute z-40 mt-1 min-w-48 overflow-hidden rounded-xs bg-surface-container py-2 shadow-elevation-2",
            align === "end" ? "right-0" : "left-0",
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

const menuItemClasses =
  "flex w-full items-center gap-3 px-3 py-2.5 text-left type-label-large text-on-surface transition-colors hover:bg-on-surface-8";

export function MenuItem({
  icon,
  href,
  onClick,
  children,
}: {
  icon?: string;
  href?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const inner = (
    <>
      {icon && <Icon name={icon} size={20} className="text-on-surface-variant" />}
      {children}
    </>
  );
  if (href) {
    return (
      <Link role="menuitem" href={href} className={menuItemClasses}>
        {inner}
      </Link>
    );
  }
  return (
    <button role="menuitem" type="button" onClick={onClick} className={menuItemClasses}>
      {inner}
    </button>
  );
}

// A submit row for server-action forms inside menus (e.g. Log out).
export function MenuFormItem({ icon, children }: { icon?: string; children: ReactNode }) {
  return (
    <button role="menuitem" type="submit" className={menuItemClasses}>
      {icon && <Icon name={icon} size={20} className="text-on-surface-variant" />}
      {children}
    </button>
  );
}

export function MenuSeparator() {
  return <div role="separator" className="my-2 border-t border-outline-variant" />;
}
