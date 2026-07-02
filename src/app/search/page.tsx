import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { searchArchives } from "@/lib/search-archives";
import { PageHeader, TextField, SelectField, Button } from "@/components/ui";

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
        backHref="/dashboard"
        backLabel="← Back to dashboard"
        title="Search archives"
        subtitle="Search by event/program name, venue, organizer, donor, project, keyword, or filename."
      />

      <form action="/search" className="mt-4 space-y-3">
        {params.group && <input type="hidden" name="group" value={params.group} />}
        <TextField name="q" defaultValue={params.q ?? ""} placeholder="Search..." />

        <div className="flex flex-wrap gap-3 text-sm">
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

          <Button type="submit" size="sm">
            Search
          </Button>
        </div>
      </form>

      <h2 className="mt-6 text-sm font-medium text-slate-700">{results.length} results</h2>
      <ul className="mt-2 divide-y divide-slate-200 rounded-md border border-slate-200">
        {results.map((archive) => (
          <li key={archive.id} className="px-4 py-2 text-sm">
            <Link href={`/archives/${archive.id}`} className="font-medium hover:underline">
              {archive.name}
            </Link>
            <span className="ml-2 text-slate-400">
              {archive.archiveNumber} · {archive.category?.name ?? "Uncategorized"} · {archive.status}
              {archive.donor && ` · ${archive.donor}`}
            </span>
          </li>
        ))}
        {results.length === 0 && <li className="px-4 py-2 text-sm text-slate-400">No matching archives.</li>}
      </ul>
    </main>
  );
}
