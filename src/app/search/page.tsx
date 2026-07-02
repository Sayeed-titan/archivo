import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { searchArchives } from "@/lib/search-archives";
import { PageHeader, TextField, SelectField, Button, Badge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icon";

const STATUS_TONE: Record<string, "success" | "warning" | "neutral"> = {
  Archived: "success",
  "Pending Review": "warning",
  Draft: "neutral",
};

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
        <div className="relative">
          <Icon name="search" size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <TextField name="q" defaultValue={params.q ?? ""} placeholder="Search archives…" className="pl-10" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SelectField name="categoryId" defaultValue={params.categoryId ?? ""} compact>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>

          <SelectField name="status" defaultValue={params.status ?? ""} compact>
            <option value="">All statuses</option>
            <option value="Draft">Draft</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Archived">Archived</option>
          </SelectField>

          <SelectField name="projectName" defaultValue={params.projectName ?? ""} compact>
            <option value="">All projects</option>
            {projectList?.items.map((p) => (
              <option key={p.id} value={p.value}>
                {p.value}
              </option>
            ))}
          </SelectField>

          <SelectField name="month" defaultValue={params.month ?? ""} compact>
            <option value="">Any month</option>
            {months.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </SelectField>

          <TextField name="year" defaultValue={params.year ?? ""} placeholder="Year" compact className="w-20" />

          <SelectField name="docType" defaultValue={params.docType ?? ""} compact>
            <option value="">Any doc type</option>
            <option value="pdf">PDF</option>
            <option value="word">Word</option>
            <option value="excel">Excel</option>
            <option value="powerpoint">PowerPoint</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
            <option value="zip">ZIP</option>
          </SelectField>

          <Button type="submit" size="sm" icon="search">
            Search
          </Button>
        </div>
      </form>

      <h2 className="mt-6 type-title-small text-on-surface-variant">
        {results.length} {results.length === 1 ? "result" : "results"}
      </h2>
      <div className="mt-2 overflow-hidden rounded-md border border-outline-variant bg-surface">
        {results.length > 0 ? (
          <ul className="divide-y divide-outline-variant/60">
            {results.map((archive) => (
              <li key={archive.id}>
                <Link
                  href={`/archives/${archive.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-on-surface-8"
                >
                  <Icon name="folder_open" size={22} className="shrink-0 text-on-surface-variant" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate type-body-large text-on-surface">{archive.name}</span>
                    <span className="block truncate type-body-small text-on-surface-variant">
                      {archive.archiveNumber} · {archive.category?.name ?? "Uncategorized"}
                      {archive.donor && ` · ${archive.donor}`}
                    </span>
                  </span>
                  <Badge tone={STATUS_TONE[archive.status] ?? "neutral"}>{archive.status}</Badge>
                  <Icon name="chevron_right" size={20} className="shrink-0 text-on-surface-variant" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon="search_off"
            title="No matching archives"
            description="Try fewer filters, or a different keyword — search also covers venue, organizer, donor, and filenames."
          />
        )}
      </div>
    </main>
  );
}
