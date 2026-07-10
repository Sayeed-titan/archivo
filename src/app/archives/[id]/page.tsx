import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma, withConnectionRetry } from "@/lib/prisma";
import { archiveVisibilityWhere } from "@/lib/visibility";
import { resolveArchiveAccess, canViewFolder, canUploadToFolder } from "@/lib/access";
import { resolveArchiveHealth } from "@/lib/workflow/health";
import { getAvailableTransitions, getOrgWorkflow } from "@/lib/workflow/engine";
import { describeRequirement } from "@/lib/workflow/requirements";
import { parseFolderRules } from "@/lib/folder-rules";
import { getVersionHistory } from "./file-version-history";
import { HealthBadge } from "@/components/health-badge";
import { MetadataForm } from "./metadata-form";
import { DeleteControls } from "./delete-controls";
import { TransitionControls } from "./transition-controls";
import { PageHeader, Button } from "@/components/ui";
import { FileExplorer } from "@/components/explorer/file-explorer";
import type { ExplorerFolder, ExplorerFileWithHistory } from "@/components/explorer/types";

export default async function ArchiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const archive = await withConnectionRetry(() =>
    prisma.archive.findFirst({
      where: { id, ...archiveVisibilityWhere(user) },
      include: {
        category: true,
        folders: {
          orderBy: { order: "asc" },
          include: {
            files: {
              where: { deletedAt: null, isLatest: true },
              orderBy: { uploadedAt: "desc" },
              include: { uploadedBy: true },
            },
            folderTemplate: true,
          },
        },
      },
    })
  );

  if (!archive) {
    notFound();
  }

  const access = await resolveArchiveAccess(user, archive.id);
  if (!access) {
    notFound();
  }

  const missingMandatoryFolders = archive.folders.filter((f) => f.isMandatory && f.files.length === 0).length;
  const [health, availableTransitions, workflow] = await Promise.all([
    resolveArchiveHealth(user.organizationId, archive.status, missingMandatoryFolders),
    getAvailableTransitions(archive),
    getOrgWorkflow(user.organizationId),
  ]);

  const [donorList, projectList, org] = await Promise.all([
    withConnectionRetry(() =>
      prisma.lookupList.findFirst({
        where: { organizationId: user.organizationId, key: "donor" },
        include: { items: { where: { isActive: true } } },
      })
    ),
    withConnectionRetry(() =>
      prisma.lookupList.findFirst({
        where: { organizationId: user.organizationId, key: "project" },
        include: { items: { where: { isActive: true } } },
      })
    ),
    withConnectionRetry(() => prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } })),
  ]);

  // Per-file version-history fan-out (only for files with version > 1) —
  // wrapped the same way as the dashboard's own concurrent Promise.all
  // queries, since this page now issues noticeably more concurrent
  // queries than before the file-explorer rewrite.
  const explorerFolders: ExplorerFolder[] = await Promise.all(
    archive.folders.map(async (folder) => {
      const files: ExplorerFileWithHistory[] = await Promise.all(
        folder.files.map(async (file) => ({
          ...file,
          history: file.version > 1 ? await withConnectionRetry(() => getVersionHistory(file.id)) : [file],
        }))
      );

      return {
        id: folder.id,
        name: folder.name,
        isMandatory: folder.isMandatory,
        color: folder.color,
        canView: canViewFolder(access, folder.id),
        canUpload: user.role.canUpload && canUploadToFolder(access, folder.id),
        files,
        rules: folder.folderTemplate ? parseFolderRules(folder.folderTemplate.rules) : undefined,
      };
    })
  );

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-8">
      <PageHeader
        backHref="/dashboard"
        backLabel="Dashboard"
        title={archive.name}
        subtitle={`${archive.archiveNumber} · ${archive.category?.name ?? "Uncategorized"} · ${archive.status}`}
        actions={
          <>
            <HealthBadge health={health} />
            {user.role.canManageUsers && (
              <Button href={`/archives/${archive.id}/access`} variant="outlined" size="sm" icon="admin_panel_settings">
                Access
              </Button>
            )}
          </>
        }
      />

      {user.role.canEditMetadata && workflow.states.length > 0 && (
        <TransitionControls
          archiveId={archive.id}
          currentStatus={archive.status}
          states={workflow.states.map((s) => ({ name: s.name, order: s.order }))}
          transitions={availableTransitions.map((t) => ({
            toState: t.toState,
            allowed: t.allowed,
            checks: t.checks.map((c) => ({
              description: describeRequirement(c.requirement),
              satisfied: c.satisfied,
            })),
          }))}
        />
      )}

      <h2 className="mt-8 type-title-medium text-on-surface">Folders</h2>
      {archive.folders.length === 0 ? (
        <p className="mt-2 type-body-medium text-on-surface-variant">
          No folders yet — assign a category to auto-provision the standard folder set.
        </p>
      ) : (
        <div className="mt-2">
          <FileExplorer
            archiveId={archive.id}
            archiveName={archive.name}
            folders={explorerFolders}
            canDownload={user.role.canDownload}
            canEditMetadata={user.role.canEditMetadata}
            canManageAccess={user.role.canManageUsers}
            docEditorProvider={org.docEditorProvider}
          />
        </div>
      )}

      {user.role.canEditMetadata && (
        <>
          <h2 className="mt-8 type-title-medium text-on-surface">Metadata</h2>
          <MetadataForm
            archive={archive}
            donors={donorList?.items.map((i) => i.value) ?? []}
            projects={projectList?.items.map((i) => i.value) ?? []}
          />
        </>
      )}

      <DeleteControls
        archiveId={archive.id}
        canDelete={user.role.canDeleteArchive}
        canHardDelete={user.role.canHardDelete}
      />
    </main>
  );
}
