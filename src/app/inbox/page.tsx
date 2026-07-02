import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { fileTypeIcon } from "@/lib/file-icon";
import { InboxUploadForm } from "./inbox-upload-form";
import { PageHeader, EmptyState, IconButton } from "@/components/ui";
import { Icon } from "@/components/icon";

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

      <h2 className="mt-8 type-title-small text-on-surface-variant">Uploaded files ({files.length})</h2>
      <div className="mt-2 overflow-hidden rounded-md border border-outline-variant bg-surface">
        {files.length > 0 ? (
          <ul className="divide-y divide-outline-variant/60">
            {files.map((file) => (
              <li key={file.id} className="flex items-center gap-3 px-4 py-2.5">
                {file.fileType === "video" && file.thumbnailPath ? (
                  // eslint-disable-next-line @next/next/no-img-element -- server-generated preview, not worth next/image's optimization pipeline
                  <img src={`/api/files/${file.id}/thumbnail`} alt="" className="h-8 w-14 shrink-0 rounded-xs object-cover" />
                ) : (
                  <Icon name={fileTypeIcon(file.fileType)} size={22} className="shrink-0 text-on-surface-variant" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate type-body-medium text-on-surface">{file.filename}</span>
                  <span className="block type-body-small text-on-surface-variant">
                    {file.fileType} · {(file.sizeBytes / 1024).toFixed(0)} KB
                    {file.fileType === "video" &&
                      file.durationSeconds !== null &&
                      ` · ${Math.floor(file.durationSeconds / 60)}:${(file.durationSeconds % 60).toString().padStart(2, "0")}`}
                  </span>
                </span>
                {user.role.canDownload && (
                  <IconButton href={`/api/files/${file.id}/download`} icon="download" label={`Download ${file.filename}`} />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon="inbox"
            title="Inbox is empty"
            description="Anything you drop in the upload zone above lands here, ready to be sorted into archives."
          />
        )}
      </div>
    </main>
  );
}
