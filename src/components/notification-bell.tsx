"use client";

import { useState } from "react";
import Link from "next/link";
import { markNotificationRead, markAllNotificationsRead } from "@/app/actions/notifications";
import { Icon } from "@/components/icon";
import { IconButton } from "@/components/ui/icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";

export type NotificationItem = {
  id: string;
  type: string;
  message: string;
  linkPath: string | null;
  readAt: Date | null;
  createdAt: Date;
};

const TYPE_ICON: Record<string, string> = {
  archive_created: "create_new_folder",
  missing_documents: "warning",
  upload_completed: "check_circle",
  review_pending: "pending_actions",
  storage_limit: "database",
};

export function NotificationBell({ notifications }: { notifications: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="relative">
      <span className="relative inline-block">
        <IconButton
          icon="notifications"
          label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
          filledIcon={unreadCount > 0}
          onClick={() => setOpen((v) => !v)}
        />
        {unreadCount > 0 && (
          <span className="pointer-events-none absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 type-label-small text-on-error">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </span>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-md bg-surface-container shadow-elevation-2">
          <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
            <span className="type-title-small text-on-surface">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllNotificationsRead()}
                className="rounded-full px-2 py-1 type-label-medium text-primary hover:bg-primary-8"
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <li key={n.id} className={cn("border-b border-outline-variant/50 last:border-b-0", !n.readAt && "bg-primary-8")}>
                <Link
                  href={n.linkPath ?? "#"}
                  onClick={() => {
                    setOpen(false);
                    if (!n.readAt) markNotificationRead(n.id);
                  }}
                  className="flex gap-3 px-4 py-3 transition-colors hover:bg-on-surface-8"
                >
                  <Icon name={TYPE_ICON[n.type] ?? "notifications"} size={20} className="mt-0.5 text-on-surface-variant" />
                  <span className="flex-1 type-body-medium text-on-surface">
                    {n.message}
                    <span className="mt-0.5 block type-body-small text-on-surface-variant">
                      {n.createdAt.toLocaleString()}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
            {notifications.length === 0 && (
              <li>
                <EmptyState icon="notifications_off" title="All caught up" description="Nothing new right now." className="py-6" />
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
