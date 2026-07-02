"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { TextField, Button } from "@/components/ui";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <form action={action} className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Sign in to Archivo</h1>

        <TextField
          id="email"
          name="email"
          type="email"
          label="Email"
          placeholder="you@organization.com"
          error={state?.errors?.email?.[0]}
        />

        <TextField id="password" name="password" type="password" label="Password" error={state?.errors?.password?.[0]} />

        {state?.message && <p className="text-sm text-red-600">{state.message}</p>}

        <Button type="submit" loading={pending} loadingText="Signing in..." className="w-full">
          Sign in
        </Button>
      </form>
    </main>
  );
}
