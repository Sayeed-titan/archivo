import type { File as PrismaFile, User } from "@/generated/prisma/client";

export type ExplorerFile = PrismaFile & { uploadedBy: User };

export type ExplorerFileWithHistory = ExplorerFile & { history: ExplorerFile[] };

export type ExplorerFolder = {
  id: string;
  name: string;
  isMandatory: boolean;
  color: string | null;
  canView: boolean;
  canUpload: boolean;
  files: ExplorerFileWithHistory[];
  rules?: import("@/lib/folder-rules").FolderRules;
};
