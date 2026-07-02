import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";

const SECTIONS = [
  {
    href: "/settings/appearance",
    icon: "palette",
    title: "Appearance",
    description: "Brand color, light/dark mode, corner shape, and text size for the whole workspace.",
  },
  {
    href: "/settings/organization",
    icon: "domain",
    title: "Organization",
    description: "Workspace name, industry, and storage quota.",
  },
  {
    href: "/settings/folder-templates",
    icon: "folder_copy",
    title: "Folder templates",
    description: "The folder structure every new archive is provisioned with, per category.",
  },
  {
    href: "/settings/workflow",
    icon: "account_tree",
    title: "Approval workflow",
    description: "Status states, allowed transitions, and the requirements gating each move.",
  },
  {
    href: "/settings/integrations",
    icon: "extension",
    title: "Integrations",
    description: "Connect Google Workspace or Microsoft 365 for in-browser document editing.",
  },
  {
    href: "/settings/security",
    icon: "security",
    title: "Security & watermarking",
    description: "Watermark downloaded images and exported PDF reports.",
  },
];

export default async function SettingsHubPage() {
  const user = await getCurrentUser();
  if (!user.role.canManageSettings) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      <PageHeader
        title="Settings"
        subtitle="Workspace configuration. Changes here apply to everyone in the organization."
      />
      <ul className="mt-6 overflow-hidden rounded-lg border border-outline-variant bg-surface">
        {SECTIONS.map((section) => (
          <li key={section.href} className="border-b border-outline-variant/60 last:border-b-0">
            <Link
              href={section.href}
              className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-on-surface-8"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                <Icon name={section.icon} size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block type-title-medium text-on-surface">{section.title}</span>
                <span className="block type-body-medium text-on-surface-variant">{section.description}</span>
              </span>
              <Icon name="chevron_right" size={22} className="text-on-surface-variant" />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
