import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { archiveVisibilityWhere } from "@/lib/visibility";
import { resolveArchiveHealth } from "@/lib/workflow/health";
import { getAvailableTransitions } from "@/lib/workflow/engine";
import { describeRequirement } from "@/lib/workflow/requirements";
import { HealthBadge } from "@/components/health-badge";
import { MetadataForm } from "./metadata-form";
import { DeleteControls } from "./delete-controls";
import { FolderUpload } from "./folder-upload";
import { FileRow } from "./file-row";
import { TransitionControls } from "./transition-controls";
import { PageHeader, Badge, Card } from "@/components/ui";
import { Icon } from "@/components/icon";

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
  const [health, availableTransitions] = await Promise.all([
    resolveArchiveHealth(user.organizationId, archive.status, missingMandatoryFolders),
    getAvailableTransitions(archive),
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

      {user.role.canEditMetadata && availableTransitions.length > 0 && (
        <TransitionControls
          archiveId={archive.id}
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
        <div className="mt-2 space-y-3">
          {archive.folders.map((folder) => (
            <Card key={folder.id} className="p-0">
              <div className="flex items-center justify-between border-b border-outline-variant/60 bg-surface-container-low px-4 py-2.5">
                <span className="flex items-center gap-2 type-title-small text-on-surface">
                  <Icon
                    name={folder.files.length > 0 ? "folder" : "folder_open"}
                    size={20}
                    className={folder.isMandatory && folder.files.length === 0 ? "text-warning" : "text-on-surface-variant"}
                  />
                  {folder.name}
                  {folder.isMandatory && (
                    <Badge tone="warning" pill={false}>
                      required
                    </Badge>
                  )}
                </span>
                <span className="type-body-small text-on-surface-variant">
                  {folder.files.length} {folder.files.length === 1 ? "file" : "files"}
                </span>
              </div>
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
              {user.role.canUpload && (
                <div className="p-2">
                  <FolderUpload archiveId={archive.id} folderId={folder.id} />
                </div>
              )}
            </Card>
          ))}
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
