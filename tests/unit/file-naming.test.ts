import { describe, it, expect } from "vitest";
import { resolveFileName, previewFileName, DEFAULT_NAMING_TEMPLATE, type NamingContext } from "@/lib/file-naming";

function ctx(overrides: Partial<NamingContext> = {}): NamingContext {
  return {
    originalName: "site-visit-photo.jpg",
    folderName: "Photos",
    archiveName: "Annual General Meeting 2027",
    archiveNumber: "ARC-2027-00012",
    eventDate: new Date(2027, 2, 15),
    department: "Programs",
    sequence: 1,
    ...overrides,
  };
}

describe("resolveFileName", () => {
  it("substitutes every token and keeps the original extension", () => {
    const result = resolveFileName(DEFAULT_NAMING_TEMPLATE, ctx());
    expect(result).toBe("site-visit-photo_Photos_Annual General Meeting 2027_2027-03-15.jpg");
  });

  it("preserves literal separators the admin put between tokens", () => {
    const result = resolveFileName("{archiveNumber}-{sequence}", ctx());
    expect(result).toBe("ARC-2027-00012-1.jpg");
  });

  it("blanks a token with no value rather than leaving the placeholder text", () => {
    const result = resolveFileName("{originalName}_{eventDate}", ctx({ eventDate: null }));
    // Collapsed trailing "_" from the now-empty {eventDate} token.
    expect(result).toBe("site-visit-photo.jpg");
  });

  it("collapses repeated separators left by two consecutive blank tokens", () => {
    const result = resolveFileName("{originalName}_{department}_{eventDate}_end", ctx({ department: null, eventDate: null }));
    expect(result).toBe("site-visit-photo_end.jpg");
  });

  it("sanitizes filesystem-hostile characters in resolved values, not in the template's own separators", () => {
    const result = resolveFileName("{archiveName}/{folderName}", ctx({ archiveName: "Q1: Report?", folderName: "A/V" }));
    // The "/" between tokens is a literal the admin typed — untouched. The
    // ":" and "?" inside archiveName and the "/" inside folderName (the
    // *values*, not the template) are what get sanitized to "-".
    expect(result).toBe("Q1- Report-/A-V.jpg");
    expect(result.split("/")).toHaveLength(2); // literal separator preserved exactly once
  });

  it("falls back to the original base name if the whole template resolves empty", () => {
    const result = resolveFileName("{department}", ctx({ department: null }));
    expect(result).toBe("site-visit-photo.jpg");
  });

  it("handles a file with no extension", () => {
    const result = resolveFileName("{originalName}", ctx({ originalName: "README" }));
    expect(result).toBe("README");
  });
});

describe("previewFileName", () => {
  it("produces the documented example output for the default template", () => {
    expect(previewFileName(DEFAULT_NAMING_TEMPLATE)).toBe(
      "site-visit-photo_Photos_Annual General Meeting 2027_2027-03-15.jpg"
    );
  });
});
