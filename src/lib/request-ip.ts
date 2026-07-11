import "server-only";
import { headers } from "next/headers";

// Local dev has no reverse proxy in front of `next dev`, so this resolves to
// null (or a loopback address) outside a real deployment — expected, not a bug.
export async function resolveClientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip");
}
