import { readFile } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { STORAGE_ROOT } from "@/lib/file-storage";

// SRS.md FR-6.2: serves the auto-generated video thumbnail. Deliberately
// lighter than the download route — viewing a thumbnail is not a
// "download" for FileDownload/audit-log purposes (SRS FR-4.6 tracks
// downloads of the actual file, not preview images).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const file = await prisma.file.findFirst({
    where: {
      id,
      deletedAt: null,
      folder: { archive: { organizationId: user.organizationId } },
    },
  });

  if (!file?.thumbnailPath) {
    return new Response("Not found", { status: 404 });
  }

  const buffer = await readFile(path.join(STORAGE_ROOT, file.thumbnailPath));

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
