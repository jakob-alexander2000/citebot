import type { ReactNode } from "react";

type Props = {
  content: string;
  className?: string;
};

/** Minimal markdown renderer for handbook corpus (headings, lists, bold, paras). */
export function Markdown({ content, className = "" }: Props) {
  const blocks = content.trim().split(/\n{2,}/);

  return (
    <div
      className={`space-y-4 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-300 ${className}`}
    >
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith("# ")) {
          return (
            <h1
              key={i}
              className="font-serif text-3xl font-normal tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              {inline(trimmed.slice(2))}
            </h1>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2
              key={i}
              className="pt-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500"
            >
              {inline(trimmed.slice(3))}
            </h2>
          );
        }

        const lines = trimmed.split("\n");
        if (lines.every((l) => /^[-*]\s+/.test(l.trim()) || l.trim() === "")) {
          return (
            <ul key={i} className="space-y-2 pl-1">
              {lines
                .filter((l) => l.trim())
                .map((l, j) => (
                  <li key={j} className="flex gap-3">
                    <span
                      className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-500"
                      aria-hidden
                    />
                    <span>{inline(l.replace(/^[-*]\s+/, ""))}</span>
                  </li>
                ))}
            </ul>
          );
        }

        if (/^\d+\.\s+/.test(trimmed)) {
          return (
            <ol
              key={i}
              className="list-decimal space-y-2 pl-5 marker:text-zinc-400"
            >
              {lines
                .filter((l) => l.trim())
                .map((l, j) => (
                  <li key={j}>{inline(l.replace(/^\d+\.\s+/, ""))}</li>
                ))}
            </ol>
          );
        }

        return (
          <p key={i} className="whitespace-pre-wrap">
            {inline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong
          key={i}
          className="font-semibold text-zinc-900 dark:text-zinc-100"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
