import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { searchArchives } from "@/lib/search-archives";
import { PageHeader, ClearableSearchField, TextField, Combobox, Button } from "@/components/ui";
import { SearchResultsTable } from "./search-results-table";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    categoryId?: string;
    status?: string;
    projectName?: string;
    month?: string;
    year?: string;
    docType?: string;
    group?: string;
  }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  const [results, categories, projectList] = await Promise.all([
    searchArchives(user, params),
    prisma.category.findMany({ where: { organizationId: user.organizationId, isActive: true }, orderBy: { order: "asc" } }),
    prisma.lookupList.findFirst({
      where: { organizationId: user.organizationId, key: "project" },
      include: { items: { where: { isActive: true } } },
    }),
  ]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      <PageHeader
        title="Search archives"
        subtitle="Search by event/program name, venue, organizer, donor, project, keyword, or filename."
      />

      <form action="/search" className="mt-4 space-y-3">
        {params.group && <input type="hidden" name="group" value={params.group} />}
        <ClearableSearchField name="q" defaultValue={params.q ?? ""} placeholder="Search archives…" />

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

          <Combobox
            name="projectName"
            defaultValue={params.projectName ?? ""}
            placeholder="All projects"
            compact
            className="w-44"
            options={(projectList?.items ?? []).map((p) => ({ value: p.value, label: p.value }))}
          />

          <Combobox
            name="month"
            defaultValue={params.month ?? ""}
            placeholder="Any month"
            compact
            className="w-40"
            options={months.map((m, i) => ({ value: String(i + 1), label: m }))}
          />

          <TextField name="year" defaultValue={params.year ?? ""} placeholder="Year" compact className="w-20" />

          <Combobox
            name="docType"
            defaultValue={params.docType ?? ""}
            placeholder="Any doc type"
            compact
            className="w-40"
            options={[
              { value: "pdf", label: "PDF" },
              { value: "word", label: "Word" },
              { value: "excel", label: "Excel" },
              { value: "powerpoint", label: "PowerPoint" },
              { value: "image", label: "Image" },
              { value: "video", label: "Video" },
              { value: "audio", label: "Audio" },
              { value: "zip", label: "ZIP" },
            ]}
          />

          <Button type="submit" size="sm" icon="search" className="mt-0.5">
            Search
          </Button>
        </div>
      </form>

      <h2 className="mt-6 type-title-small text-on-surface-variant">
        {results.length} {results.length === 1 ? "result" : "results"}
      </h2>
      <div className="mt-2">
        <SearchResultsTable
          rows={results.map((archive) => ({
            id: archive.id,
            name: archive.name,
            archiveNumber: archive.archiveNumber,
            category: archive.category?.name ?? "Uncategorized",
            donor: archive.donor ?? "—",
            status: archive.status,
            createdAt: archive.createdAt.toLocaleDateString(),
          }))}
          exportQuery={new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
          ).toString()}
        />
      </div>
    </main>
  );
}
