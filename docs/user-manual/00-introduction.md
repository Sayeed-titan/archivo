[← Manual home](README.md)

# Introduction

Archivo is a central place to store, organize, find, and share the documents,
photos, and videos that belong to an event, program, project, or client
engagement. Instead of scattered folders on individual computers or shared
drives, everything lives in one system with consistent structure, a
searchable record of who did what, and controls over who can see or download
what.

## Core concepts

**Archive** — the top-level container for one event, program, or project
(e.g. "Annual General Meeting 2026", "JMI Archieve"). Every archive gets an
auto-generated reference number (`ARC-2026-00016`) and belongs to one
**category**.

**Category** — a type of archive (Events, Workshops, NGO Projects, IT
Project, …). Each category has its own **folder template** — the set of
folders a new archive of that category is automatically given, so an "Events"
archive and an "IT Project" archive don't get the same folder structure. See
[Folder templates](settings/folder-templates.md).

**Folder** — a subfolder inside an archive (e.g. "Invoices & Vouchers",
"SRS"). Some folders are marked **required**, meaning the approval workflow
won't let the archive move to certain statuses until they contain at least
one file.

**File** — an uploaded document, image, video, or other file, always inside
a folder. Re-uploading a file with the same name creates a new **version**
rather than overwriting the old one — nothing is silently lost. See
[Files](04-files.md).

**Status / workflow** — every archive has a status (Draft, Pending Review,
Archived, or whatever your organization has configured) and moves through
that sequence via defined transitions, some of which require conditions to
be met first (e.g. "all mandatory folders must have a file"). See
[Approval workflow](settings/workflow.md).

**Archive Health** — a quick visual signal (Healthy / Needs attention /
Critical) combining an archive's workflow position with whether its required
folders are actually filled in, shown as a badge everywhere an archive is
listed.

**Role** — what a signed-in user is allowed to do (create archives, upload,
delete, manage settings, …). See the role table in the
[manual home](README.md#roles-referenced-throughout-this-manual) and
[Roles & permissions](settings/roles.md).

## What's covered in this manual

Every page a signed-in user can reach is documented, organized by what you're
trying to do rather than by menu structure — day-to-day work first
(archives, files, search), then administration (Settings), then operations
that happen outside the app (backups). Use the [table of contents](README.md)
to jump to any section.
