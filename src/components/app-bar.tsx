import Image from "next/image";
import Link from "next/link";

// Shared top bar shown on every page. Carries the client's brand (Spellbound
// Network) so the app reads as their instance of Archivo.
export function AppBar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image
            src="/spellbound-network-logo.png"
            alt="Spellbound Network"
            width={4331}
            height={2100}
            priority
            className="h-24 w-auto"
          />
        </Link>
        <span className="text-xs uppercase tracking-wide text-slate-400">
          Archive Management
        </span>
      </div>
    </header>
  );
}
