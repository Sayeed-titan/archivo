"use client";

import { useTransition } from "react";
import { setThemePreference } from "@/app/actions/appearance";
import { IconButton } from "@/components/ui/icon-button";

const CYCLE: Record<string, { next: "light" | "dark" | "system"; icon: string; label: string }> = {
  light: { next: "dark", icon: "light_mode", label: "Theme: light — switch to dark" },
  dark: { next: "system", icon: "dark_mode", label: "Theme: dark — switch to follow device" },
  system: { next: "light", icon: "brightness_auto", label: "Theme: follows device — switch to light" },
};

// Cycles the signed-in user's personal light → dark → system preference.
// Persisted on the User row so it follows them across devices; the org's
// appearance settings define the default for users who never touch this.
export function ThemeToggle({ mode }: { mode: "light" | "dark" | "system" }) {
  const [pending, startTransition] = useTransition();
  const state = CYCLE[mode] ?? CYCLE.system;

  return (
    <IconButton
      icon={state.icon}
      label={state.label}
      disabled={pending}
      onClick={() => startTransition(() => setThemePreference(state.next))}
    />
  );
}
