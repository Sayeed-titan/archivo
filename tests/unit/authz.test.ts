import { describe, it, expect } from "vitest";
import { requirePermission, ForbiddenError } from "@/lib/authz";
import type { Role } from "@/generated/prisma/client";

function role(overrides: Partial<Role> = {}): Role {
  return {
    id: "role_1",
    organizationId: "org_1",
    name: "Test Role",
    canCreateArchive: false,
    canUpload: false,
    canEditMetadata: false,
    canDeleteArchive: false,
    canHardDelete: false,
    canManageUsers: false,
    canManageSettings: false,
    canGenerateReport: false,
    canViewAll: false,
    canDownload: false,
    createdById: null,
    updatedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Role;
}

describe("requirePermission", () => {
  it("does not throw when the role has the flag", () => {
    expect(() => requirePermission(role({ canCreateArchive: true }), "canCreateArchive", "create an archive")).not.toThrow();
  });

  it("throws ForbiddenError when the role lacks the flag", () => {
    expect(() => requirePermission(role(), "canCreateArchive", "create an archive")).toThrow(ForbiddenError);
  });

  it("includes the action description in the error message", () => {
    try {
      requirePermission(role(), "canHardDelete", "permanently delete an archive");
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenError);
      expect((e as Error).message).toContain("permanently delete an archive");
    }
  });

  it("checks the specific flag requested, not any truthy permission", () => {
    // A role with canDownload=true but canDeleteArchive=false must still
    // be rejected for a delete action — this is the exact invariant the
    // rest of the app depends on (never trust "some" permission as "any").
    expect(() => requirePermission(role({ canDownload: true }), "canDeleteArchive", "delete an archive")).toThrow(
      ForbiddenError
    );
  });
});
