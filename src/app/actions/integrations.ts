"use server";

import { readFile } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getConnector, type OpenableFileKind } from "@/lib/connectors";
import { STORAGE_ROOT } from "@/lib/file-storage";

const OPENABLE_KINDS: ReadonlySet<string> = new Set<OpenableFileKind>(["word", "excel", "powerpoint"]);

// "Open in <provider>" (Prompt 4): uploads the file's current bytes into
// the org's configured editor the first time, then reuses the same
// ExternalDocLink (and just refreshes the open URL) on subsequent opens.
export async function openInExternalEditor(fileId: string) {
  const user = await getCurrentUser();

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } });
  if (!org.docEditorProvider) {
    throw new Error("No document editor is connected for this organization yet.");
  }

  const file = await prisma.file.findFirst({
    where: { id: fileId, folder: { archive: { organizationId: user.organizationId } } },
    include: { externalDocLink: true },
  });
  if (!file) {
    throw new Error("File not found.");
  }
  if (!OPENABLE_KINDS.has(file.fileType)) {
    throw new Error("Only Word/Excel/PowerPoint files can be opened in an external editor.");
  }

  const connector = getConnector(org.docEditorProvider as "google" | "microsoft");

  let openUrl: string;

  if (file.externalDocLink) {
    openUrl = await connector.getOpenUrl(file.externalDocLink.externalId);
  } else {
    const buffer = await readFile(path.join(STORAGE_ROOT, file.storagePath));
    const result = await connector.openOrCreate({
      organizationId: user.organizationId,
      userId: user.id,
      fileName: file.filename,
      fileKind: file.fileType as OpenableFileKind,
      fileBuffer: buffer,
      mimeType: file.mimeType,
    });

    await prisma.externalDocLink.create({
      data: {
        fileId: file.id,
        provider: org.docEditorProvider,
        externalId: result.externalId,
        externalUrl: result.externalUrl,
        createdById: user.id,
      },
    });

    openUrl = result.externalUrl;
  }

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorId: user.id,
      action: "download", // opening for edit is treated as an access event for audit purposes
      entityType: "File",
      entityId: file.id,
      note: `opened in ${org.docEditorProvider}`,
    },
  });

  return { openUrl };
}
