import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "@/lib/session";
import { prisma, withConnectionRetry } from "@/lib/prisma";
import { runWithAuditContext } from "@/lib/audit-context";
import { resolveClientIp } from "@/lib/request-ip";

export const verifySession = cache(async () => {
  const cookie = (await cookies()).get("session")?.value;
  const session = await decrypt(cookie);

  if (!session?.userId) {
    redirect("/login");
  }

  return session;
});

// Optimistic variant for places (e.g. layouts) that need to know auth state
// without forcing a redirect — see Next.js auth guide on layout auth checks.
export const getOptionalSession = cache(async () => {
  const cookie = (await cookies()).get("session")?.value;
  return decrypt(cookie);
});

// Shell/layout variant: full user + role + organization (nav permissions
// and org theme settings), returning null when logged out instead of
// redirecting — the root layout renders the login screen chrome-free.
export const getShellUser = cache(async () => {
  const cookie = (await cookies()).get("session")?.value;
  const session = await decrypt(cookie);
  if (!session?.userId) return null;

  return withConnectionRetry(() =>
    prisma.user.findFirst({
      where: { id: session.userId, organizationId: session.organizationId, isActive: true },
      include: { role: true, organization: true },
    })
  );
});

export const getCurrentUser = cache(async () => {
  const session = await verifySession();

  const user = await withConnectionRetry(() =>
    prisma.user.findFirst({
      where: { id: session.userId, organizationId: session.organizationId, isActive: true },
      include: { role: true },
    })
  );

  if (!user) {
    redirect("/login");
  }

  return user;
});

// Every mutating Server Action's first line should call this instead of
// getCurrentUser() directly — it resolves the same user, but also stamps the
// actor + client IP into AsyncLocalStorage for the duration of the wrapped
// callback, so the Prisma audit extension (src/lib/prisma.ts) can populate
// createdById/updatedById/createdIp/updatedIp with zero further plumbing.
// Read-only Server Components (pages, layouts) should keep using
// getCurrentUser()/getShellUser() directly — they never call create/update.
export async function withAuditContext<T>(
  fn: (user: Awaited<ReturnType<typeof getCurrentUser>>) => Promise<T>
): Promise<T> {
  const user = await getCurrentUser();
  const ip = await resolveClientIp();
  return runWithAuditContext({ userId: user.id, userName: user.name, ip }, () => fn(user));
}
