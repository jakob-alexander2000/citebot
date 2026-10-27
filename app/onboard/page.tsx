import Link from "next/link";
import { OnboardStudio } from "@/components/OnboardStudio";
import { SiteHeader } from "@/components/SiteHeader";
import { getBrand } from "@/lib/brand";
import { getLocaleState } from "@/lib/request-locale";

export const instant = false;

export async function generateMetadata() {
  const { locale } = await getLocaleState();
  const brand = getBrand(locale);
  return {
    title: `Onboard · ${brand.name}`,
    description: "Configure a client packet, ask with the verify check, and export a handoff.",
  };
}

export default async function OnboardPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string | string[] }>;
}) {
  const { locale, source } = await getLocaleState();
  const brand = getBrand(locale);
  const params = await searchParams;
  const preset = typeof params.preset === "string" ? params.preset : undefined;

  return (
    <main className="flex min-h-full flex-1 flex-col">
      <SiteHeader active="onboard" locale={locale} source={source} />
      {brand.skin === "craft" ? (
        <OnboardStudio preset={preset} org={brand.org} footer={brand.footerNote} />
      ) : (
        <CraftOnlyNote name={brand.name} />
      )}
    </main>
  );
}

function CraftOnlyNote({ name }: { name: string }) {
  return (
    <article className="mx-auto w-full max-w-2xl px-4 pb-16 pt-12 sm:px-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
        Onboard
      </p>
      <h1 className="mt-3 font-serif text-[2.35rem] leading-[1.15] tracking-tight text-zinc-900 dark:text-zinc-50">
        This path is the CiteBot demo
      </h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
        {name} keeps the handbook Q&amp;A as it is. The config, guardrail, and handoff steps run
        when the deploy is named CiteBot. They do not retarget this handbook.
      </p>
      <p className="mt-6 text-sm">
        <Link
          href="/onboard/walkthrough"
          className="text-zinc-800 underline decoration-zinc-300 underline-offset-4 dark:text-zinc-200"
        >
          Walkthrough
        </Link>
        <span className="text-zinc-400"> · </span>
        <Link
          href="/onboard/run"
          className="text-zinc-800 underline decoration-zinc-300 underline-offset-4 dark:text-zinc-200"
        >
          How to run
        </Link>
      </p>
    </article>
  );
}
