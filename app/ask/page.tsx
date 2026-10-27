import { Suspense } from "react";
import { Chat } from "@/components/Chat";
import { SiteHeader } from "@/components/SiteHeader";
import { getBrand } from "@/lib/brand";
import { listHandbookDocs } from "@/lib/docs";

function clip(s: string, n = 90): string {
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
}

async function ChatWithTopics() {
  let topics: { title: string; desc: string }[] = [];
  try {
    const docs = await listHandbookDocs();
    topics = docs.slice(0, 6).map((d) => ({ title: d.title, desc: clip(d.summary || d.filename) }));
  } catch {
    topics = [];
  }
  return <Chat topics={topics} />;
}

export function generateMetadata() {
  const brand = getBrand();
  return {
    title: `Ask · ${brand.name}`,
    description: brand.description,
  };
}

export default function AskPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <SiteHeader active="chat" />
      <Suspense fallback={<Chat topics={[]} />}>
        <ChatWithTopics />
      </Suspense>
    </main>
  );
}
