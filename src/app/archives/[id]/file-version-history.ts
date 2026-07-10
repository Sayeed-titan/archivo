import "server-only";
import { prisma } from "@/lib/prisma";
import type { FileWithUploader } from "./file-row";

export async function getVersionHistory(fileId: string): Promise<FileWithUploader[]> {
  const history: FileWithUploader[] = [];
  let currentId: string | null = fileId;

  while (currentId) {
    const file: FileWithUploader | null = await prisma.file.findUnique({
      where: { id: currentId },
      include: { uploadedBy: true },
    });
    if (!file) break;
    history.push(file);
    currentId = file.previousVersionId;
  }

  return history;
}
