"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/icon";
import { IconButton } from "@/components/ui/icon-button";
import { ExtendedFab } from "@/components/ui/fab";

export type NavItem = { href: string; icon: string; label: string };

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

// MD3 navigation rail (https://m3.material.io/components/navigation-rail)
// — persistent on md+ screens: FAB up top, destinations as icon-in-pill +
// label. The active destination gets the secondary-container indicator
// and a filled icon, per spec.
export function NavRail({ items, fabHref }: { items: NavItem[]; fabHref: string | null }) {
  const isActive = useIsActive();

  return (
    <nav
      aria-label="Main navigation"
      className="sticky top-0 z-30 hidden h-dvh w-20 shrink-0 flex-col items-center gap-3 overflow-y-auto bg-surface-container py-4 md:flex"
    >
      {fabHref && <ExtendedFab href={fabHref} icon="add" label="New archive" collapsed className="mb-2" />}
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link key={item.href} href={item.href} className="group flex w-full flex-col items-center gap-1">
            <span
              className={cn(
                "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                active
                  ? "bg-secondary-container text-on-secondary-container"
                  : "text-on-surface-variant group-hover:bg-on-surface-8"
              )}
            >
              <Icon name={item.icon} filled={active} size={22} />
            </span>
            <span className={cn("type-label-medium", active ? "text-on-surface" : "text-on-surface-variant")}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

// Mobile: hamburger in the top app bar opening an MD3 modal navigation
// drawer (scrim + surface-container-low panel, list-style destinations).
export function MobileNav({
  items,
  fabHref,
  orgName,
}: {
  items: NavItem[];
  fabHref: string | null;
  orgName: string;
}) {
  const [open, setOpen] = useState(false);
  const isActive = useIsActive();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="md:hidden">
      <IconButton icon="menu" label="Open navigation" onClick={() => setOpen(true)} />
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-scrim/40" onClick={() => setOpen(false)} aria-hidden />
          <nav
            aria-label="Main navigation"
            className="absolute inset-y-0 left-0 flex w-70 max-w-[85vw] flex-col overflow-y-auto rounded-r-lg bg-surface-container-low p-3 shadow-elevation-1"
          >
            <div className="flex items-center justify-between px-3 py-2">
              <span className="type-title-medium text-on-surface-variant">{orgName}</span>
              <IconButton icon="close" label="Close navigation" onClick={() => setOpen(false)} />
            </div>
            {fabHref && (
              <div className="px-3 py-2" onClick={() => setOpen(false)}>
                <ExtendedFab href={fabHref} icon="add" label="New archive" className="w-full" />
              </div>
            )}
            <div className="mt-2 space-y-1">
              {items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex h-14 items-center gap-3 rounded-full px-4 type-label-large transition-colors",
                      active
                        ? "bg-secondary-container text-on-secondary-container"
                        : "text-on-surface-variant hover:bg-on-surface-8"
                    )}
                  >
                    <Icon name={item.icon} filled={active} size={24} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}

// Brand block for the top app bar (logo + product context).
export function BrandMark({ orgName }: { orgName: string }) {
  return (
    <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
      {/* Logo is a black PNG with no backdrop needed on light surfaces;
          .brand-logo (globals.css) inverts it to white in dark mode
          instead of shipping a second asset or a white backdrop plate —
          this app themes via html[data-theme], not Tailwind's dark:
          class/media variant, so the invert has to be a plain CSS rule
          keyed off that attribute. */}
      <Image
        src="/spellbound-network-logo.png"
        alt="Spellbound Network"
        width={4331}
        height={2100}
        priority
        className="brand-logo h-20 w-auto shrink-0"
      />
      <span className="hidden min-w-0 flex-col sm:flex">
        <span className="truncate type-title-medium text-on-surface">{orgName}</span>
        <span className="type-label-small uppercase tracking-wide text-on-surface-variant">Archive Management</span>
      </span>
    </Link>
  );
}
