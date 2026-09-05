import type { ReactNode } from "react";

// http(s):// URLs and bare www. hosts. Stops at whitespace and at quote/angle
// characters that are never part of a URL but often sit next to one.
const URL_RE = /((?:https?:\/\/|www\.)[^\s<>"'׳״]+)/gi;

// Trailing punctuation belongs to the sentence, not the link: "see https://x.co."
const TRAILING_RE = /[.,;:!?…)\]}"'׳״]+$/;

/**
 * Splits text into plain strings and <a> elements for any URLs it contains.
 * Returns React nodes (never HTML), so note text can never inject markup.
 */
export function linkify(text: string, className?: string): ReactNode {
  if (!text) return text;

  const parts: ReactNode[] = [];
  let last = 0;

  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    const raw = match[0];
    const trailing = raw.match(TRAILING_RE)?.[0] ?? "";
    const url = trailing ? raw.slice(0, -trailing.length) : raw;
    if (!url) continue;

    if (start > last) parts.push(text.slice(last, start));
    parts.push(
      // dir="ltr" keeps the URL from being reordered inside RTL Hebrew text.
      <a
        key={start}
        href={url.startsWith("www.") ? `https://${url}` : url}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        dir="ltr"
      >
        {url}
      </a>
    );
    if (trailing) parts.push(trailing);
    last = start + raw.length;
  }

  if (parts.length === 0) return text;
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
