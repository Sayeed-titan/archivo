"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword, type ChangePasswordState } from "@/app/actions/profile";
import { TextField, Button, Card, useSnackbar } from "@/components/ui";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<ChangePasswordState, FormData>(changePassword, undefined);
  const { showSnackbar } = useSnackbar();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      showSnackbar("Password changed.");
      formRef.current?.reset();
    }
  }, [state, showSnackbar]);

  return (
    <form ref={formRef} action={action} className="mt-2">
      <Card className="space-y-3">
        <TextField
          name="currentPassword"
          type="password"
          label="Current password"
          autoComplete="current-password"
          compact
        />
        <TextField
          name="newPassword"
          type="password"
          label="New password"
          hint="At least 8 characters."
          autoComplete="new-password"
          compact
        />
        <TextField
          name="confirmPassword"
          type="password"
          label="Confirm new password"
          autoComplete="new-password"
          compact
        />
        {state?.message && <p className="type-body-medium text-error">{state.message}</p>}
        <Button type="submit" loading={pending} loadingText="Changing…" icon="lock_reset">
          Change password
        </Button>
      </Card>
    </form>
  );
}
