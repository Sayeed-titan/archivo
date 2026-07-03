import { readFile } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { AVATAR_STORAGE_ROOT } from "@/lib/file-storage";

// Serves a user's profile photo — same org-scoping as every other file
// route, no audit write (viewing an avatar isn't a "download", mirroring
// the thumbnail route's precedent).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  const targetUser = await prisma.user.findFirst({
    where: { id, organizationId: currentUser.organizationId },
  });

  if (!targetUser?.avatarPath) {
    return new Response("Not found", { status: 404 });
  }

  const buffer = await readFile(path.join(AVATAR_STORAGE_ROOT, targetUser.avatarPath));

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
