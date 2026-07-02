"use client";

import { useRouter } from "next/navigation";
import { deleteReportTemplate } from "@/app/actions/reports";
import { Button } from "@/components/ui";

export function DeleteReportButton({ templateId }: { templateId: string }) {
  const router = useRouter();

  return (
    <Button
      onClick={async () => {
        await deleteReportTemplate(templateId);
        router.push("/reports");
      }}
      variant="danger-outline"
    >
      Delete
    </Button>
  );
}
