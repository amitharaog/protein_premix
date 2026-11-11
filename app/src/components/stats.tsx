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

/** Step-by-step funnel: each bar is a share of the first step, with the drop between steps written out. */
export function FunnelCard({ title, note, steps }: { title: string; note: string; steps: { label: string; count: number; sub?: string }[] }) {
  const top = steps[0]?.count ?? 0;
  return (
    <figure className="rounded-[14px] border border-line bg-panel p-4">
      <figcaption>
        <h3 className="font-head text-base font-semibold text-frost">{title}</h3>
        <p className="text-xs text-muted">{note}</p>
      </figcaption>
      <ol className="mt-3 space-y-2">
        {steps.map((s, i) => {
          const w = pct(s.count, top);
          const prev = i ? steps[i - 1].count : 0;
          return (
            <li key={s.label}>
              {i > 0 && <p className="tabular pl-1 text-[11px] text-muted">↓ {pct(s.count, prev)}% of the step above</p>}
              <div className="relative h-10 overflow-hidden rounded-[8px] bg-line/40">
                <div className="absolute inset-y-0 left-0 rounded-[8px]" style={{ width: `${Math.max(w, s.count ? 3 : 0)}%`, background: BAR, opacity: 1 - i * 0.14 }} />
                <div className="relative flex h-full items-center justify-between gap-2 px-3 text-sm">
                  <span className="font-medium text-frost">{s.label}{s.sub && <span className="ml-1.5 text-xs font-normal text-muted">{s.sub}</span>}</span>
                  <span className="tabular font-semibold text-frost">{s.count}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs text-muted">Table view</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-xs text-muted"><tr><th className="py-1">Step</th><th className="py-1 text-right">People</th><th className="py-1 text-right">% of first</th></tr></thead>
          <tbody>{steps.map((s) => <tr key={s.label} className="border-t border-line"><td className="py-1">{s.label}</td><td className="tabular py-1 text-right">{s.count}</td><td className="tabular py-1 text-right">{pct(s.count, top)}%</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}

/** Running total over days, as an area line. points: one per day, oldest first, already cumulative. */
export function GrowthCard({ title, note, points, fmt }: { title: string; note: string; points: { day: string; total: number; added: number }[]; fmt: (d: string) => string }) {
  const W = 600, H = 160, P = 6;
  const max = Math.max(1, ...points.map((p) => p.total));
  const x = (i: number) => (points.length < 2 ? W / 2 : P + (i * (W - 2 * P)) / (points.length - 1));
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.total).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  return (
    <figure className="rounded-[14px] border border-line bg-panel p-4">
      <figcaption className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-head text-base font-semibold text-frost">{title}</h3>
          <p className="text-xs text-muted">{note}</p>
        </div>
        {last && <p className="tabular font-display text-3xl text-frost">{last.total}</p>}
      </figcaption>
      {points.length === 0 ? <p className="mt-3 text-sm text-muted">Nobody yet.</p> : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-36 w-full" preserveAspectRatio="none" role="img"
            aria-label={`${title}: ${last.total} by ${last.day}`}>
            <path d={`${line} L${x(points.length - 1).toFixed(1)},${H - P} L${x(0).toFixed(1)},${H - P} Z`} fill={BAR} opacity={0.18} />
            <path d={line} fill="none" stroke={BAR} strokeWidth={3} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            {points.map((p, i) => p.added > 0 && (
              <circle key={p.day} cx={x(i)} cy={y(p.total)} r={4} fill={BAR} vectorEffect="non-scaling-stroke"><title>{`${fmt(p.day)}: +${p.added}, ${p.total} in all`}</title></circle>
            ))}
          </svg>
          <p className="tabular mt-1 flex justify-between text-xs text-muted"><span>{fmt(points[0].day)}</span><span>{fmt(last.day)}</span></p>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-xs text-muted">Table view</summary>
            <table className="mt-2 w-full text-left">
              <thead className="text-xs text-muted"><tr><th className="py-1">Day</th><th className="py-1 text-right">Added</th><th className="py-1 text-right">Total</th></tr></thead>
              <tbody>{points.filter((p) => p.added).map((p) => <tr key={p.day} className="border-t border-line"><td className="tabular py-1">{p.day}</td><td className="tabular py-1 text-right">{p.added}</td><td className="tabular py-1 text-right">{p.total}</td></tr>)}</tbody>
            </table>
          </details>
        </>
      )}
    </figure>
  );
}
