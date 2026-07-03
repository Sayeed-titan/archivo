"use client";

import { useTransition } from "react";
import { assignUserRole } from "@/app/actions/roles";
import { Table, TableHead, Th, Td, TableRow, Combobox, useSnackbar } from "@/components/ui";

type UserItem = { id: string; name: string; email: string; roleId: string };
type RoleOption = { id: string; name: string };

export function UserRoleTable({ users, roles }: { users: UserItem[]; roles: RoleOption[] }) {
  const [, startTransition] = useTransition();
  const { showSnackbar } = useSnackbar();
  const roleOptions = roles.map((r) => ({ value: r.id, label: r.name }));

  return (
    <Table>
      <TableHead>
        <Th>User</Th>
        <Th>Email</Th>
        <Th>Role</Th>
      </TableHead>
      <tbody>
        {users.map((u) => (
          <TableRow key={u.id}>
            <Td>{u.name}</Td>
            <Td className="text-on-surface-variant">{u.email}</Td>
            <Td>
              <Combobox
                compact
                clearable={false}
                className="w-48"
                value={u.roleId}
                options={roleOptions}
                onValueChange={(roleId) =>
                  startTransition(async () => {
                    await assignUserRole(u.id, roleId);
                    showSnackbar(`${u.name}'s role updated.`);
                  })
                }
              />
            </Td>
          </TableRow>
        ))}
      </tbody>
    </Table>
  );
}
