// Renders the small markdown subset the agent files use: ## headings, - and 1. lists (one level of nesting),
// | tables |, paragraphs, **bold** and `code`. Text is always rendered as text, never as HTML.

type Block =
  | { kind: "h"; level: number; text: string }
  | { kind: "ul" | "ol"; items: { text: string; sub: string[] }[] }
  | { kind: "table"; rows: string[][] }
  | { kind: "p"; text: string };

function parse(md: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    const last = blocks[blocks.length - 1];
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    const nested = line.match(/^\s{2,}(?:[-*]|\d+\.)\s+(.*)$/);
    const ul = line.match(/^[-*]\s+(.*)$/);
    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (!line.trim()) blocks.push({ kind: "p", text: "" });
    else if (h) blocks.push({ kind: "h", level: h[1].length, text: h[2] });
    else if (nested && last && (last.kind === "ul" || last.kind === "ol") && last.items.length) last.items[last.items.length - 1].sub.push(nested[1]);
    else if (ul || ol) {
      const kind = ul ? "ul" : "ol";
      const item = { text: (ul ?? ol)![1], sub: [] };
      if (last && last.kind === kind) last.items.push(item);
      else blocks.push({ kind, items: [item] });
    } else if (line.trim().startsWith("|")) {
      const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue; // header separator row
      if (last && last.kind === "table") last.rows.push(cells);
      else blocks.push({ kind: "table", rows: [cells] });
    } else if (last && last.kind === "p" && last.text) last.text += " " + line.trim();
    else blocks.push({ kind: "p", text: line.trim() });
  }
  return blocks.filter((b) => b.kind !== "p" || b.text);
}

/** **bold** and `code` inside a line. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") && part.length > 4 ? <strong key={i} className="font-semibold text-frost">{part.slice(2, -2)}</strong>
        : part.startsWith("`") && part.endsWith("`") && part.length > 2 ? <code key={i} className="rounded border border-line px-1 text-[0.9em] text-fg">{part.slice(1, -1)}</code>
        : part,
      )}
    </>
  );
}

export function MiniMarkdown({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-fg">
      {parse(text).map((b, i) => {
        if (b.kind === "h") return <h3 key={i} className="pt-2 font-head text-base font-semibold uppercase tracking-wide text-frost"><Inline text={b.text} /></h3>;
        if (b.kind === "p") return <p key={i}><Inline text={b.text} /></p>;
        if (b.kind === "table")
          return (
            <div key={i} className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="text-xs uppercase text-muted"><tr>{b.rows[0].map((c, j) => <th key={j} className="py-1.5 pr-3"><Inline text={c} /></th>)}</tr></thead>
                <tbody>{b.rows.slice(1).map((r, j) => <tr key={j} className="border-t border-line align-top">{r.map((c, k) => <td key={k} className="py-1.5 pr-3"><Inline text={c} /></td>)}</tr>)}</tbody>
              </table>
            </div>
          );
        const List = b.kind === "ul" ? "ul" : "ol";
        return (
          <List key={i} className={`space-y-1.5 pl-5 ${b.kind === "ul" ? "list-disc" : "list-decimal"} marker:text-muted`}>
            {b.items.map((it, j) => (
              <li key={j}>
                <Inline text={it.text} />
                {it.sub.length > 0 && <ul className="mt-1 list-disc space-y-1 pl-5 marker:text-muted">{it.sub.map((s, k) => <li key={k}><Inline text={s} /></li>)}</ul>}
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
