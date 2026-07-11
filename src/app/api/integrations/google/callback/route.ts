import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/session";
import { exchangeGoogleCode } from "@/lib/connectors/google";
import { resolveClientIp } from "@/lib/request-ip";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return new Response("Missing code or state.", { status: 400 });
  }

  const payload = await decrypt(state);
  if (!payload?.organizationId || !payload?.userId) {
    return new Response("Invalid or expired OAuth state.", { status: 400 });
  }

  const tokens = await exchangeGoogleCode(code);
  const credentials = JSON.parse(JSON.stringify(tokens));
  const ip = await resolveClientIp();

  // No getCurrentUser() call in this OAuth redirect flow (the actor comes
  // from the encrypted `state` payload, not the current session), so this
  // is outside the audit Prisma extension's ALS context — createdIp is set
  // explicitly instead.
  await prisma.orgIntegration.upsert({
    where: { organizationId_provider: { organizationId: payload.organizationId, provider: "google" } },
    update: { credentials, connectedById: payload.userId, updatedIp: ip },
    create: {
      organizationId: payload.organizationId,
      provider: "google",
      credentials,
      connectedById: payload.userId,
      createdIp: ip,
    },
  });

  await prisma.organization.update({
    where: { id: payload.organizationId },
    data: { docEditorProvider: "google" },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: payload.organizationId,
      actorId: payload.userId,
      action: "create",
      entityType: "OrgIntegration",
      entityId: "google",
    },
  });

  return NextResponse.redirect(new URL("/settings/integrations", request.url));
}
