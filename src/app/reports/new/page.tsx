import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { REPORT_FIELDS } from "@/lib/reports/fields";
import { ReportBuilderForm } from "./report-builder-form";
import { PageHeader } from "@/components/ui";

export default async function NewReportPage() {
  const user = await getCurrentUser();
  if (!user.role.canGenerateReport) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-8">
      <PageHeader backHref="/reports" backLabel="Reports" title="Build a report" subtitle="Pick the fields and filters you want, then save it as a reusable template." />
      <ReportBuilderForm fields={REPORT_FIELDS} />
    </main>
  );
}
