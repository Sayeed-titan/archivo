import { describe, it, expect } from "vitest";
import { parseRequirements, isValidRequirement, describeRequirement, getRequirableFields } from "@/lib/workflow/requirements";

describe("isValidRequirement", () => {
  it("accepts all three known requirement kinds", () => {
    expect(isValidRequirement({ kind: "mandatoryFoldersFilled" })).toBe(true);
    expect(isValidRequirement({ kind: "folderTypeCountsSatisfied" })).toBe(true);
    expect(isValidRequirement({ kind: "fieldRequired", field: "venue" })).toBe(true);
  });

  it("rejects fieldRequired without a string field", () => {
    expect(isValidRequirement({ kind: "fieldRequired" })).toBe(false);
    expect(isValidRequirement({ kind: "fieldRequired", field: 5 })).toBe(false);
  });

  it("rejects unknown kinds and non-objects", () => {
    expect(isValidRequirement({ kind: "somethingElse" })).toBe(false);
    expect(isValidRequirement(null)).toBe(false);
    expect(isValidRequirement("mandatoryFoldersFilled")).toBe(false);
  });
});

describe("parseRequirements", () => {
  it("filters out invalid entries instead of throwing on malformed stored JSON", () => {
    const stored = [
      { kind: "mandatoryFoldersFilled" },
      { kind: "bogus" },
      "not an object",
      { kind: "fieldRequired", field: "donor" },
      null,
    ];
    const result = parseRequirements(stored);
    expect(result).toEqual([{ kind: "mandatoryFoldersFilled" }, { kind: "fieldRequired", field: "donor" }]);
  });

  it("returns an empty array for non-array input", () => {
    expect(parseRequirements(null)).toEqual([]);
    expect(parseRequirements(undefined)).toEqual([]);
    expect(parseRequirements({})).toEqual([]);
  });
});

describe("describeRequirement", () => {
  it("describes each requirement kind in plain language", () => {
    expect(describeRequirement({ kind: "mandatoryFoldersFilled" })).toMatch(/mandatory folders/i);
    expect(describeRequirement({ kind: "folderTypeCountsSatisfied" })).toMatch(/minimum file counts/i);
  });

  it("uses the field's human label, falling back to the raw key", () => {
    expect(describeRequirement({ kind: "fieldRequired", field: "venue" })).toBe('"Venue" must be filled in');
    expect(describeRequirement({ kind: "fieldRequired", field: "notARealField" })).toBe('"notARealField" must be filled in');
  });
});

describe("getRequirableFields", () => {
  it("matches the archive metadata fields the workflow settings UI offers", () => {
    const keys = getRequirableFields().map((f) => f.key);
    expect(keys).toEqual([
      "department",
      "eventDate",
      "venue",
      "organizer",
      "coordinator",
      "donor",
      "projectName",
      "description",
    ]);
  });
});
