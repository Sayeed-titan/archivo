import { describe, it, expect } from "vitest";
import { archiveVisibilityWhere } from "@/lib/visibility";
import type { User, Role } from "@/generated/prisma/client";

function user(roleOverrides: Partial<Role> = {}, userOverrides: Partial<User> = {}) {
  const role = { canViewAll: false, ...roleOverrides } as Role;
  return {
    id: "user_1",
    organizationId: "org_1",
    department: "Programs",
    ...userOverrides,
    role,
  } as User & { role: Role };
}

describe("archiveVisibilityWhere", () => {
  it("always scopes to the user's own organization and excludes soft-deleted archives", () => {
    const where = archiveVisibilityWhere(user({ canViewAll: true }));
    expect(where.organizationId).toBe("org_1");
    expect(where.deletedAt).toBeNull();
  });

  it("grants unrestricted org-wide visibility when the role can view all", () => {
    const where = archiveVisibilityWhere(user({ canViewAll: true }));
    // No additional OR-scoping beyond org + not-deleted — this is the
    // exact clause that must never accidentally leak into a second org.
    expect(where).toEqual({ organizationId: "org_1", deletedAt: null });
  });

  it("restricts to own-created-or-own-department when the role cannot view all", () => {
    const where = archiveVisibilityWhere(user({ canViewAll: false }, { id: "user_2", department: "Finance" }));
    expect(where.OR).toEqual([{ createdById: "user_2" }, { department: "Finance" }]);
  });

  it("omits the department clause entirely when the user has no department set", () => {
    const where = archiveVisibilityWhere(user({ canViewAll: false }, { department: null }));
    expect(where.OR).toEqual([{ createdById: "user_1" }]);
  });

  it("never includes another organization's id, regardless of role", () => {
    const restricted = archiveVisibilityWhere(user({ canViewAll: false }));
    const unrestricted = archiveVisibilityWhere(user({ canViewAll: true }));
    expect(restricted.organizationId).toBe("org_1");
    expect(unrestricted.organizationId).toBe("org_1");
  });
});
