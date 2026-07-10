import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma, withConnectionRetry } from "@/lib/prisma";
import { archiveVisibilityWhere } from "@/lib/visibility";
import { listGrantableUsers } from "@/app/actions/access";
import { PageHeader } from "@/components/ui";
import { AccessManager } from "./access-manager";

export default async function ArchiveAccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user.role.canManageUsers) {
    redirect(`/archives/${id}`);
  }

  const archive = await withConnectionRetry(() =>
    prisma.archive.findFirst({
      where: { id, ...archiveVisibilityWhere(user) },
      include: { folders: { orderBy: { order: "asc" }, select: { id: true, name: true } } },
    })
  );
  if (!archive) {
    notFound();
  }

  const [grants, users] = await Promise.all([
    withConnectionRetry(() =>
      prisma.archiveGrant.findMany({
        where: { archiveId: id },
        include: { user: { select: { id: true, name: true, email: true } }, folder: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      })
    ),
    listGrantableUsers(id),
  ]);

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      <PageHeader
        backHref={`/archives/${id}`}
        backLabel={archive.name}
        title="Manage access"
        subtitle="Grant specific users view or upload access to this archive, or to individual folders within it."
      />
      <AccessManager
        archiveId={id}
        folders={archive.folders}
        users={users}
        grants={grants.map((g) => ({
          id: g.id,
          userId: g.userId,
          userName: g.user.name,
          userEmail: g.user.email,
          folderId: g.folderId,
          folderName: g.folder?.name ?? null,
          canView: g.canView,
          canUpload: g.canUpload,
        }))}
      />
    </main>
  );
}
