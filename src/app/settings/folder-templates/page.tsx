import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { CategoryList } from "./category-list";
import { parseFolderRules } from "@/lib/folder-rules";
import { PageHeader } from "@/components/ui";

export default async function FolderTemplatesPage() {
  const user = await getCurrentUser();

  const categories = await prisma.category.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { order: "asc" },
    include: { folderTemplates: { orderBy: { order: "asc" } } },
  });

  const canManage = user.role.canManageSettings;

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-8">
      <PageHeader
        backHref="/settings"
        backLabel="Settings"
        title="Folder templates"
        subtitle="Search, add, rename, or remove categories; each has its own folder set — a Meeting doesn't need Press Release folders. Drag the handle (or tab to it and use arrow keys) to reorder folders."
      />

      <CategoryList
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          folderTemplates: category.folderTemplates.map((f) => ({
            id: f.id,
            name: f.name,
            isMandatory: f.isMandatory,
            rules: parseFolderRules(f.rules),
          })),
        }))}
        canManage={canManage}
      />
    </main>
  );
}
