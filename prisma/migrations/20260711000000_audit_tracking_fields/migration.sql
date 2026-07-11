-- AlterTable
ALTER TABLE "archives" ADD COLUMN     "createdIp" TEXT,
ADD COLUMN     "eventEndDate" TIMESTAMP(3),
ADD COLUMN     "updatedById" TEXT,
ADD COLUMN     "updatedIp" TEXT;

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "ip" TEXT;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "createdIp" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedById" TEXT,
ADD COLUMN     "updatedIp" TEXT;

-- AlterTable
ALTER TABLE "custom_field_definitions" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "createdIp" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedById" TEXT,
ADD COLUMN     "updatedIp" TEXT;

-- AlterTable
ALTER TABLE "external_doc_links" ADD COLUMN     "createdIp" TEXT;

-- AlterTable
ALTER TABLE "file_downloads" ADD COLUMN     "ip" TEXT;

-- AlterTable
ALTER TABLE "files" ADD COLUMN     "alternateOptionLabel" TEXT,
ADD COLUMN     "externalUrl" TEXT,
ADD COLUMN     "isExternalLink" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "uploadIp" TEXT;

-- AlterTable
ALTER TABLE "folder_templates" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "createdIp" TEXT,
ADD COLUMN     "rules" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedById" TEXT,
ADD COLUMN     "updatedIp" TEXT;

-- AlterTable
ALTER TABLE "folders" ADD COLUMN     "color" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "createdIp" TEXT,
ADD COLUMN     "folderTemplateId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedById" TEXT,
ADD COLUMN     "updatedIp" TEXT;

-- AlterTable
ALTER TABLE "lookup_list_items" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "createdIp" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedById" TEXT,
ADD COLUMN     "updatedIp" TEXT;

-- AlterTable
ALTER TABLE "lookup_lists" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "createdIp" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedById" TEXT,
ADD COLUMN     "updatedIp" TEXT;

-- AlterTable
ALTER TABLE "org_integrations" ADD COLUMN     "createdIp" TEXT,
ADD COLUMN     "updatedById" TEXT,
ADD COLUMN     "updatedIp" TEXT;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "createdIp" TEXT,
ADD COLUMN     "fileNamingTemplate" TEXT NOT NULL DEFAULT '{originalName}_{folderName}_{archiveName}_{eventDate}',
ADD COLUMN     "themeFontScale" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN     "themeMode" TEXT NOT NULL DEFAULT 'system',
ADD COLUMN     "themeSeedColor" TEXT NOT NULL DEFAULT '#6750A4',
ADD COLUMN     "themeShape" TEXT NOT NULL DEFAULT 'standard',
ADD COLUMN     "updatedById" TEXT,
ADD COLUMN     "updatedIp" TEXT;

-- AlterTable
ALTER TABLE "report_templates" ADD COLUMN     "createdIp" TEXT,
ADD COLUMN     "updatedById" TEXT,
ADD COLUMN     "updatedIp" TEXT;

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "createdIp" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedById" TEXT,
ADD COLUMN     "updatedIp" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarPath" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "createdIp" TEXT,
ADD COLUMN     "googleEmail" TEXT,
ADD COLUMN     "themePreference" TEXT,
ADD COLUMN     "updatedById" TEXT,
ADD COLUMN     "updatedIp" TEXT;

-- AlterTable
ALTER TABLE "workflow_states" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "createdIp" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedById" TEXT,
ADD COLUMN     "updatedIp" TEXT;

-- AlterTable
ALTER TABLE "workflow_transitions" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "createdIp" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedById" TEXT,
ADD COLUMN     "updatedIp" TEXT;

-- CreateTable
CREATE TABLE "archive_grants" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "archiveId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "folderId" TEXT,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canUpload" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "createdIp" TEXT,

    CONSTRAINT "archive_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_links" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "maxDownloads" INTEGER,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdIp" TEXT,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_doc_shares" (
    "id" TEXT NOT NULL,
    "externalDocLinkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_doc_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "archive_grants_organizationId_userId_idx" ON "archive_grants"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "archive_grants_archiveId_userId_folderId_key" ON "archive_grants"("archiveId", "userId", "folderId");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_token_key" ON "share_links"("token");

-- CreateIndex
CREATE INDEX "share_links_fileId_idx" ON "share_links"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "external_doc_shares_externalDocLinkId_userId_key" ON "external_doc_shares"("externalDocLinkId", "userId");

-- CreateIndex
CREATE INDEX "archives_organizationId_eventDate_idx" ON "archives"("organizationId", "eventDate");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_states" ADD CONSTRAINT "workflow_states_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_states" ADD CONSTRAINT "workflow_states_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_transitions" ADD CONSTRAINT "workflow_transitions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_transitions" ADD CONSTRAINT "workflow_transitions_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_integrations" ADD CONSTRAINT "org_integrations_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lookup_lists" ADD CONSTRAINT "lookup_lists_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lookup_lists" ADD CONSTRAINT "lookup_lists_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lookup_list_items" ADD CONSTRAINT "lookup_list_items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lookup_list_items" ADD CONSTRAINT "lookup_list_items_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folder_templates" ADD CONSTRAINT "folder_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folder_templates" ADD CONSTRAINT "folder_templates_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archives" ADD CONSTRAINT "archives_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_folderTemplateId_fkey" FOREIGN KEY ("folderTemplateId") REFERENCES "folder_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archive_grants" ADD CONSTRAINT "archive_grants_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archive_grants" ADD CONSTRAINT "archive_grants_archiveId_fkey" FOREIGN KEY ("archiveId") REFERENCES "archives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archive_grants" ADD CONSTRAINT "archive_grants_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archive_grants" ADD CONSTRAINT "archive_grants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archive_grants" ADD CONSTRAINT "archive_grants_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_doc_shares" ADD CONSTRAINT "external_doc_shares_externalDocLinkId_fkey" FOREIGN KEY ("externalDocLinkId") REFERENCES "external_doc_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_doc_shares" ADD CONSTRAINT "external_doc_shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

