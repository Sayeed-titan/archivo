import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { getGoogleAuthUrl } from "@/lib/connectors/google";
import { encrypt } from "@/lib/session";

// Starting the OAuth flow requires canManageSettings — only an
// Administrator connects the org-wide Google Workspace integration.
export async function GET() {
  const user = await getCurrentUser();
  if (!user.role.canManageSettings) {
    return new Response("Forbidden", { status: 403 });
  }

  // Reuse the session JWT signer for a short-lived, tamper-proof state
  // token carrying which org initiated the flow (Google's redirect can't
  // otherwise be tied back to our session across the external hop).
  const state = await encrypt({
    userId: user.id,
    organizationId: user.organizationId,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  return NextResponse.redirect(getGoogleAuthUrl(state));
}
