import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { NewArchiveForm } from "./new-archive-form";
import { PageHeader } from "@/components/ui";

export default async function NewArchivePage() {
  const user = await getCurrentUser();

  const categories = await prisma.category.findMany({
    where: { organizationId: user.organizationId, isActive: true },
    orderBy: { order: "asc" },
  });

  return (
    <main className="mx-auto max-w-lg p-4 sm:p-8">
      <PageHeader title="Create a new archive" subtitle="Just give it a name to start — you can fill in the rest later." />
      <NewArchiveForm categories={categories} />
    </main>
  );
}
