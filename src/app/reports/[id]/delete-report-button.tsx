"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteReportTemplate } from "@/app/actions/reports";
import { Button, Dialog } from "@/components/ui";

export function DeleteReportButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button variant="outlined-error" icon="delete" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        icon="delete"
        headline="Delete this report template?"
        actions={
          <>
            <Button variant="text" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="text-error"
              type="button"
              loading={pending}
              loadingText="Deleting…"
              onClick={() =>
                startTransition(async () => {
                  await deleteReportTemplate(templateId);
                  router.push("/reports");
                })
              }
            >
              Delete template
            </Button>
          </>
        }
      >
        The saved template is removed for everyone in the organization. Archives and their data are not affected.
      </Dialog>
    </>
  );
}
