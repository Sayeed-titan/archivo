import "server-only";
import { prisma } from "@/lib/prisma";

export async function generateArchiveNumber(organizationId: string) {
  const year = new Date().getFullYear();
  const prefix = `ARC-${year}-`;

  const count = await prisma.archive.count({
    where: { organizationId, archiveNumber: { startsWith: prefix } },
  });

  return `${prefix}${String(count + 1).padStart(5, "0")}`;
}
