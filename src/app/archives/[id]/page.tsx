import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { archiveVisibilityWhere } from "@/lib/visibility";
import { MetadataForm } from "./metadata-form";
import { DeleteControls } from "./delete-controls";

export default async function ArchiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const archive = await prisma.archive.findFirst({
    where: { id, ...archiveVisibilityWhere(user) },
    include: {
      category: true,
      folders: {
        orderBy: { order: "asc" },
        include: { files: { where: { deletedAt: null, isLatest: true }, orderBy: { uploadedAt: "desc" } } },
      },
    },
  });

  if (!archive) {
    notFound();
  }

  const [donorList, projectList] = await Promise.all([
    prisma.lookupList.findFirst({
      where: { organizationId: user.organizationId, key: "donor" },
      include: { items: { where: { isActive: true } } },
    }),
    prisma.lookupList.findFirst({
      where: { organizationId: user.organizationId, key: "project" },
      include: { items: { where: { isActive: true } } },
    }),
  ]);

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link href="/dashboard" className="text-sm text-slate-500 underline">
        ← Back to dashboard
      </Link>

      <div className="mt-4">
        <h1 className="text-xl font-semibold">{archive.name}</h1>
        <p className="text-sm text-slate-500">
          {archive.archiveNumber} · {archive.category?.name ?? "Uncategorized"} · {archive.status}
        </p>
      </div>

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
                    <li key={file.id} className="flex items-center justify-between px-4 py-1.5 text-sm">
                      <span>{file.filename}</span>
                      {user.role.canDownload && (
                        <a href={`/api/files/${file.id}/download`} className="text-xs text-slate-500 underline">
                          download
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
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
