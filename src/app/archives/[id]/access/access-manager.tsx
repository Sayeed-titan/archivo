"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { grantArchiveAccess, revokeArchiveAccess, type GrantAccessState } from "@/app/actions/access";
import { Combobox, CheckboxField, Button, Card, IconButton, useSnackbar } from "@/components/ui";
import { Icon } from "@/components/icon";

type Folder = { id: string; name: string };
type GrantableUser = { id: string; name: string; email: string; department: string | null };
type Grant = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  folderId: string | null;
  folderName: string | null;
  canView: boolean;
  canUpload: boolean;
};

export function AccessManager({
  archiveId,
  folders,
  users,
  grants,
}: {
  archiveId: string;
  folders: Folder[];
  users: GrantableUser[];
  grants: Grant[];
}) {
  const [state, action, pending] = useActionState<GrantAccessState, FormData>(grantArchiveAccess, undefined);
  const { showSnackbar } = useSnackbar();
  const [scope, setScope] = useState<"archive" | "folder">("archive");

  useEffect(() => {
    if (state && !state.message) showSnackbar("Access grant saved.");
  }, [state, showSnackbar]);

  const grouped = new Map<string, Grant[]>();
  for (const g of grants) {
    if (!grouped.has(g.userId)) grouped.set(g.userId, []);
    grouped.get(g.userId)!.push(g);
  }

  return (
    <div className="mt-6 space-y-6">
      <Card className="space-y-4">
        <h2 className="type-title-small text-on-surface">Grant access</h2>
        <form action={action} className="space-y-3">
          <input type="hidden" name="archiveId" value={archiveId} />
          <Combobox
            name="userId"
            label="User"
            placeholder="Select a user…"
            options={users.map((u) => ({ value: u.id, label: u.name, description: u.department ? `${u.email} · ${u.department}` : u.email }))}
          />

          <div className="flex gap-4 type-body-medium text-on-surface">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="scope"
                checked={scope === "archive"}
                onChange={() => setScope("archive")}
                className="accent-primary"
              />
              Whole archive
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="scope"
                checked={scope === "folder"}
                onChange={() => setScope("folder")}
                className="accent-primary"
              />
              One folder
            </label>
          </div>

          {scope === "folder" && (
            <Combobox
              name="folderId"
              label="Folder"
              placeholder="Select a folder…"
              options={folders.map((f) => ({ value: f.id, label: f.name }))}
            />
          )}

          <div className="flex gap-4">
            <CheckboxField name="canView" defaultChecked label="Can view" />
            <CheckboxField name="canUpload" label="Can upload" />
          </div>

          {state?.message && <p className="type-body-medium text-error">{state.message}</p>}

          <Button type="submit" loading={pending} loadingText="Saving…" icon="person_add">
            Grant access
          </Button>
        </form>
      </Card>

      <div>
        <h2 className="type-title-small text-on-surface">Current grants</h2>
        {grants.length === 0 ? (
          <p className="mt-2 type-body-medium text-on-surface-variant">
            No one has an explicit grant on this archive — access follows each user&apos;s normal role and department visibility.
          </p>
        ) : (
          <ul className="mt-2 space-y-3">
            {[...grouped.entries()].map(([userId, userGrants]) => (
              <Card key={userId} className="space-y-2">
                <p className="type-title-small text-on-surface">
                  {userGrants[0].userName} <span className="type-body-small text-on-surface-variant">{userGrants[0].userEmail}</span>
                </p>
                <ul className="divide-y divide-outline-variant/50">
                  {userGrants.map((g) => (
                    <GrantRow key={g.id} grant={g} />
                  ))}
                </ul>
              </Card>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function GrantRow({ grant }: { grant: Grant }) {
  const [pending, startTransition] = useTransition();
  const { showSnackbar } = useSnackbar();

  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2 type-body-medium text-on-surface">
        <Icon name={grant.folderId ? "folder" : "folder_open"} size={18} className="text-on-surface-variant" />
        <span>{grant.folderName ?? "Whole archive"}</span>
        <span className="type-body-small text-on-surface-variant">
          {[grant.canView && "view", grant.canUpload && "upload"].filter(Boolean).join(" · ") || "no access"}
        </span>
      </div>
      <IconButton
        label="Revoke access"
        icon="close"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await revokeArchiveAccess(grant.id);
            showSnackbar("Access revoked.");
          })
        }
      />
    </li>
  );
}
