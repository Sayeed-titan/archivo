import { describe, it, expect } from "vitest";
import { computeArchiveHealth } from "@/lib/archive-health";

describe("computeArchiveHealth", () => {
  it("is healthy when nothing is missing and the archive is at a terminal state", () => {
    const health = computeArchiveHealth({ missingMandatoryFolders: 0, isTerminalState: true, isInitialState: false });
    expect(health.level).toBe("healthy");
  });

  it("is healthy when nothing is missing at the initial state", () => {
    const health = computeArchiveHealth({ missingMandatoryFolders: 0, isTerminalState: false, isInitialState: true });
    expect(health.level).toBe("healthy");
  });

  it("is critical when a terminal-state archive is still missing mandatory documents", () => {
    const health = computeArchiveHealth({ missingMandatoryFolders: 2, isTerminalState: true, isInitialState: false });
    expect(health.level).toBe("critical");
    expect(health.missingMandatoryFolders).toBe(2);
  });

  it("needs attention when missing documents but not at a terminal state", () => {
    const health = computeArchiveHealth({ missingMandatoryFolders: 1, isTerminalState: false, isInitialState: false });
    expect(health.level).toBe("needs_attention");
  });

  it("needs attention when nothing is missing but the status matches neither initial nor terminal", () => {
    // This is the fallback for an archive whose status doesn't match any
    // configured WorkflowState (e.g. after a workflow edit renamed/removed
    // it) — see archive-health.ts's module comment. Must not report healthy.
    const health = computeArchiveHealth({ missingMandatoryFolders: 0, isTerminalState: false, isInitialState: false });
    expect(health.level).toBe("needs_attention");
  });

  it("prioritizes critical over needs_attention when both conditions could apply", () => {
    // Terminal + missing docs should never fall through to the generic
    // needs_attention branch — critical is strictly worse and must win.
    const health = computeArchiveHealth({ missingMandatoryFolders: 3, isTerminalState: true, isInitialState: false });
    expect(health.level).toBe("critical");
  });
});
