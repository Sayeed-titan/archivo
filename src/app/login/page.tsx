"use client";

import Image from "next/image";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { TextField, Button } from "@/components/ui";
import { Icon } from "@/components/icon";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-container p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 pb-6 text-center">
          <span className="rounded-md bg-white px-3 py-2">
            <Image
              src="/spellbound-network-logo.png"
              alt="Spellbound Network"
              width={4331}
              height={2100}
              priority
              className="h-14 w-auto"
            />
          </span>
          <p className="type-label-medium uppercase tracking-widest text-on-surface-variant">Archive Management</p>
        </div>

        <form action={action} className="space-y-4 rounded-xl bg-surface-container-lowest p-8 shadow-elevation-1">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
              <Icon name="lock" size={20} />
            </span>
            <div>
              <h1 className="type-title-large text-on-surface">Sign in</h1>
              <p className="type-body-small text-on-surface-variant">Use your organization account</p>
            </div>
          </div>

          <TextField
            id="email"
            name="email"
            type="email"
            label="Email"
            placeholder="you@organization.com"
            autoComplete="email"
            error={state?.errors?.email?.[0]}
          />

          <TextField
            id="password"
            name="password"
            type="password"
            label="Password"
            autoComplete="current-password"
            error={state?.errors?.password?.[0]}
          />

          {state?.message && (
            <p className="flex items-center gap-2 rounded-sm bg-error-container px-3 py-2 type-body-medium text-on-error-container">
              <Icon name="error" size={18} />
              {state.message}
            </p>
          )}

          <Button type="submit" loading={pending} loadingText="Signing in…" className="w-full">
            Sign in
          </Button>
        </form>
      </div>
    </main>
  );
}
