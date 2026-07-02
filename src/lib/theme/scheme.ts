// Material Design 3 color scheme generation (via Google's official
// @material/material-color-utilities). One seed color in → the full MD3
// color-role vocabulary out, for both light and dark, plus two custom
// semantic roles (success / warning) harmonized toward the seed hue the
// way the MD3 spec recommends for extended colors.
//
// This module is pure and isomorphic on purpose — the appearance settings
// page reuses it client-side for a live preview before saving.

import {
  Hct,
  SchemeTonalSpot,
  MaterialDynamicColors,
  argbFromHex,
  hexFromArgb,
  customColor,
  type DynamicScheme,
} from "@material/material-color-utilities";

export const DEFAULT_SEED_COLOR = "#6750A4"; // MD3 baseline purple

// Extended-color seeds (FR-agnostic semantics the app already relies on:
// healthy/success = green, needs-attention/warning = amber). blend: true
// shifts their hue slightly toward the org seed so they feel like one
// palette instead of stock traffic-light colors pasted on top.
const SUCCESS_SEED = argbFromHex("#2E7D32");
const WARNING_SEED = argbFromHex("#F59E0B");

// CSS-var-name (kebab, minus the --md-sys-color- prefix) → dynamic color.
const ROLE_MAP: Record<string, (typeof MaterialDynamicColors)["primary"]> = {
  primary: MaterialDynamicColors.primary,
  "on-primary": MaterialDynamicColors.onPrimary,
  "primary-container": MaterialDynamicColors.primaryContainer,
  "on-primary-container": MaterialDynamicColors.onPrimaryContainer,
  secondary: MaterialDynamicColors.secondary,
  "on-secondary": MaterialDynamicColors.onSecondary,
  "secondary-container": MaterialDynamicColors.secondaryContainer,
  "on-secondary-container": MaterialDynamicColors.onSecondaryContainer,
  tertiary: MaterialDynamicColors.tertiary,
  "on-tertiary": MaterialDynamicColors.onTertiary,
  "tertiary-container": MaterialDynamicColors.tertiaryContainer,
  "on-tertiary-container": MaterialDynamicColors.onTertiaryContainer,
  error: MaterialDynamicColors.error,
  "on-error": MaterialDynamicColors.onError,
  "error-container": MaterialDynamicColors.errorContainer,
  "on-error-container": MaterialDynamicColors.onErrorContainer,
  surface: MaterialDynamicColors.surface,
  "surface-dim": MaterialDynamicColors.surfaceDim,
  "surface-bright": MaterialDynamicColors.surfaceBright,
  "surface-container-lowest": MaterialDynamicColors.surfaceContainerLowest,
  "surface-container-low": MaterialDynamicColors.surfaceContainerLow,
  "surface-container": MaterialDynamicColors.surfaceContainer,
  "surface-container-high": MaterialDynamicColors.surfaceContainerHigh,
  "surface-container-highest": MaterialDynamicColors.surfaceContainerHighest,
  "on-surface": MaterialDynamicColors.onSurface,
  "on-surface-variant": MaterialDynamicColors.onSurfaceVariant,
  "surface-variant": MaterialDynamicColors.surfaceVariant,
  outline: MaterialDynamicColors.outline,
  "outline-variant": MaterialDynamicColors.outlineVariant,
  "inverse-surface": MaterialDynamicColors.inverseSurface,
  "inverse-on-surface": MaterialDynamicColors.inverseOnSurface,
  "inverse-primary": MaterialDynamicColors.inversePrimary,
  scrim: MaterialDynamicColors.scrim,
  shadow: MaterialDynamicColors.shadow,
};

export type SchemeVars = Record<string, string>; // role name → hex

function rolesFromScheme(scheme: DynamicScheme): SchemeVars {
  const out: SchemeVars = {};
  for (const [name, color] of Object.entries(ROLE_MAP)) {
    out[name] = hexFromArgb(color.getArgb(scheme));
  }
  return out;
}

export function normalizeSeedColor(input: string | null | undefined): string {
  const hex = (input ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toLowerCase() : DEFAULT_SEED_COLOR;
}

/** Full MD3 scheme (all color roles + success/warning extensions) for a seed. */
export function buildMaterialScheme(seedColor: string): { light: SchemeVars; dark: SchemeVars } {
  const seed = argbFromHex(normalizeSeedColor(seedColor));
  const light = rolesFromScheme(new SchemeTonalSpot(Hct.fromInt(seed), false, 0));
  const dark = rolesFromScheme(new SchemeTonalSpot(Hct.fromInt(seed), true, 0));

  for (const [name, value] of [
    ["success", SUCCESS_SEED],
    ["warning", WARNING_SEED],
  ] as const) {
    const group = customColor(seed, { value, name, blend: true });
    light[name] = hexFromArgb(group.light.color);
    light[`on-${name}`] = hexFromArgb(group.light.onColor);
    light[`${name}-container`] = hexFromArgb(group.light.colorContainer);
    light[`on-${name}-container`] = hexFromArgb(group.light.onColorContainer);
    dark[name] = hexFromArgb(group.dark.color);
    dark[`on-${name}`] = hexFromArgb(group.dark.onColor);
    dark[`${name}-container`] = hexFromArgb(group.dark.colorContainer);
    dark[`on-${name}-container`] = hexFromArgb(group.dark.onColorContainer);
  }

  return { light, dark };
}
