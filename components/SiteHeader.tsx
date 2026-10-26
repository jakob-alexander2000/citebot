import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  active?: "chat" | "handbook";
};

export function SiteHeader({ active = "chat" }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-[var(--background)]/85 backdrop-blur-md dark:border-zinc-800/80">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-900 bg-zinc-900 text-[11px] font-semibold tracking-wide text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900">
              C
            </span>
            <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              CiteBot
            </span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <NavLink href="/" active={active === "chat"}>
              Ask
            </NavLink>
            <NavLink href="/handbook" active={active === "handbook"}>
              Handbook
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/handbook"
            className="text-xs text-zinc-500 transition hover:text-zinc-900 sm:hidden dark:hover:text-zinc-100"
          >
            Handbook
          </Link>
          <a
            href="https://github.com/jakob-alexander2000/citebot"
            className="text-xs text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "rounded-md px-2.5 py-1 text-xs font-medium text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100"
      }
    >
      {children}
    </Link>
  );
}
