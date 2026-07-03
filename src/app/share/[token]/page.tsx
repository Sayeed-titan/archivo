import { prisma } from "@/lib/prisma";
import { Button, Card } from "@/components/ui";
import { Icon } from "@/components/icon";
import { fileTypeIcon } from "@/lib/file-icon";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Genuinely public route — no getCurrentUser() call, no session required.
// proxy.ts's protectedRoutes only lists /dashboard, so this is already
// unauthenticated by default; layout.tsx renders it chrome-free the same
// way it does /login, since getShellUser() finds no session cookie here.
export default async function ShareLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
    include: { file: true },
  });

  const isExpired = shareLink?.expiresAt ? shareLink.expiresAt < new Date() : false;
  const isExhausted = shareLink?.maxDownloads ? shareLink.downloadCount >= shareLink.maxDownloads : false;
  const isValid = shareLink && !shareLink.revokedAt && !isExpired && !isExhausted && !shareLink.file.deletedAt;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-container p-4">
      <Card className="w-full max-w-sm text-center">
        {isValid ? (
          <>
            <Icon name={fileTypeIcon(shareLink.file.fileType)} size={40} className="mx-auto text-primary" />
            <p className="mt-3 break-words type-title-medium text-on-surface">{shareLink.file.filename}</p>
            <p className="mt-1 type-body-small text-on-surface-variant">{formatSize(shareLink.file.sizeBytes)}</p>
            <Button href={`/api/share/${token}/download`} icon="download" className="mt-5 w-full">
              Download
            </Button>
          </>
        ) : (
          <>
            <Icon name="link_off" size={40} className="mx-auto text-on-surface-variant" />
            <p className="mt-3 type-title-medium text-on-surface">This link isn&apos;t available</p>
            <p className="mt-1 type-body-medium text-on-surface-variant">
              {!shareLink
                ? "The link is invalid."
                : shareLink.revokedAt
                  ? "This link has been revoked."
                  : isExpired
                    ? "This link has expired."
                    : isExhausted
                      ? "This link has reached its download limit."
                      : "The shared file is no longer available."}
            </p>
          </>
        )}
      </Card>
    </main>
  );
}
