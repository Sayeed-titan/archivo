"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <form action={action} className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Sign in to Archivo</h1>

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@organization.com"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {state?.errors?.email && <p className="text-sm text-red-600">{state.errors.email[0]}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {state?.errors?.password && <p className="text-sm text-red-600">{state.errors.password[0]}</p>}
        </div>

        {state?.message && <p className="text-sm text-red-600">{state.message}</p>}

        <button
          disabled={pending}
          type="submit"
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
