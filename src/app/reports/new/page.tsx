import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { REPORT_FIELDS } from "@/lib/reports/fields";
import { ReportBuilderForm } from "./report-builder-form";

export default async function NewReportPage() {
  const user = await getCurrentUser();
  if (!user.role.canGenerateReport) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-xl font-semibold">Build a report</h1>
      <p className="mt-1 text-sm text-slate-500">
        Pick the fields and filters you want, then save it as a reusable template.
      </p>
      <ReportBuilderForm fields={REPORT_FIELDS} />
    </main>
  );
}
