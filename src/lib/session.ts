import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";

// Read lazily (not at module load) so `next build` can statically collect
// page data without SESSION_SECRET set — Docker builds have no runtime env
// vars available at build time. Real requests always have it set (Render
// injects it via render.yaml's generateValue: true).
function getEncodedKey() {
  const secretKey = process.env.SESSION_SECRET;
  if (!secretKey) {
    throw new Error("SESSION_SECRET environment variable is required");
  }
  return new TextEncoder().encode(secretKey);
}

export type SessionPayload = {
  userId: string;
  organizationId: string;
  expiresAt: string;
};

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getEncodedKey());
}

export async function decrypt(session: string | undefined = "") {
  try {
    const { payload } = await jwtVerify(session, getEncodedKey(), {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(userId: string, organizationId: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await encrypt({ userId, organizationId, expiresAt: expiresAt.toISOString() });
  const cookieStore = await cookies();

  // Trust the reverse proxy's X-Forwarded-Proto over NODE_ENV where present —
  // a `production` NODE_ENV behind a plain-HTTP proxy (no TLS/domain yet)
  // would otherwise set `secure: true` on a cookie served over HTTP, which
  // browsers silently refuse to store: login "succeeds" but the very next
  // request has no cookie and bounces back to /login. Falls back to the old
  // NODE_ENV check when there's no proxy in front (e.g. local dev).
  const headersList = await headers();
  const forwardedProto = headersList.get("x-forwarded-proto");
  const isSecure = forwardedProto ? forwardedProto === "https" : process.env.NODE_ENV === "production";

  cookieStore.set("session", session, {
    httpOnly: true,
    secure: isSecure,
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
