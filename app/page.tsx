import { Chat } from "@/components/Chat";
import { SiteHeader } from "@/components/SiteHeader";

export default function Home() {
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <SiteHeader active="chat" />
      <Chat />
    </main>
  );
}
