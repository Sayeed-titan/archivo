import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { archiveVisibilityWhere } from "@/lib/visibility";
import { resolveArchiveHealth } from "@/lib/workflow/health";
import { getAvailableTransitions, getOrgWorkflow } from "@/lib/workflow/engine";
import { describeRequirement } from "@/lib/workflow/requirements";
import { HealthBadge } from "@/components/health-badge";
import { MetadataForm } from "./metadata-form";
import { DeleteControls } from "./delete-controls";
import { FolderUpload } from "./folder-upload";
import { FileRow } from "./file-row";
import { TransitionControls } from "./transition-controls";
import { PageHeader } from "@/components/ui";
import { TreeRoot, TreeFolderNode } from "@/components/tree-view";
import { TreeSelectionProvider } from "@/components/tree-view-selection";
import { BulkSelectionBar } from "@/components/bulk-selection-bar";

export default async function ArchiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const archive = await prisma.archive.findFirst({
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
        },
      },
    },
  });

  if (!archive) {
    notFound();
  }

  const missingMandatoryFolders = archive.folders.filter((f) => f.isMandatory && f.files.length === 0).length;
  const [health, availableTransitions, workflow] = await Promise.all([
    resolveArchiveHealth(user.organizationId, archive.status, missingMandatoryFolders),
    getAvailableTransitions(archive),
    getOrgWorkflow(user.organizationId),
  ]);

  const [donorList, projectList, org] = await Promise.all([
    prisma.lookupList.findFirst({
      where: { organizationId: user.organizationId, key: "donor" },
      include: { items: { where: { isActive: true } } },
    }),
    prisma.lookupList.findFirst({
      where: { organizationId: user.organizationId, key: "project" },
      include: { items: { where: { isActive: true } } },
    }),
    prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } }),
  ]);

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-8">
      <PageHeader
        backHref="/dashboard"
        backLabel="Dashboard"
        title={archive.name}
        subtitle={`${archive.archiveNumber} · ${archive.category?.name ?? "Uncategorized"} · ${archive.status}`}
        actions={<HealthBadge health={health} />}
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
          <TreeSelectionProvider>
            <TreeRoot
              label={archive.name}
              icon="folder_open"
              allFileIds={user.role.canDownload ? archive.folders.flatMap((f) => f.files.map((file) => file.id)) : undefined}
            >
              {archive.folders.map((folder) => (
                <TreeFolderNode
                  key={folder.id}
                  id={folder.id}
                  name={folder.name}
                  isMandatory={folder.isMandatory}
                  fileCount={folder.files.length}
                  fileIds={user.role.canDownload ? folder.files.map((file) => file.id) : undefined}
                  headerActions={user.role.canUpload ? <FolderUpload archiveId={archive.id} folderId={folder.id} /> : undefined}
                >
                  {folder.files.length > 0 && (
                    <ul className="divide-y divide-outline-variant/50">
                      {folder.files.map((file) => (
                        <FileRow
                          key={file.id}
                          file={file}
                          canDownload={user.role.canDownload}
                          docEditorProvider={org.docEditorProvider}
                        />
                      ))}
                    </ul>
                  )}
                </TreeFolderNode>
              ))}
            </TreeRoot>
            {user.role.canDownload && <BulkSelectionBar />}
          </TreeSelectionProvider>
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
