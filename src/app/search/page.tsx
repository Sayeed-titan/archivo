import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { searchArchives } from "@/lib/search-archives";

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
    <main className="mx-auto max-w-3xl p-8">
      <Link href="/dashboard" className="text-sm text-slate-500 underline">
        ← Back to dashboard
      </Link>

      <h1 className="mt-4 text-xl font-semibold">Search archives</h1>
      <p className="mt-1 text-sm text-slate-500">
        Search by event/program name, venue, organizer, donor, project, keyword, or filename.
      </p>

      <form action="/search" className="mt-4 space-y-3">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />

        <div className="flex flex-wrap gap-3 text-sm">
          <select name="categoryId" defaultValue={params.categoryId ?? ""} className="rounded-md border border-slate-300 px-2 py-1">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select name="status" defaultValue={params.status ?? ""} className="rounded-md border border-slate-300 px-2 py-1">
            <option value="">All statuses</option>
            <option value="Draft">Draft</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Archived">Archived</option>
          </select>

          <select name="projectName" defaultValue={params.projectName ?? ""} className="rounded-md border border-slate-300 px-2 py-1">
            <option value="">All projects</option>
            {projectList?.items.map((p) => (
              <option key={p.id} value={p.value}>
                {p.value}
              </option>
            ))}
          </select>

          <select name="month" defaultValue={params.month ?? ""} className="rounded-md border border-slate-300 px-2 py-1">
            <option value="">Any month</option>
            {months.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>

          <input
            name="year"
            defaultValue={params.year ?? ""}
            placeholder="Year"
            className="w-20 rounded-md border border-slate-300 px-2 py-1"
          />

          <select name="docType" defaultValue={params.docType ?? ""} className="rounded-md border border-slate-300 px-2 py-1">
            <option value="">Any doc type</option>
            <option value="pdf">PDF</option>
            <option value="word">Word</option>
            <option value="excel">Excel</option>
            <option value="powerpoint">PowerPoint</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
            <option value="zip">ZIP</option>
          </select>

          <button type="submit" className="rounded-md bg-slate-900 px-3 py-1 text-white">
            Search
          </button>
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
