import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { NewArchiveForm } from "./new-archive-form";

export default async function NewArchivePage() {
  const user = await getCurrentUser();

  const categories = await prisma.category.findMany({
    where: { organizationId: user.organizationId, isActive: true },
    orderBy: { order: "asc" },
  });

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-semibold">Create a new archive</h1>
      <p className="mt-1 text-sm text-slate-500">
        Just give it a name to start — you can fill in the rest later.
      </p>
      <NewArchiveForm categories={categories} />
    </main>
  );
}
