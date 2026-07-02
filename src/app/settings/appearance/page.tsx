import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { normalizeFontScale, normalizeMode, normalizeShape } from "@/lib/theme/css";
import { normalizeSeedColor } from "@/lib/theme/scheme";
import { AppearanceForm } from "./appearance-form";

// Org-wide Material Design 3 theming: everything repetitive about the UI
// (color, dark mode default, corner shape, text size) is a token, so it
// is edited once here instead of per-page.
export default async function AppearanceSettingsPage() {
  const user = await getCurrentUser();
  if (!user.role.canManageSettings) {
    redirect("/dashboard");
  }

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } });

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      <PageHeader
        backHref="/settings"
        backLabel="Settings"
        title="Appearance"
        subtitle="One seed color generates the entire Material Design 3 palette — light and dark — for every screen. Applies org-wide the moment you save."
      />
      <AppearanceForm
        initial={{
          seedColor: normalizeSeedColor(org.themeSeedColor),
          mode: normalizeMode(org.themeMode),
          shape: normalizeShape(org.themeShape),
          fontScale: normalizeFontScale(org.themeFontScale),
        }}
      />
    </main>
  );
}
