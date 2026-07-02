import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import localFont from "next/font/local";
import { getShellUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { buildThemeCss, resolveThemeMode, DEFAULT_THEME, normalizeShape, normalizeFontScale } from "@/lib/theme/css";
import { AppShell } from "@/components/shell/app-shell";
import { SnackbarProvider } from "@/components/ui/snackbar";
import "./globals.css";

// MD3 reference typeface.
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
});

// Material Symbols icon font (ligature-based — <Icon name="search" />),
// self-hosted because next/font/google's registry doesn't include symbol
// fonts. Variable axes: FILL, GRAD, opsz, wght (see .material-icon in
// globals.css). display: "block" hides raw ligature text while loading.
const materialSymbols = localFont({
  src: "../fonts/material-symbols-outlined.woff2",
  variable: "--font-material-symbols",
  display: "block",
  preload: true,
});

export const metadata: Metadata = {
  title: "Spellbound Network — Archive Management",
  description: "Archive management for Spellbound Network.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Org theme + nav permissions for the shell; null on the login screen.
  const user = await getShellUser();
  const org = user?.organization;

  const themeCss = buildThemeCss({
    seedColor: org?.themeSeedColor ?? DEFAULT_THEME.seedColor,
    mode: DEFAULT_THEME.mode, // mode lives on <html data-theme>, not in the CSS
    shape: normalizeShape(org?.themeShape),
    fontScale: normalizeFontScale(org?.themeFontScale),
  });
  const resolvedMode = user ? resolveThemeMode(org?.themeMode, user.themePreference) : "system";

  const notifications = user
    ? await prisma.notification.findMany({
        where: { recipientId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];

  return (
    <html
      lang="en"
      data-theme={resolvedMode}
      className={`${roboto.variable} ${materialSymbols.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {/* Per-org MD3 tokens (React hoists this into <head>). */}
        <style href="archivo-theme" precedence="theme">
          {themeCss}
        </style>
        <SnackbarProvider>
          {user ? (
            <AppShell user={user} notifications={notifications} resolvedMode={resolvedMode}>
              {children}
            </AppShell>
          ) : (
            children
          )}
        </SnackbarProvider>
      </body>
    </html>
  );
}
