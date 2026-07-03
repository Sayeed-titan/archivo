import { readFile } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { STORAGE_ROOT } from "@/lib/file-storage";

// Inline-viewing variant of the download route: same auth/org-scoping
// and canDownload gate (viewing full file content is the same exposure
// as downloading it), but Content-Disposition: inline instead of
// attachment, and — mirroring the thumbnail route's precedent — does
// NOT write a FileDownload/audit "download" row, since opening a preview
// dialog isn't a download for SRS FR-4.6 purposes. No watermarking here
// either: watermarks apply at actual-download time, not to an in-app
// preview of the original.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user.role.canDownload) {
    return new Response("Forbidden", { status: 403 });
  }

  const file = await prisma.file.findFirst({
    where: {
      id,
      deletedAt: null,
      folder: { archive: { organizationId: user.organizationId } },
    },
  });

  if (!file) {
    return new Response("Not found", { status: 404 });
  }

  const buffer = await readFile(path.join(STORAGE_ROOT, file.storagePath));

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${file.filename}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
