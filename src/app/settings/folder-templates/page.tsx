import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { AddFolderForm } from "./add-folder-form";
import { RemoveFolderButton } from "./remove-folder-button";

export default async function FolderTemplatesPage() {
  const user = await getCurrentUser();

  const categories = await prisma.category.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { order: "asc" },
    include: { folderTemplates: { orderBy: { order: "asc" } } },
  });

  const canManage = user.role.canManageSettings;

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-xl font-semibold">Folder templates</h1>
      <p className="mt-1 text-sm text-slate-500">
        Each category has its own folder set — a Meeting doesn&apos;t need Press Release folders.
      </p>

      <div className="mt-8 space-y-8">
        {categories.map((category) => (
          <section key={category.id} className="rounded-md border border-slate-200 p-4">
            <h2 className="font-medium">{category.name}</h2>
            <ul className="mt-3 divide-y divide-slate-100">
              {category.folderTemplates.map((folder) => (
                <li key={folder.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span>
                    {folder.name}
                    {folder.isMandatory && <span className="ml-2 text-xs text-amber-600">required</span>}
                  </span>
                  {canManage && <RemoveFolderButton folderTemplateId={folder.id} />}
                </li>
              ))}
              {category.folderTemplates.length === 0 && (
                <li className="py-1.5 text-sm text-slate-400">No folders configured yet.</li>
              )}
            </ul>

            {canManage && <AddFolderForm categoryId={category.id} />}
          </section>
        ))}
      </div>
    </main>
  );
}
