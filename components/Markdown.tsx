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
              className="pt-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-700 dark:text-zinc-300"
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
              className="list-decimal space-y-2 pl-5 marker:text-zinc-700 dark:marker:text-zinc-300"
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

const INLINE = /(\*\*[^*\n]+\*\*|(?<![\w*])\*[^*\n]+\*(?!\*)|(?<![\w])_[^_\n]+_(?![\w]))/g;

/** Bold and italics only. React escapes the text, so raw HTML stays text. */
export function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(INLINE)) {
    const start = match.index ?? 0;
    if (start > last) nodes.push(text.slice(last, start));
    const part = match[0];
    if (part.startsWith("**")) {
      nodes.push(
        <strong key={index} className="font-semibold text-zinc-900 dark:text-zinc-100">
          {part.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(<em key={index}>{part.slice(1, -1)}</em>);
    }
    last = start + part.length;
    index += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** One line of an answer or a source snippet, with the same inline marks as the full renderer. */
export function InlineMarkdown({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}) {
  return <span className={className}>{inline(content)}</span>;
}
