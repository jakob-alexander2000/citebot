import { Chat } from "@/components/Chat";

export default function Home() {
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
              C
            </span>
            <span className="text-sm font-semibold tracking-tight">CiteBot</span>
          </div>
          <a
            href="https://github.com/jakob-alexander2000/citebot"
            className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </header>
      <Chat />
    </main>
  );
}
