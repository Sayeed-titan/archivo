// Emits the per-organization MD3 token stylesheet injected by the root
// layout. Everything the appearance settings page can change funnels
// through here: seed color → color roles, shape scale → corner tokens,
// font scale → root font size. Dark mode is resolved via the html
// data-theme attribute ("light" | "dark" | "system") so the server can
// render the right thing without any client-side flash.
//
// Pure and isomorphic (no server-only imports) — the appearance page's
// live preview builds the same CSS client-side into a scoped <style>.

import { buildMaterialScheme, normalizeSeedColor, type SchemeVars } from "./scheme";

export type ThemeMode = "light" | "dark" | "system";
export type ThemeShape = "sharp" | "standard" | "rounded";
export type ThemeFontScale = "small" | "medium" | "large";

export type ThemeSettings = {
  seedColor: string;
  mode: ThemeMode;
  shape: ThemeShape;
  fontScale: ThemeFontScale;
};

export const DEFAULT_THEME: ThemeSettings = {
  seedColor: "#6750A4",
  mode: "system",
  shape: "standard",
  fontScale: "medium",
};

export function normalizeMode(v: string | null | undefined): ThemeMode {
  return v === "light" || v === "dark" || v === "system" ? v : DEFAULT_THEME.mode;
}
export function normalizeShape(v: string | null | undefined): ThemeShape {
  return v === "sharp" || v === "standard" || v === "rounded" ? v : DEFAULT_THEME.shape;
}
export function normalizeFontScale(v: string | null | undefined): ThemeFontScale {
  return v === "small" || v === "medium" || v === "large" ? v : DEFAULT_THEME.fontScale;
}

// MD3 shape scale (corner radius tokens), per org "shape" setting.
// "standard" is the spec's own scale; sharp/rounded shift the whole app's
// personality without touching a single component.
export const SHAPE_SCALES: Record<ThemeShape, Record<string, string>> = {
  sharp: { "extra-small": "2px", small: "4px", medium: "6px", large: "10px", "extra-large": "16px", full: "10px" },
  standard: { "extra-small": "4px", small: "8px", medium: "12px", large: "16px", "extra-large": "28px", full: "9999px" },
  rounded: { "extra-small": "8px", small: "12px", medium: "16px", large: "24px", "extra-large": "32px", full: "9999px" },
};

const FONT_SCALES: Record<ThemeFontScale, string> = {
  small: "93.75%", // 15px base
  medium: "100%", // 16px base
  large: "106.25%", // 17px base
};

function colorVarBlock(vars: SchemeVars): string {
  return Object.entries(vars)
    .map(([role, hex]) => `--md-sys-color-${role}:${hex};`)
    .join("");
}

function shapeVarBlock(shape: ThemeShape): string {
  return Object.entries(SHAPE_SCALES[shape])
    .map(([token, value]) => `--md-sys-shape-corner-${token}:${value};`)
    .join("");
}

// Theme CSS is deterministic per settings tuple; orgs change themes
// rarely, so a tiny module-level memo avoids regenerating the scheme on
// every request.
const cssCache = new Map<string, string>();

export function buildThemeCss(settings: ThemeSettings): string {
  const seedColor = normalizeSeedColor(settings.seedColor);
  const shape = normalizeShape(settings.shape);
  const fontScale = normalizeFontScale(settings.fontScale);
  const key = `${seedColor}|${shape}|${fontScale}`;
  const cached = cssCache.get(key);
  if (cached) return cached;

  const { light, dark } = buildMaterialScheme(seedColor);
  const darkBlock = colorVarBlock(dark);
  const css = [
    `:root{${colorVarBlock(light)}${shapeVarBlock(shape)}}`,
    `html{font-size:${FONT_SCALES[fontScale]};}`,
    `html[data-theme="dark"]{${darkBlock}}`,
    `@media (prefers-color-scheme: dark){html[data-theme="system"]{${darkBlock}}}`,
  ].join("\n");

  cssCache.set(key, css);
  return css;
}

/** Which mode the <html data-theme> attribute should carry for a request. */
export function resolveThemeMode(orgMode: string | null | undefined, userPreference: string | null | undefined): ThemeMode {
  if (userPreference === "light" || userPreference === "dark" || userPreference === "system") return userPreference;
  return normalizeMode(orgMode);
}
