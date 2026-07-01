"use client";

import { useState } from "react";
import Link from "next/link";
import { markNotificationRead, markAllNotificationsRead } from "@/app/actions/notifications";

export type NotificationItem = {
  id: string;
  type: string;
  message: string;
  linkPath: string | null;
  readAt: Date | null;
  createdAt: Date;
};

const TYPE_ICON: Record<string, string> = {
  archive_created: "🗂️",
  missing_documents: "⚠️",
  upload_completed: "✅",
  review_pending: "⏳",
  storage_limit: "💾",
};

export function NotificationBell({ notifications }: { notifications: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md border border-slate-300 px-3 py-2 text-sm"
      >
        Notifications
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-sm font-medium">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllNotificationsRead()}
                className="text-xs text-slate-500 underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <li key={n.id} className={`border-b border-slate-50 px-3 py-2 text-sm ${!n.readAt ? "bg-slate-50" : ""}`}>
                <Link
                  href={n.linkPath ?? "#"}
                  onClick={() => !n.readAt && markNotificationRead(n.id)}
                  className="flex gap-2"
                >
                  <span>{TYPE_ICON[n.type] ?? "🔔"}</span>
                  <span className="flex-1">
                    {n.message}
                    <span className="mt-0.5 block text-xs text-slate-400">{n.createdAt.toLocaleString()}</span>
                  </span>
                </Link>
              </li>
            ))}
            {notifications.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-slate-400">No notifications yet.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
