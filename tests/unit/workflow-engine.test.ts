import { describe, it, expect } from "vitest";
import { evaluateRequirement, evaluateRequirements } from "@/lib/workflow/engine";
import type { WorkflowRequirement } from "@/lib/workflow/requirements";

// Minimal shape matching what evaluateRequirement actually reads — see the
// (unexported) ArchiveWithFolders type in src/lib/workflow/engine.ts, whose
// real shape we borrow via Parameters<> instead of duplicating or using any.
type TestArchive = Parameters<typeof evaluateRequirement>[0];
type TestFolder = TestArchive["folders"][number];

function archive(overrides: Record<string, unknown> = {}, folders: TestFolder[] = []): TestArchive {
  return { department: null, eventDate: null, ...overrides, folders } as unknown as TestArchive;
}

function folder(opts: { isMandatory?: boolean; files?: { fileType: string }[]; rules?: unknown } = {}): TestFolder {
  return {
    isMandatory: opts.isMandatory ?? false,
    files: opts.files ?? [],
    folderTemplate: opts.rules !== undefined ? { rules: opts.rules } : null,
  } as unknown as TestFolder;
}

describe("evaluateRequirement — mandatoryFoldersFilled", () => {
  const req: WorkflowRequirement = { kind: "mandatoryFoldersFilled" };

  it("is satisfied when every mandatory folder has at least one file", () => {
    const a = archive({}, [
      folder({ isMandatory: true, files: [{ fileType: "pdf" }] }),
      folder({ isMandatory: false, files: [] }),
    ]);
    expect(evaluateRequirement(a, req)).toBe(true);
  });

  it("is not satisfied when a mandatory folder is empty", () => {
    const a = archive({}, [
      folder({ isMandatory: true, files: [] }),
      folder({ isMandatory: false, files: [{ fileType: "pdf" }] }),
    ]);
    expect(evaluateRequirement(a, req)).toBe(false);
  });

  it("is satisfied with no folders at all (vacuous truth)", () => {
    expect(evaluateRequirement(archive({}, []), req)).toBe(true);
  });
});

describe("evaluateRequirement — folderTypeCountsSatisfied", () => {
  const req: WorkflowRequirement = { kind: "folderTypeCountsSatisfied" };

  it("is satisfied when a folder has no configured counts", () => {
    const a = archive({}, [folder({ files: [] })]);
    expect(evaluateRequirement(a, req)).toBe(true);
  });

  it("is not satisfied when a per-type minimum isn't met", () => {
    const a = archive({}, [
      folder({ files: [{ fileType: "image" }], rules: { counts: { image: { min: 3 } } } }),
    ]);
    expect(evaluateRequirement(a, req)).toBe(false);
  });

  it("is satisfied once the per-type minimum is met", () => {
    const a = archive({}, [
      folder({
        files: [{ fileType: "image" }, { fileType: "image" }, { fileType: "image" }],
        rules: { counts: { image: { min: 3 } } },
      }),
    ]);
    expect(evaluateRequirement(a, req)).toBe(true);
  });

  it("only counts files matching the configured type", () => {
    const a = archive({}, [
      folder({
        files: [{ fileType: "pdf" }, { fileType: "pdf" }],
        rules: { counts: { image: { min: 1 } } },
      }),
    ]);
    expect(evaluateRequirement(a, req)).toBe(false);
  });
});

describe("evaluateRequirement — fieldRequired", () => {
  it("is not satisfied when the field is null, undefined, or empty string", () => {
    for (const value of [null, undefined, ""]) {
      const a = archive({ venue: value });
      expect(evaluateRequirement(a, { kind: "fieldRequired", field: "venue" })).toBe(false);
    }
  });

  it("is satisfied once the field has a value", () => {
    const a = archive({ venue: "Head Office Auditorium" });
    expect(evaluateRequirement(a, { kind: "fieldRequired", field: "venue" })).toBe(true);
  });

  it("treats 0 and false as present (not empty)", () => {
    const a = archive({ someCount: 0, someFlag: false });
    expect(evaluateRequirement(a, { kind: "fieldRequired", field: "someCount" })).toBe(true);
    expect(evaluateRequirement(a, { kind: "fieldRequired", field: "someFlag" })).toBe(true);
  });
});

describe("evaluateRequirements", () => {
  it("evaluates every requirement independently and reports which failed", () => {
    const a = archive({ venue: "" }, [folder({ isMandatory: true, files: [] })]);
    const requirements: WorkflowRequirement[] = [
      { kind: "mandatoryFoldersFilled" },
      { kind: "fieldRequired", field: "venue" },
    ];

    const checks = evaluateRequirements(a, requirements);

    expect(checks).toHaveLength(2);
    expect(checks.every((c) => c.satisfied === false)).toBe(true);
  });
});
