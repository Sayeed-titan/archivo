import "server-only";
import nodemailer from "nodemailer";

// SRS.md FR-10.2: email is a configurable enhancement over in-app
// notifications. SMTP_HOST defaults to MailDev's local catcher
// (localhost:1025, `npx maildev` — see CLAUDE.md) for dev; point these
// env vars at a real provider (SendGrid, SES, etc.) for production.
// If SMTP_HOST is unset, sendEmail() no-ops rather than throwing, so the
// app works without any email setup at all — email is additive, not load-bearing.
function getTransport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

export async function sendEmail(to: string, subject: string, text: string, linkUrl?: string) {
  const transport = getTransport();
  if (!transport) return { sent: false, reason: "SMTP_HOST not configured" };

  const html = `
    <p>${text}</p>
    ${linkUrl ? `<p><a href="${linkUrl}">View in Archivo</a></p>` : ""}
    <hr />
    <p style="color:#888;font-size:12px;">You're receiving this because email notifications are enabled for your account. Turn them off in your profile settings.</p>
  `;

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? "Archivo <notifications@archivo.local>",
    to,
    subject,
    text,
    html,
  });

  return { sent: true };
}
