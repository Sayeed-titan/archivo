import { describe, it, expect } from "vitest";
import { parseFolderRules, describeFolderRules } from "@/lib/folder-rules";

describe("parseFolderRules", () => {
  it("returns an empty object for malformed/legacy stored values instead of throwing", () => {
    expect(parseFolderRules(null)).toEqual({});
    expect(parseFolderRules(undefined)).toEqual({});
    expect(parseFolderRules("not an object")).toEqual({});
    expect(parseFolderRules({})).toEqual({});
  });

  it("keeps only recognized file type categories in allowedFileTypes", () => {
    const rules = parseFolderRules({ allowedFileTypes: ["image", "pdf", "not-a-real-type"] });
    expect(rules.allowedFileTypes).toEqual(["image", "pdf"]);
  });

  it("drops allowedFileTypes entirely if every entry is invalid", () => {
    const rules = parseFolderRules({ allowedFileTypes: ["bogus"] });
    expect(rules.allowedFileTypes).toBeUndefined();
  });

  it("parses per-type min/max counts, dropping invalid entries", () => {
    const rules = parseFolderRules({
      counts: {
        image: { min: 2, max: 10 },
        pdf: { min: -1 }, // invalid: negative
        notAType: { min: 1 }, // invalid: unknown category
        video: {}, // invalid: neither min nor max present
      },
    });
    expect(rules.counts).toEqual({ image: { min: 2, max: 10 } });
  });

  it("parses minResolution only when both dimensions are positive numbers", () => {
    expect(parseFolderRules({ minResolution: { width: 800, height: 600 } }).minResolution).toEqual({
      width: 800,
      height: 600,
    });
    expect(parseFolderRules({ minResolution: { width: 0, height: 600 } }).minResolution).toBeUndefined();
  });

  it("parses maxSizeBytes only when positive", () => {
    expect(parseFolderRules({ maxSizeBytes: 5_000_000 }).maxSizeBytes).toBe(5_000_000);
    expect(parseFolderRules({ maxSizeBytes: -1 }).maxSizeBytes).toBeUndefined();
  });

  it("filters blank strings out of alternateOptions.options", () => {
    const rules = parseFolderRules({ alternateOptions: { enabled: true, options: ["Scan", "  ", "Photo"] } });
    expect(rules.alternateOptions).toEqual({ enabled: true, options: ["Scan", "Photo"] });
  });
});

describe("describeFolderRules", () => {
  it("describes an empty rules object as no lines", () => {
    expect(describeFolderRules({})).toEqual([]);
  });

  it("produces one human-readable line per configured rule", () => {
    const lines = describeFolderRules({
      allowedFileTypes: ["image", "pdf"],
      maxSizeBytes: 10 * 1024 * 1024,
      counts: { image: { min: 2 } },
    });
    expect(lines).toContain("Accepted types: image, pdf");
    expect(lines).toContain("Max file size: 10.0 MB");
    expect(lines).toContain("image: min 2");
  });
});
