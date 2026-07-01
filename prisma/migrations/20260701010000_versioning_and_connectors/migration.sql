-- AlterTable
ALTER TABLE "files" ADD COLUMN     "externalDocId" TEXT,
ADD COLUMN     "previousVersionId" TEXT;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "docEditorProvider" TEXT;

-- CreateTable
CREATE TABLE "org_integrations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "credentials" JSONB NOT NULL,
    "connectedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_doc_links" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalUrl" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_doc_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "org_integrations_organizationId_provider_key" ON "org_integrations"("organizationId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "external_doc_links_fileId_key" ON "external_doc_links"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "files_previousVersionId_key" ON "files"("previousVersionId");

-- AddForeignKey
ALTER TABLE "org_integrations" ADD CONSTRAINT "org_integrations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_integrations" ADD CONSTRAINT "org_integrations_connectedById_fkey" FOREIGN KEY ("connectedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_doc_links" ADD CONSTRAINT "external_doc_links_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_doc_links" ADD CONSTRAINT "external_doc_links_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

