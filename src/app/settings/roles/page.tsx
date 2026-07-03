import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { RoleCard, type RoleWithCount } from "./role-card";
import { CreateRoleForm } from "./create-role-form";
import { UserRoleTable } from "./user-role-table";
import { PERMISSION_LABELS } from "./permission-labels";

export default async function RolesSettingsPage() {
  const user = await getCurrentUser();
  if (!user.role.canManageSettings) {
    redirect("/dashboard");
  }

  const [roles, users] = await Promise.all([
    prisma.role.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { users: true } } },
    }),
    user.role.canManageUsers
      ? prisma.user.findMany({
          where: { organizationId: user.organizationId },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const rolesWithCount: RoleWithCount[] = roles.map((r) => ({
    id: r.id,
    name: r.name,
    userCount: r._count.users,
    permissions: Object.fromEntries(PERMISSION_LABELS.map(({ key }) => [key, (r as unknown as Record<string, boolean>)[key]])),
  }));

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      <PageHeader
        backHref="/settings"
        backLabel="Settings"
        title="Roles & permissions"
        subtitle="Create roles, choose what each can do, and assign them to your team."
      />

      <div className="mt-6 space-y-4">
        {rolesWithCount.map((role) => (
          <RoleCard key={role.id} role={role} />
        ))}
      </div>

      <div className="mt-6">
        <CreateRoleForm />
      </div>

      {user.role.canManageUsers && (
        <>
          <h2 className="mt-8 type-title-medium text-on-surface">Assign users</h2>
          <div className="mt-2">
            <UserRoleTable
              users={users.map((u) => ({ id: u.id, name: u.name, email: u.email, roleId: u.roleId }))}
              roles={roles.map((r) => ({ id: r.id, name: r.name }))}
            />
          </div>
        </>
      )}
    </main>
  );
}
