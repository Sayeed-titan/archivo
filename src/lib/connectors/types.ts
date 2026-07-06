import "server-only";

export type DocEditorProvider = "google" | "microsoft";

export type OpenableFileKind = "word" | "excel" | "powerpoint";

export type OpenInResult = {
  externalId: string;
  externalUrl: string;
};

// Pluggable "open in" connector (Prompt 4 / HANDOFF.md point 5): an
// organization picks one provider in settings. Each connector is
// responsible for getting an Office-type file into its own editor and
// handing back an ID + URL the app can store on ExternalDocLink.
//
// This interface intentionally does NOT expose provider-specific
// concepts (Drive folder IDs, SharePoint site IDs, etc.) — callers only
// deal with a local File's bytes/kind/name and get back an opaque
// externalId + externalUrl.
export interface DocEditorConnector {
  readonly provider: DocEditorProvider;

  // True once the organization has completed OAuth/API setup for this
  // provider (e.g. has valid stored tokens). Callers should check this
  // before offering the "open in" action.
  isConfigured(organizationId: string): Promise<boolean>;

  // Uploads/converts a local file into the provider's native editor
  // format and returns identifiers for future opens.
  openOrCreate(params: {
    organizationId: string;
    userId: string;
    fileName: string;
    fileKind: OpenableFileKind;
    fileBuffer: Buffer;
    mimeType: string;
  }): Promise<OpenInResult>;

  // Builds a fresh "open" URL for an already-linked external document
  // (tokens/URLs can expire or need re-signing depending on provider).
  getOpenUrl(externalId: string): Promise<string>;

  // Grants a specific end user edit access to an already-created external
  // document, so embedded edits are attributed to them individually rather
  // than the org's shared connector account. Callers should only need to
  // call this once per (document, user) pair — see ExternalDocShare.
  shareWithUser(externalId: string, organizationId: string, userEmail: string): Promise<void>;
}
