import "server-only";
import type { Prisma, User, Role } from "@/generated/prisma/client";

// SRS.md FR-9: Department Users see only their own department's archives;
// Administrator/Archive Officer/Viewer see everything in the organization
// (Viewer's restriction is read-only vs. write, not scope — see FR-9 table).
export function archiveVisibilityWhere(user: User & { role: Role }): Prisma.ArchiveWhereInput {
  const base: Prisma.ArchiveWhereInput = {
    organizationId: user.organizationId,
    deletedAt: null,
  };

  if (user.role.canViewAll) {
    return base;
  }

  return {
    ...base,
    OR: [{ createdById: user.id }, ...(user.department ? [{ department: user.department }] : [])],
  };
}
