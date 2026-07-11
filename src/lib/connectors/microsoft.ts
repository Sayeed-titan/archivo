import "server-only";
import type { DocEditorConnector, OpenInResult } from "./types";

// Stub: shows the shape a Microsoft 365 connector would take, without
// wiring real OAuth/Graph API calls yet. To implement for real:
// 1. Register an app in Azure AD (Entra ID) — Web platform, redirect URI,
//    and Files.ReadWrite scope (Microsoft Graph, delegated).
// 2. Exchange the auth code for tokens via the Microsoft identity platform
//    (msal-node is the standard client, parallel to googleapis here).
// 3. Upload the file to the org's OneDrive/SharePoint via Graph
//    (`PUT /me/drive/root:/path/to/file:/content` or a Sites drive), then
//    read back `webUrl` for getOpenUrl.
// Swapping this in for `googleConnector` in getConnector() below is the
// entire integration point — nothing else in the app needs to change.
export const microsoftConnector: DocEditorConnector = {
  provider: "microsoft",

  async isConfigured() {
    return false;
  },

  async openOrCreate(): Promise<OpenInResult> {
    throw new Error("Microsoft 365 connector is not implemented yet.");
  },

  async getOpenUrl(): Promise<string> {
    throw new Error("Microsoft 365 connector is not implemented yet.");
  },

  async getEmbedUrl(): Promise<string> {
    throw new Error("Microsoft 365 connector is not implemented yet.");
  },

  async shareWithUser(): Promise<void> {
    throw new Error("Microsoft 365 connector is not implemented yet.");
  },
};
