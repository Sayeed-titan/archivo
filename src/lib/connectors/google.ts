import "server-only";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import type { DocEditorConnector, OpenableFileKind, OpenInResult } from "./types";

const GOOGLE_MIME_TYPES: Record<OpenableFileKind, string> = {
  word: "application/vnd.google-apps.document",
  excel: "application/vnd.google-apps.spreadsheet",
  powerpoint: "application/vnd.google-apps.presentation",
};

// Requires, in Google Cloud Console: a project with the Drive API enabled,
// an OAuth 2.0 Web client (Client ID/Secret), and this redirect URI added
// under "Authorized redirect URIs". Scope requested is drive.file, which
// only grants access to files this app creates/opens — not the user's
// whole Drive. See docs/ngo-archive for where OAuth setup is tracked.
function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getGoogleAuthUrl(state: string) {
  const client = oauthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/drive.file"],
    state,
  });
}

export async function exchangeGoogleCode(code: string) {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

async function getAuthorizedClient(organizationId: string) {
  const integration = await prisma.orgIntegration.findUnique({
    where: { organizationId_provider: { organizationId, provider: "google" } },
  });
  if (!integration) {
    throw new Error("Google Workspace is not connected for this organization.");
  }

  const client = oauthClient();
  client.setCredentials(integration.credentials as Record<string, unknown>);

  client.on("tokens", async (tokens) => {
    if (!tokens.refresh_token) return;
    await prisma.orgIntegration.update({
      where: { organizationId_provider: { organizationId, provider: "google" } },
      data: { credentials: { ...(integration.credentials as object), ...tokens } },
    });
  });

  return client;
}

export const googleConnector: DocEditorConnector = {
  provider: "google",

  async isConfigured(organizationId) {
    const integration = await prisma.orgIntegration.findUnique({
      where: { organizationId_provider: { organizationId, provider: "google" } },
    });
    return integration !== null;
  },

  async openOrCreate({ organizationId, fileName, fileKind, fileBuffer, mimeType }): Promise<OpenInResult> {
    const auth = await getAuthorizedClient(organizationId);
    const drive = google.drive({ version: "v3", auth });

    const { Readable } = await import("stream");
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: GOOGLE_MIME_TYPES[fileKind],
      },
      media: {
        mimeType,
        body: Readable.from(fileBuffer),
      },
      fields: "id, webViewLink",
    });

    const externalId = response.data.id;
    const externalUrl = response.data.webViewLink;
    if (!externalId || !externalUrl) {
      throw new Error("Google Drive did not return a file ID/URL.");
    }

    return { externalId, externalUrl };
  },

  async getOpenUrl(externalId) {
    return `https://drive.google.com/open?id=${externalId}`;
  },
};
