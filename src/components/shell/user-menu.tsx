"use client";

import { logout } from "@/app/actions/auth";
import { Menu, MenuItem, MenuFormItem, MenuSeparator } from "@/components/ui/menu";
import { cn } from "@/lib/cn";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// Avatar menu: identity header, profile link, sign out.
export function UserMenu({
  userId,
  name,
  email,
  roleName,
  avatarPath,
}: {
  userId: string;
  name: string;
  email: string;
  roleName: string;
  avatarPath: string | null;
}) {
  return (
    <Menu
      align="end"
      className="min-w-60"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-label={`Account: ${name}`}
          aria-expanded={open}
          className={cn(
            "flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary-container type-label-large text-on-primary-container transition-shadow hover:shadow-elevation-1",
            open && "outline-2 outline-offset-2 outline-primary"
          )}
        >
          {avatarPath ? (
            // eslint-disable-next-line @next/next/no-img-element -- served from a dynamic API route, not a static asset next/image can optimize
            <img src={`/api/users/${userId}/avatar`} alt="" className="h-full w-full object-cover" />
          ) : (
            initialsOf(name)
          )}
        </button>
      )}
    >
      <div className="px-3 py-2">
        <p className="type-label-large text-on-surface">{name}</p>
        <p className="truncate type-body-small text-on-surface-variant">{email}</p>
        <p className="mt-0.5 type-body-small text-on-surface-variant">{roleName}</p>
      </div>
      <MenuSeparator />
      <MenuItem icon="person" href="/profile">
        My profile
      </MenuItem>
      <MenuSeparator />
      <form action={logout}>
        <MenuFormItem icon="logout">Sign out</MenuFormItem>
      </form>
    </Menu>
  );
}
