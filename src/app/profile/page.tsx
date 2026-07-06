import { getCurrentUser, getShellUser } from "@/lib/dal";
import { EmailPreferenceForm } from "./email-preference-form";
import { ChangePasswordForm } from "./change-password-form";
import { AvatarUploadForm } from "./avatar-upload-form";
import { GoogleAccountForm } from "./google-account-form";
import { PageHeader, Card, Badge } from "@/components/ui";
import { Icon } from "@/components/icon";

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p, i, arr) => (i === 0 || i === arr.length - 1 ? p[0] : ""))
    .join("")
    .toUpperCase();
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const shellUser = await getShellUser();

  const themeLabel =
    user.themePreference === "light"
      ? "Light"
      : user.themePreference === "dark"
        ? "Dark"
        : user.themePreference === "system"
          ? "Follows your device"
          : "Organization default";

  return (
    <main className="mx-auto max-w-lg p-4 sm:p-8">
      <PageHeader backHref="/dashboard" backLabel="Dashboard" title="Your profile" />

      <Card className="mt-6 flex items-center gap-4">
        {user.avatarPath ? (
          // eslint-disable-next-line @next/next/no-img-element -- served from a dynamic API route, not a static asset next/image can optimize
          <img
            src={`/api/users/${user.id}/avatar`}
            alt={user.name}
            className="h-14 w-14 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-container type-title-large text-on-primary-container">
            {initialsOf(user.name)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="type-title-medium text-on-surface">{user.name}</p>
          <p className="truncate type-body-medium text-on-surface-variant">{user.email}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            <Badge tone="info">{user.role.name}</Badge>
            {user.department && <Badge tone="neutral">{user.department}</Badge>}
            {shellUser?.organization && <Badge tone="neutral">{shellUser.organization.name}</Badge>}
          </div>
          <div className="mt-3">
            <AvatarUploadForm hasAvatar={user.avatarPath !== null} />
          </div>
        </div>
      </Card>

      <h2 className="mt-8 type-title-medium text-on-surface">Appearance</h2>
      <Card className="mt-2 flex items-center gap-3">
        <Icon name="contrast" size={22} className="text-on-surface-variant" />
        <p className="type-body-medium text-on-surface-variant">
          Theme: <span className="text-on-surface">{themeLabel}</span> — change it anytime with the sun/moon toggle in
          the top bar.
        </p>
      </Card>

      <h2 className="mt-8 type-title-medium text-on-surface">Notifications</h2>
      <EmailPreferenceForm emailNotificationsEnabled={user.emailNotificationsEnabled} />

      <h2 className="mt-8 type-title-medium text-on-surface">Google account</h2>
      <GoogleAccountForm googleEmail={user.googleEmail} />

      <h2 className="mt-8 type-title-medium text-on-surface">Password</h2>
      <ChangePasswordForm />
    </main>
  );
}
