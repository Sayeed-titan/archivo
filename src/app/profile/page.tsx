import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { EmailPreferenceForm } from "./email-preference-form";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto max-w-lg p-4 sm:p-8">
      <Link href="/dashboard" className="text-sm text-slate-500 underline">
        ← Back to dashboard
      </Link>

      <h1 className="mt-4 text-xl font-semibold">Your profile</h1>
      <p className="mt-1 text-sm text-slate-500">
        {user.name} · {user.email} · {user.role.name}
      </p>

      <h2 className="mt-6 text-sm font-medium text-slate-700">Notifications</h2>
      <EmailPreferenceForm emailNotificationsEnabled={user.emailNotificationsEnabled} />
    </main>
  );
}
