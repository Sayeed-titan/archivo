"use client";

import { Button } from "@/components/ui";

export function PrintButton() {
  return (
    <Button variant="outlined" icon="print" onClick={() => window.print()}>
      Print
    </Button>
  );
}
