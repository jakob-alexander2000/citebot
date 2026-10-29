import { cookies } from "next/headers";
import { Suspense } from "react";
import { Chat } from "@/components/Chat";
import { SiteHeader } from "@/components/SiteHeader";
import { getBrand } from "@/lib/brand";
import { listHandbookDocs } from "@/lib/docs";
import { assignChipOrder, CHIP_ORDER_COOKIE, type ChipOrderVariant } from "@/lib/experiment";
import type { Locale } from "@/lib/locale";
import { ui } from "@/lib/messages";
import { getLocaleState } from "@/lib/request-locale";

export const instant = false;

function clip(s: string, n = 90): string {
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
}

async function ChatWithTopics({
  locale,
  chipVariant,
  assignChip,
}: {
  locale: Locale;
  chipVariant: ChipOrderVariant | null;
  assignChip: boolean;
}) {
  let topics: { title: string; desc: string }[] = [];
  try {
    const docs = await listHandbookDocs({ locale });
    topics = docs.slice(0, 6).map((d) => ({
      title: d.title,
      desc: clip(d.summary || d.filename),
    }));
  } catch {
    topics = [];
  }
  return (
    <Chat
      key={locale}
      topics={topics}
      locale={locale}
      chipVariant={chipVariant}
      assignChip={assignChip}
    />
  );
}

async function chipExperiment(): Promise<{ variant: ChipOrderVariant; fresh: boolean }> {
  const jar = await cookies();
  return assignChipOrder(jar.get(CHIP_ORDER_COOKIE)?.value, Math.random());
}

export async function generateMetadata() {
  const { locale } = await getLocaleState();
  const brand = getBrand(locale);
  return {
    title: ui(locale).askMeta(brand.name),
    description: brand.description,
  };
}

export default async function AskPage() {
  const { locale, source } = await getLocaleState();
  const experiment = await chipExperiment();
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <SiteHeader active="chat" locale={locale} source={source} />
      <Suspense
        fallback={
          <Chat topics={[]} locale={locale} chipVariant={experiment.variant} assignChip={false} />
        }
      >
        <ChatWithTopics
          locale={locale}
          chipVariant={experiment.variant}
          assignChip={experiment.fresh}
        />
      </Suspense>
    </main>
  );
}
