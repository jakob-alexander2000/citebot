import Link from "next/link";
import type { ReactNode } from "react";
import { getBrand } from "@/lib/brand";

type Props = {
  active?: "chat" | "handbook" | "harness";
};

export function SiteHeader({ active = "chat" }: Props) {
  const brand = getBrand();

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-[var(--background)]/85 backdrop-blur-md dark:border-zinc-800/80">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logoUrl}
                alt=""
                className="h-7 w-7 rounded-md object-contain"
              />
            ) : (
              <span
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-semibold tracking-wide text-white"
                style={{ backgroundColor: "var(--brand-accent)" }}
              >
                {brand.initial}
              </span>
            )}
            <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {brand.name}
            </span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <NavLink href="/" active={active === "chat"}>
              Ask
            </NavLink>
            <NavLink href="/handbook" active={active === "handbook"}>
              Handbook
            </NavLink>
            <NavLink href="/harness" active={active === "harness"}>
              Harness
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/harness"
            className="text-xs text-zinc-500 transition hover:text-zinc-900 sm:hidden dark:hover:text-zinc-100"
          >
            Harness
          </Link>
          {brand.githubUrl ? (
            <a
              href={brand.githubUrl}
              className="text-xs text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          ) : null}
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
