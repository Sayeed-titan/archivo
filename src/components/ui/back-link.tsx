"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { Icon } from "@/components/icon";

// Depth counter in sessionStorage, bumped on every pathname change by
// <NavDepthTracker> (mounted once in AppShell). Lets BackLink tell "user
// navigated here from another page in this app" (safe to router.back() out
// of) apart from "user landed here directly" — refresh, external link, new
// tab — where back() would exit the app entirely instead of going anywhere
// useful.
const NAV_DEPTH_KEY = "archivo:nav-depth";

function readDepth() {
  if (typeof window === "undefined") return 0;
  return Number(window.sessionStorage.getItem(NAV_DEPTH_KEY) ?? "0");
}

// sessionStorage writes don't emit a "storage" event in the same tab that
// made them, so NavDepthTracker notifies this in-memory listener set
// directly — that's what lets useSyncExternalStore below re-render BackLink
// the moment depth changes, without an effect+setState.
const listeners = new Set<() => void>();
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

// Mount once (in AppShell) to track in-app navigations for BackLink.
export function NavDepthTracker() {
  const pathname = usePathname();
  const lastPathname = useRef(pathname);

  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    window.sessionStorage.setItem(NAV_DEPTH_KEY, String(readDepth() + 1));
    listeners.forEach((onChange) => onChange());
  }, [pathname]);

  return null;
}

export function BackLink({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  const hasHistory = useSyncExternalStore(
    subscribe,
    () => readDepth() > 1,
    () => false // server snapshot: no sessionStorage, always render the plain link
  );

  const className =
    "no-print inline-flex items-center gap-1 rounded-full py-1 pl-1 pr-3 type-label-large text-on-surface-variant transition-colors hover:bg-on-surface-8 hover:text-on-surface";

  if (hasHistory) {
    return (
      <button type="button" onClick={() => router.back()} className={className}>
        <Icon name="arrow_back" size={18} />
        {label}
      </button>
    );
  }

  return (
    <Link href={href} className={className}>
      <Icon name="arrow_back" size={18} />
      {label}
    </Link>
  );
}
