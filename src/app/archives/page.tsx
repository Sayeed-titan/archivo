import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { browseArchives } from "@/lib/browse-archives";
import { PageHeader, ClearableSearchField, DateRangePicker, Combobox, Button } from "@/components/ui";
import { ArchivesTable } from "./archives-table";

export default async function ArchivesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    categoryId?: string;
    status?: string;
    dateFrom?: string;
    dateFromEnd?: string;
  }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  const [archives, categories] = await Promise.all([
    browseArchives(user, params),
    prisma.category.findMany({ where: { organizationId: user.organizationId, isActive: true }, orderBy: { order: "asc" } }),
  ]);

  const categoryName = params.categoryId ? categories.find((c) => c.id === params.categoryId)?.name : undefined;

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-8">
      <PageHeader
        backHref="/dashboard"
        backLabel="Dashboard"
        title="All archives"
        subtitle={categoryName ? `Filtered to ${categoryName}` : "Browse, search and filter every archive you can see."}
      />

      <form action="/archives" className="mt-4 space-y-3">
        <ClearableSearchField
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search by name, venue, organizer, donor, project…"
        />

        <div className="flex flex-wrap items-start gap-3">
          <Combobox
            name="categoryId"
            defaultValue={params.categoryId ?? ""}
            placeholder="All categories"
            compact
            className="w-44"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />

          <Combobox
            name="status"
            defaultValue={params.status ?? ""}
            placeholder="All statuses"
            compact
            className="w-44"
            options={[
              { value: "Draft", label: "Draft" },
              { value: "Pending Review", label: "Pending Review" },
              { value: "Archived", label: "Archived" },
            ]}
          />

          <DateRangePicker
            name="dateFrom"
            compact
            className="w-56"
            defaultStart={params.dateFrom ?? ""}
            defaultEnd={params.dateFromEnd ?? ""}
          />

          <Button type="submit" size="sm" icon="search" className="mt-0.5">
            Search
          </Button>
          {(params.q || params.categoryId || params.status || params.dateFrom) && (
            <Button href="/archives" variant="text" size="sm" className="mt-0.5">
              Clear filters
            </Button>
          )}
        </div>
      </form>

      <h2 className="mt-6 type-title-small text-on-surface-variant">
        {archives.length} {archives.length === 1 ? "archive" : "archives"}
      </h2>
      <div className="mt-2">
        <ArchivesTable
          rows={archives.map((archive) => ({
            id: archive.id,
            name: archive.name,
            archiveNumber: archive.archiveNumber,
            categoryName: archive.category?.name ?? "Uncategorized",
            status: archive.status,
            eventDate: archive.eventDate
              ? archive.eventEndDate && archive.eventEndDate.getTime() !== archive.eventDate.getTime()
                ? `${archive.eventDate.toLocaleDateString()} – ${archive.eventEndDate.toLocaleDateString()}`
                : archive.eventDate.toLocaleDateString()
              : null,
            createdAt: archive.createdAt.toLocaleDateString(),
            fileCount: archive.fileCount,
            health: archive.health,
          }))}
        />
      </div>
    </main>
  );
}
