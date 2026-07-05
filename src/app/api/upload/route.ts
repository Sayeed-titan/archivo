import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { requirePermission } from "@/lib/authz";
import { processUpload, type ProcessUploadTarget } from "@/lib/file-storage";

// Progress-capable replacement for the form-action upload path (Server
// Actions give no client-visible upload progress — no XHR/fetch-upload
// progress events reach them). This route is called via XMLHttpRequest
// from src/components/upload/upload-progress.tsx, one request per file,
// so the client can track xhr.upload.onprogress for a real byte-level
// progress bar and per-file completion state.
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  requirePermission(user.role, "canUpload", "upload files");

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "No file provided." }, { status: 400 });
  }

  const isInbox = formData.get("isInbox") === "true";
  const target: ProcessUploadTarget = isInbox
    ? { kind: "inbox" }
    : { kind: "folder", archiveId: String(formData.get("archiveId") ?? ""), folderId: String(formData.get("folderId") ?? "") };
  const alternateOptionLabel = formData.get("alternateOptionLabel");

  const result = await processUpload(target, file, user, typeof alternateOptionLabel === "string" ? alternateOptionLabel : undefined);
  if (!result.ok) {
    return NextResponse.json({ message: result.message, offerExternalLink: result.offerExternalLink }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
