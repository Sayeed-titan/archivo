import { getCurrentUser } from "@/lib/dal";
import { EmailPreferenceForm } from "./email-preference-form";
import { PageHeader } from "@/components/ui";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto max-w-lg p-4 sm:p-8">
      <PageHeader
        backHref="/dashboard"
        backLabel="← Back to dashboard"
        title="Your profile"
        subtitle={`${user.name} · ${user.email} · ${user.role.name}`}
      />

      <h2 className="mt-6 text-sm font-medium text-slate-700">Notifications</h2>
      <EmailPreferenceForm emailNotificationsEnabled={user.emailNotificationsEnabled} />
    </main>
  );
}
