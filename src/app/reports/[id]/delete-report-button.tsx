"use client";

import { useRouter } from "next/navigation";
import { deleteReportTemplate } from "@/app/actions/reports";

export function DeleteReportButton({ templateId }: { templateId: string }) {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        await deleteReportTemplate(templateId);
        router.push("/reports");
      }}
      className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700"
    >
      Delete
    </button>
  );
}
