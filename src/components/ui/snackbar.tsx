"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/icon";

// MD3 snackbar (https://m3.material.io/components/snackbar): inverse
// surface, bottom of screen, auto-dismisses. One at a time — a new
// message replaces the current one, per spec.
//
// Usage (client components): const { showSnackbar } = useSnackbar();
// showSnackbar("Saved"). Server-rendered flows can also trigger one via
// <SnackbarOnMount message="..."> after a redirect.

type SnackbarState = { id: number; message: string };

const SnackbarContext = createContext<{ showSnackbar: (message: string) => void } | null>(null);

export function useSnackbar() {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error("useSnackbar must be used inside <SnackbarProvider>");
  return ctx;
}

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<SnackbarState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSnackbar = useCallback((message: string) => {
    if (timer.current) clearTimeout(timer.current);
    const id = Date.now();
    setCurrent({ id, message });
    timer.current = setTimeout(() => setCurrent(null), 4500);
  }, []);

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      {current && (
        <div
          key={current.id}
          role="status"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto flex w-fit max-w-[min(100%,34rem)] items-center gap-3 rounded-xs bg-inverse-surface py-3 pl-4 pr-2 text-inverse-on-surface shadow-elevation-3"
        >
          <span className="type-body-medium">{current.message}</span>
          <button
            type="button"
            aria-label="Dismiss"
            className="flex h-8 w-8 items-center justify-center rounded-full text-inverse-on-surface/80 hover:bg-inverse-on-surface/10"
            onClick={() => setCurrent(null)}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      )}
    </SnackbarContext.Provider>
  );
}

// Fires a snackbar once when mounted — lets server components surface
// post-redirect feedback (e.g. ?saved=1) through the shared snackbar.
export function SnackbarOnMount({ message }: { message: string }) {
  const { showSnackbar } = useSnackbar();
  const shown = useRef(false);
  useEffect(() => {
    if (!shown.current) {
      shown.current = true;
      showSnackbar(message);
    }
  }, [message, showSnackbar]);
  return null;
}
