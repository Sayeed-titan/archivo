[← Manual home](README.md)

# Notifications

Archivo notifies relevant people in-app (and by email, if enabled) when
something happens that they'd want to know about. Open the panel from the
bell icon in the top bar — see
[Dashboard → Notifications](02-dashboard.md#notifications) for where to find
it and how to mark entries read.

## What triggers a notification

| Event | Who's notified |
|---|---|
| A new archive is created | All Administrators |
| A file upload completes | The archive's creator (unless they uploaded it themselves) |
| An archive's status moves to Pending Review | All Administrators |
| Storage usage crosses 80% of the organization's quota | All Administrators (at most once per 24 hours, to avoid repeat spam) |

"Missing mandatory documents" is intentionally **not** a push notification —
it's surfaced continuously via the Archive Health badge on every archive
list instead of firing a new event every time an empty folder is checked.

## In-app vs. email

In-app notifications (the bell) are always on for everyone — there's no way
to turn them off, since they're the primary way of staying aware inside the
app. Email is a separate, optional layer on top:

- Whether email sending is available at all is an organization-wide setting
  configured by whoever runs the server (an SMTP connection) — if it isn't
  configured, only in-app notifications appear, silently.
- When email *is* available, each person can opt out for themselves at
  [Your profile](10-profile.md#notifications) — email failing to send (bad
  configuration, mail server down) never blocks the in-app notification or
  the action that triggered it.

## Storage quota

The 80%-of-quota warning only fires if your organization has set a storage
quota at [Settings → Organization](settings/organization.md) — by default
there's no limit configured, so no warning fires until an Administrator sets
one.
