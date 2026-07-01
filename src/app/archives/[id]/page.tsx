import { notFound } from "next/navigation";
import Link from "next/link";
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
    <main className="mx-auto max-w-2xl p-8">
      <Link href="/dashboard" className="text-sm text-slate-500 underline">
        ← Back to dashboard
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{archive.name}</h1>
          <p className="text-sm text-slate-500">
            {archive.archiveNumber} · {archive.category?.name ?? "Uncategorized"} · {archive.status}
          </p>
        </div>
        <HealthBadge health={health} />
      </div>

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

      <h2 className="mt-8 text-sm font-medium text-slate-700">Folders</h2>
      {archive.folders.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">
          No folders yet — assign a category to auto-provision the standard folder set.
        </p>
      ) : (
        <div className="mt-2 space-y-3">
          {archive.folders.map((folder) => (
            <div key={folder.id} className="rounded-md border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-sm font-medium">
                <span>
                  {folder.name}
                  {folder.isMandatory && <span className="ml-2 text-xs text-amber-600">required</span>}
                </span>
                <span className="text-slate-400">{folder.files.length} files</span>
              </div>
              {folder.files.length > 0 && (
                <ul className="divide-y divide-slate-100">
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
            </div>
          ))}
        </div>
      )}

      {user.role.canEditMetadata && (
        <>
          <h2 className="mt-8 text-sm font-medium text-slate-700">Metadata</h2>
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
