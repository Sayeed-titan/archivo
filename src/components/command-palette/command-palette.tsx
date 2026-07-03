"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/icon";
import { CircularProgress } from "@/components/ui/progress";

// Global ⌘K / Ctrl+K command palette. Mounted once in AppShell so it's
// available from any page. Two result groups fetched from
// /api/search/quick (archives, files) plus a static, role-filtered list
// of "quick actions" (jump to a nav destination) that always matches on
// label substring — no network round trip needed for those.
//
// Built on the same native <dialog> + outside-click-free (Escape/backdrop
// only) skeleton as Dialog.tsx, but custom-laid-out (top-anchored, wide)
// since a search palette isn't a confirm/form dialog.

export type QuickAction = { id: string; label: string; icon: string; href: string };

type ArchiveResult = { id: string; title: string; subtitle: string; status: string; href: string };
type FileResult = { id: string; title: string; subtitle: string; icon: string; href: string };

type FlatItem =
  | { kind: "action"; key: string; action: QuickAction }
  | { kind: "archive"; key: string; archive: ArchiveResult }
  | { kind: "file"; key: string; file: FileResult };

const STATUS_ICON: Record<string, string> = {
  Draft: "edit_note",
  "Pending Review": "pending_actions",
  Archived: "inventory_2",
};

