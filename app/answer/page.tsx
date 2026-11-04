import { AnswerDesk } from "@/components/AnswerDesk";
import { SiteHeader } from "@/components/SiteHeader";
import { getLocaleState } from "@/lib/request-locale";

export const instant = false;

export default async function AnswerPage() {
  const { locale, source } = await getLocaleState();
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <SiteHeader active="answer" locale={locale} source={source} />
      <AnswerDesk />
    </main>
  );
}
