import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { AddFolderForm } from "./add-folder-form";
import { RemoveFolderButton } from "./remove-folder-button";
import { PageHeader, Card, Badge } from "@/components/ui";

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
        subtitle="Each category has its own folder set — a Meeting doesn't need Press Release folders."
      />

      <div className="mt-8 space-y-8">
        {categories.map((category) => (
          <Card key={category.id}>
            <h2 className="type-title-medium text-on-surface">{category.name}</h2>
            <ul className="mt-3 divide-y divide-outline-variant/50">
              {category.folderTemplates.map((folder) => (
                <li key={folder.id} className="flex items-center justify-between py-2 type-body-medium text-on-surface">
                  <span>
                    {folder.name}
                    {folder.isMandatory && (
                      <Badge tone="warning" pill={false} className="ml-2">
                        required
                      </Badge>
                    )}
                  </span>
                  {canManage && <RemoveFolderButton folderTemplateId={folder.id} />}
                </li>
              ))}
              {category.folderTemplates.length === 0 && (
                <li className="py-2 type-body-medium text-on-surface-variant">No folders configured yet.</li>
              )}
            </ul>

            {canManage && <AddFolderForm categoryId={category.id} />}
          </Card>
        ))}
      </div>
    </main>
  );
}