export function CommandPalette({ quickActions }: { quickActions: QuickAction[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Results are keyed by the query they were fetched for, so a query that
  // no longer qualifies (too short) can be detected by comparing keys
  // instead of needing an effect to clear stale results out.
  const [resultsFor, setResultsFor] = useState<{ query: string; archives: ArchiveResult[]; files: FileResult[] }>({
    query: "",
    archives: [],
    files: [],
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const trimmedQuery = query.trim();
  const resultsCurrent = resultsFor.query === trimmedQuery;
  const archives = useMemo(() => (resultsCurrent ? resultsFor.archives : []), [resultsCurrent, resultsFor]);
  const files = useMemo(() => (resultsCurrent ? resultsFor.files : []), [resultsCurrent, resultsFor]);
  // Derived, not stored: "loading" is exactly "long enough query whose
  // results haven't arrived yet" — no separate boolean to fall out of
  // sync with resultsFor/trimmedQuery.
  const loading = trimmedQuery.length >= 2 && !resultsCurrent;

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResultsFor({ query: "", archives: [], files: [] });
    setActiveIndex(0);
  }, []);

  // Global shortcut: ⌘K (Mac) or Ctrl+K (Windows/Linux), from anywhere
  // except while already typing in another text field.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // Debounced fetch against the quick-search API — 2+ characters only,
  // matching the API route's own minimum-length short-circuit. Only the
  // async callback (data arriving from an external system) calls
  // setState, never the effect body itself.
  useEffect(() => {
    if (trimmedQuery.length < 2) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      fetch(`/api/search/quick?q=${encodeURIComponent(trimmedQuery)}`)
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          setResultsFor({ query: trimmedQuery, archives: data.archives ?? [], files: data.files ?? [] });
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [trimmedQuery]);

  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return quickActions;
    return quickActions.filter((a) => a.label.toLowerCase().includes(q));
  }, [quickActions, query]);

  const items: FlatItem[] = useMemo(() => {
    const list: FlatItem[] = [];
    for (const a of filteredActions) list.push({ kind: "action", key: `action-${a.id}`, action: a });
    for (const a of archives) list.push({ kind: "archive", key: `archive-${a.id}`, archive: a });
    for (const f of files) list.push({ kind: "file", key: `file-${f.id}`, file: f });
    return list;
  }, [filteredActions, archives, files]);

  // Clamp rather than reset-via-effect: the result set can change shape
  // from either typing (filteredActions) or an async fetch resolving
  // (archives/files), and a stored index could point past the new list's
  // end in either case — clamping at read time keeps a single source of
  // truth without a second effect racing the first.
  const activeIndexClamped = Math.min(activeIndex, Math.max(items.length - 1, 0));

  function go(href: string) {
    close();
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[activeIndexClamped];
      if (!item) return;
      if (item.kind === "action") go(item.action.href);
      else if (item.kind === "archive") go(item.archive.href);
      else go(item.file.href);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-full border border-outline-variant bg-surface-container-low px-3.5 py-1.5 text-on-surface-variant transition-colors hover:bg-on-surface-8 sm:flex"
        aria-label="Open quick search"
      >
        <Icon name="search" size={18} />
        <span className="type-body-medium">Search…</span>
        <span className="ml-6 rounded-xs bg-surface-container-highest px-1.5 py-0.5 type-label-small text-on-surface-variant">
          Ctrl/⌘ K
        </span>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open quick search"
        className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-on-surface-8 sm:hidden"
      >
        <Icon name="search" size={22} />
      </button>

      <dialog
        ref={dialogRef}
        onClose={close}
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
        className="m-0 mt-[10vh] ml-auto mr-auto w-[min(calc(100vw-2rem),40rem)] overflow-hidden rounded-xl bg-surface-container-high p-0 text-on-surface shadow-elevation-3 backdrop:bg-scrim/40"
      >
        <div className="flex items-center gap-3 border-b border-outline-variant px-4 py-3">
          <Icon name="search" size={20} className="text-on-surface-variant" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search archives, files, or jump to a page…"
            className="flex-1 bg-transparent type-body-large text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none"
          />
          {loading && <CircularProgress size={18} className="text-on-surface-variant" />}
          <kbd className="rounded-xs bg-surface-container-highest px-1.5 py-0.5 type-label-small text-on-surface-variant">Esc</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredActions.length > 0 && (
            <ResultGroup label="Quick actions">
              {filteredActions.map((action) => {
                const index = items.findIndex((i) => i.kind === "action" && i.action.id === action.id);
                return (
                  <ResultRow
                    key={action.id}
                    icon={action.icon}
                    title={action.label}
                    active={index === activeIndexClamped}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => go(action.href)}
                  />
                );
              })}
            </ResultGroup>
          )}

          {archives.length > 0 && (
            <ResultGroup label="Archives">
              {archives.map((archive) => {
                const index = items.findIndex((i) => i.kind === "archive" && i.archive.id === archive.id);
                return (
                  <ResultRow
                    key={archive.id}
                    icon={STATUS_ICON[archive.status] ?? "folder"}
                    title={archive.title}
                    subtitle={archive.subtitle}
                    active={index === activeIndexClamped}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => go(archive.href)}
                  />
                );
              })}
            </ResultGroup>
          )}

          {files.length > 0 && (
            <ResultGroup label="Files">
              {files.map((file) => {
                const index = items.findIndex((i) => i.kind === "file" && i.file.id === file.id);
                return (
                  <ResultRow
                    key={file.id}
                    icon={file.icon}
                    title={file.title}
                    subtitle={file.subtitle}
                    active={index === activeIndexClamped}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => go(file.href)}
                  />
                );
              })}
            </ResultGroup>
          )}

          {!loading && query.trim().length >= 2 && archives.length === 0 && files.length === 0 && (
            <p className="px-3 py-6 text-center type-body-medium text-on-surface-variant">
              No archives or files match “{query.trim()}”.
            </p>
          )}

          {query.trim() === "" && filteredActions.length === 0 && (
            <p className="px-3 py-6 text-center type-body-medium text-on-surface-variant">Start typing to search.</p>
          )}
        </div>
      </dialog>
    </>
  );
}

function ResultGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1 last:mb-0">
      <p className="px-3 py-1.5 type-label-medium uppercase tracking-wide text-on-surface-variant">{label}</p>
      <div>{children}</div>
    </div>
  );
}

function ResultRow({
  icon,
  title,
  subtitle,
  active,
  onMouseEnter,
  onClick,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  active: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
        active && "bg-on-surface-8"
      )}
    >
      <Icon name={icon} size={20} className="shrink-0 text-on-surface-variant" />
      <div className="min-w-0 flex-1">
        <p className="truncate type-body-medium text-on-surface">{title}</p>
        {subtitle && <p className="truncate type-body-small text-on-surface-variant">{subtitle}</p>}
      </div>
      <Icon name="arrow_forward" size={16} className="shrink-0 text-on-surface-variant/60" />
    </button>
  );
}
