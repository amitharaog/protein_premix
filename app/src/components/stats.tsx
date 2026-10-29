// Shared by the admin results page and the agent board. Bars: one series, so one hue and no legend.
export const BAR = "#c98048"; // caramel, validated against the dark panel (lightness band + 3:1 contrast)

export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

export function Tile({ label, value, sub, small }: { label: string; value: string; sub?: string; small?: boolean }) {
  return (
    <div className="rounded-[14px] border border-line bg-panel p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`tabular mt-1 font-display text-frost ${small ? "text-2xl" : "text-4xl"}`}>{value}</p>
      {sub && <p className="tabular text-xs text-muted">{sub}</p>}
    </div>
  );
}

/** Horizontal bars, % of people who answered. Value at the tip, hover title, table view underneath. */
export function BarCard({ title, note, items, denom }: { title: string; note: string; items: { label: string; count: number }[]; denom: number }) {
  return (
    <figure className="rounded-[14px] border border-line bg-panel p-4">
      <figcaption>
        <h2 className="font-head text-base font-semibold leading-snug text-frost">{title}</h2>
        <p className="text-xs text-muted">{note}</p>
      </figcaption>
      <ul className="mt-3 space-y-2.5">
        {items.map((it) => {
          const p = pct(it.count, denom);
          return (
            <li key={it.label} className="group" title={`${it.label}: ${it.count} (${p}%)`}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-fg">{it.label}</span>
                <span className="tabular shrink-0 text-muted group-hover:text-fg">{it.count} · {p}%</span>
              </div>
              <div className="mt-1 h-3 w-full bg-line/60">
                <div className="h-full rounded-r-[4px]" style={{ width: `${p}%`, background: BAR, minWidth: it.count ? 4 : 0 }} />
              </div>
            </li>
          );
        })}
      </ul>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs text-muted">Table view</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-xs text-muted"><tr><th className="py-1">Option</th><th className="py-1 text-right">Count</th><th className="py-1 text-right">%</th></tr></thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.label} className="border-t border-line"><td className="py-1">{it.label}</td><td className="tabular py-1 text-right">{it.count}</td><td className="tabular py-1 text-right">{pct(it.count, denom)}%</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
