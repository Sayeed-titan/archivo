import "server-only";
import type { Role } from "@/generated/prisma/client";

export class ForbiddenError extends Error {
  constructor(action: string) {
    super(`Not authorized to ${action}`);
  }
}

export function requirePermission(role: Role, permission: keyof Role, action: string) {
  if (!role[permission]) {
    throw new ForbiddenError(action);
  }
}
