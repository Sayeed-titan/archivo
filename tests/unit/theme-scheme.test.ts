import { describe, it, expect } from "vitest";
import { normalizeSeedColor, buildMaterialScheme, DEFAULT_SEED_COLOR } from "@/lib/theme/scheme";

describe("normalizeSeedColor", () => {
  it("passes through a valid 6-digit hex color, lowercased", () => {
    expect(normalizeSeedColor("#2E7D32")).toBe("#2e7d32");
  });

  it("falls back to the default seed for null/empty/malformed input", () => {
    expect(normalizeSeedColor(null)).toBe(DEFAULT_SEED_COLOR);
    expect(normalizeSeedColor(undefined)).toBe(DEFAULT_SEED_COLOR);
    expect(normalizeSeedColor("")).toBe(DEFAULT_SEED_COLOR);
    expect(normalizeSeedColor("not-a-color")).toBe(DEFAULT_SEED_COLOR);
    expect(normalizeSeedColor("#fff")).toBe(DEFAULT_SEED_COLOR); // 3-digit shorthand not accepted
  });
});

describe("buildMaterialScheme", () => {
  it("is deterministic — the same seed always produces the same palette", () => {
    const a = buildMaterialScheme("#6750A4");
    const b = buildMaterialScheme("#6750A4");
    expect(a).toEqual(b);
  });

  it("produces a full light and dark role set, all valid hex colors", () => {
    const { light, dark } = buildMaterialScheme("#2e7d32");
    const hex = /^#[0-9a-f]{6}$/i;

    for (const role of ["primary", "on-primary", "surface", "outline", "error"]) {
      expect(light[role]).toMatch(hex);
      expect(dark[role]).toMatch(hex);
    }
  });

  it("includes the harmonized success/warning extension roles", () => {
    const { light, dark } = buildMaterialScheme(DEFAULT_SEED_COLOR);
    for (const role of ["success", "on-success", "success-container", "on-success-container", "warning", "on-warning"]) {
      expect(light[role]).toBeDefined();
      expect(dark[role]).toBeDefined();
    }
  });

  it("produces a different palette for a different seed color", () => {
    const a = buildMaterialScheme("#2e7d32");
    const b = buildMaterialScheme("#ab2e2e");
    expect(a.light.primary).not.toBe(b.light.primary);
  });
});
