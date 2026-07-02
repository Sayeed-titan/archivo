import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { InboxUploadForm } from "./inbox-upload-form";
import { PageHeader } from "@/components/ui";

export default async function InboxPage() {
  const user = await getCurrentUser();

  const inbox = await prisma.archive.findFirst({
    where: { organizationId: user.organizationId, isMigrationInbox: true },
    include: {
      folders: {
        include: { files: { orderBy: { uploadedAt: "desc" } } },
      },
    },
  });

  const files = inbox?.folders.flatMap((f) => f.files) ?? [];

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-8">
      <PageHeader
        title="Migration Inbox"
        subtitle="Drop old or backlog files here with zero metadata — sort them into real archives later."
      />

      {user.role.canUpload && <InboxUploadForm />}

      <h2 className="mt-8 text-sm font-medium text-slate-700">Uploaded files ({files.length})</h2>
      <ul className="mt-2 divide-y divide-slate-200 rounded-md border border-slate-200">
        {files.map((file) => (
          <li key={file.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span className="flex items-center gap-2">
              {file.fileType === "video" && file.thumbnailPath && (
                // eslint-disable-next-line @next/next/no-img-element -- server-generated preview, not worth next/image's optimization pipeline
                <img src={`/api/files/${file.id}/thumbnail`} alt="" className="h-8 w-14 rounded object-cover" />
              )}
              {file.filename}
            </span>
            <span className="flex items-center gap-3 text-slate-400">
              {file.fileType} · {(file.sizeBytes / 1024).toFixed(0)} KB
              {file.fileType === "video" && file.durationSeconds !== null && (
                <span>
                  {Math.floor(file.durationSeconds / 60)}:{(file.durationSeconds % 60).toString().padStart(2, "0")}
                </span>
              )}
              {user.role.canDownload && (
                <a href={`/api/files/${file.id}/download`} className="text-xs underline">
                  download
                </a>
              )}
            </span>
          </li>
        ))}
        {files.length === 0 && <li className="px-4 py-2 text-sm text-slate-400">No files yet.</li>}
      </ul>
    </main>
  );
}
