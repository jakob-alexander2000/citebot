import Link from "next/link";
import type { ReactNode } from "react";
import { getBrand } from "@/lib/brand";
import { showCitebotEvals } from "@/lib/eval-public";
import type { Locale } from "@/lib/locale";
import { ui } from "@/lib/messages";
import { LocaleSwitch } from "./LocaleSwitch";

type NavId = "home" | "chat" | "handbook" | "harness" | "evals" | "onboard";

type Props = {
  active?: NavId;
  locale: Locale;
  source: "cookie" | "header";
};

export function SiteHeader({ active, locale, source }: Props) {
  const brand = getBrand(locale);
  const copy = ui(locale);

  const product = brand.skin === "product";
  const craft = brand.skin === "craft";
  const evals = showCitebotEvals(brand.skin);

  return (
    <header
      data-skin={brand.skin}
      data-bilingual={brand.bilingual ? "true" : "false"}
      className="sticky top-0 z-20 border-b border-zinc-200/80 bg-[var(--background)]/85 backdrop-blur-md dark:border-zinc-800/80"
    >
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            aria-current={active === "home" ? "page" : undefined}
            className="flex items-center gap-2.5"
          >
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
            <span
              className={
                product
                  ? "font-serif text-[1.15rem] leading-none tracking-tight text-zinc-900 dark:text-zinc-50"
                  : "text-sm font-medium tracking-tight text-zinc-900 dark:text-zinc-50"
              }
            >
              {brand.name}
            </span>
            {product ? (
              <span className="hidden text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400 md:inline">
                {brand.corpusLabel}
              </span>
            ) : null}
            {craft ? (
              <span className="rounded-full border border-zinc-300 px-1.5 py-px font-mono text-[10px] uppercase tracking-wider text-zinc-500 dark:border-zinc-600">
                Demo
              </span>
            ) : null}
          </Link>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Primary">
            <NavLink href="/ask" active={active === "chat"}>
              {copy.navAsk}
            </NavLink>
            <NavLink href="/handbook" active={active === "handbook"}>
              {copy.navHandbook}
            </NavLink>
            <NavLink href="/harness" active={active === "harness"}>
              {copy.navHarness}
            </NavLink>
            {evals ? (
              <NavLink href="/evals" active={active === "evals"}>
                Evals
              </NavLink>
            ) : null}
            {craft ? (
              <NavLink href="/onboard" active={active === "onboard"}>
                Onboard
              </NavLink>
            ) : null}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/ask"
            aria-current={active === "chat" ? "page" : undefined}
            className={
              active === "chat"
                ? "text-xs font-medium text-zinc-900 sm:hidden dark:text-zinc-100"
                : "text-xs text-zinc-500 transition hover:text-zinc-900 sm:hidden dark:hover:text-zinc-100"
            }
          >
            {copy.navAsk}
          </Link>
          {craft ? (
            <Link
              href="/onboard"
              aria-current={active === "onboard" ? "page" : undefined}
              className={
                active === "onboard"
                  ? "text-xs font-medium text-zinc-900 sm:hidden dark:text-zinc-100"
                  : "text-xs text-zinc-500 transition hover:text-zinc-900 sm:hidden dark:hover:text-zinc-100"
              }
            >
              Onboard
            </Link>
          ) : null}
          {evals ? (
            <Link
              href="/evals"
              aria-current={active === "evals" ? "page" : undefined}
              className={
                active === "evals"
                  ? "text-xs font-medium text-zinc-900 sm:hidden dark:text-zinc-100"
                  : "text-xs text-zinc-500 transition hover:text-zinc-900 sm:hidden dark:hover:text-zinc-100"
              }
            >
              Evals
            </Link>
          ) : null}
          <Link
            href="/harness"
            aria-current={active === "harness" ? "page" : undefined}
            className={
              active === "harness"
                ? "text-xs font-medium text-zinc-900 sm:hidden dark:text-zinc-100"
                : "text-xs text-zinc-500 transition hover:text-zinc-900 sm:hidden dark:hover:text-zinc-100"
            }
          >
            {copy.navHarness}
          </Link>
          {brand.bilingual ? <LocaleSwitch locale={locale} source={source} /> : null}
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
      aria-current={active ? "page" : undefined}
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
