import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { AddFolderForm } from "./add-folder-form";
import { FolderTemplateList } from "./folder-template-list";
import { parseFolderRules } from "@/lib/folder-rules";
import { PageHeader, Card } from "@/components/ui";
import { Icon } from "@/components/icon";

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
        subtitle="Each category has its own folder set — a Meeting doesn't need Press Release folders. Drag the handle (or select it and use arrow keys) to reorder."
      />

      <div className="mt-8 space-y-4">
        {categories.map((category) => (
          <Card key={category.id} className="p-0">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3">
                <Icon name="chevron_right" size={20} className="shrink-0 text-on-surface-variant transition-transform group-open:rotate-90" />
                <span className="type-title-medium text-on-surface">{category.name}</span>
                <span className="ml-auto type-body-small text-on-surface-variant">
                  {category.folderTemplates.length} {category.folderTemplates.length === 1 ? "folder" : "folders"}
                </span>
              </summary>
              <div className="border-t border-outline-variant/60 px-4 pb-4">
                <FolderTemplateList
                  categoryId={category.id}
                  folders={category.folderTemplates.map((f) => ({
                    id: f.id,
                    name: f.name,
                    isMandatory: f.isMandatory,
                    rules: parseFolderRules(f.rules),
                  }))}
                  canManage={canManage}
                />
                {canManage && <AddFolderForm categoryId={category.id} />}
              </div>
            </details>
          </Card>
        ))}
      </div>
    </main>
  );
}
