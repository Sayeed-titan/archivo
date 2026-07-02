import { NotificationBell, type NotificationItem } from "@/components/notification-bell";
import { NavRail, MobileNav, BrandMark, type NavItem } from "./nav";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import type { ThemeMode } from "@/lib/theme/css";

type ShellUser = {
  name: string;
  email: string;
  role: {
    name: string;
    canCreateArchive: boolean;
    canGenerateReport: boolean;
    canManageSettings: boolean;
    canManageUsers: boolean;
  };
  organization: { name: string };
};

// MD3 app shell: navigation rail (md+) / modal drawer (mobile) + top app
// bar with search, theme toggle, notifications, and the account menu.
// Pages render their own <main> inside — the shell only provides chrome.
export function AppShell({
  user,
  notifications,
  resolvedMode,
  children,
}: {
  user: ShellUser;
  notifications: NotificationItem[];
  resolvedMode: ThemeMode;
  children: React.ReactNode;
}) {
  const navItems: NavItem[] = [
    { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
    { href: "/search", icon: "search", label: "Search" },
    { href: "/inbox", icon: "inbox", label: "Inbox" },
    ...(user.role.canGenerateReport ? [{ href: "/reports", icon: "monitoring", label: "Reports" }] : []),
    ...(user.role.canManageUsers ? [{ href: "/audit-log", icon: "history", label: "Audit" }] : []),
    ...(user.role.canManageSettings ? [{ href: "/settings", icon: "settings", label: "Settings" }] : []),
  ];
  const fabHref = user.role.canCreateArchive ? "/archives/new" : null;

  return (
    <div className="flex min-h-dvh">
      <NavRail items={navItems} fabHref={fabHref} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-outline-variant/60 bg-surface">
          <div className="flex items-center gap-2 px-3 py-2 sm:px-5">
            <MobileNav items={navItems} fabHref={fabHref} orgName={user.organization.name} />
            <BrandMark orgName={user.organization.name} />
            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle mode={resolvedMode} />
              <NotificationBell notifications={notifications} />
              <UserMenu name={user.name} email={user.email} roleName={user.role.name} />
            </div>
          </div>
        </header>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
