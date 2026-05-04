import type { ReactNode } from "react";

const CFR_RE = /(\d+)\s+CFR\s+(\d+)\.(\d+)/g;

function ecfrUrl(title: string, part: string, section: string): string {
  return `https://www.ecfr.gov/current/title-${title}/section-${part}.${section}`;
}

export function renderWithCitations(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(CFR_RE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) nodes.push(text.slice(lastIndex, start));
    const [full, title, part, section] = match;
    nodes.push(
      <a
        key={`${start}-${full}`}
        href={ecfrUrl(title!, part!, section!)}
        target="_blank"
        rel="noopener noreferrer"
        className="cfr-citation"
      >
        {full}
      </a>,
    );
    lastIndex = start + full.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}
