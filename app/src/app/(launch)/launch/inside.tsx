import { product } from "@/config/product";
import type { launch as LaunchCopy } from "@/content/launch";
import { Sachet } from "./stage";

// "What's inside": the kraft pack and, in the owner preview only, a nutrition table per serve (the public page hides it,
// founder, 10 Nov 2026). Values come only from product.nutrition, which
// stays null until a lab report on the final recipe exists (CLAUDE.md rule 5); until then each row shows a dash.

const fmt = (v: number | null, unit: string) => (v == null ? "—" : `${v} ${unit}`);

export function Inside({ copy, brand, live }: { copy: typeof LaunchCopy.inside; brand: string; live: boolean }) {
  const n = product.nutrition;
  return (
    <section id="inside" aria-labelledby="inside-h" className="relative overflow-hidden px-4 py-20 md:px-8 md:py-28">
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="mx-auto w-[min(62vw,280px)] rotate-[-4deg] drop-shadow-[0_24px_30px_rgba(60,38,20,0.28)] lg:w-[320px]">
          <div className="aspect-[180/248]"><Sachet brand={brand} id="pack" /></div>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--l-muted)]">{copy.kicker}</p>
          <h2 id="inside-h" className="lp-headline lp-headline-sm mt-3 max-w-xl">{copy.headline}</h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-[var(--l-muted)]">{live ? copy.bodyLive : copy.body}</p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {copy.tags.map((t) => <li key={t} className="lp-tag">{t}</li>)}
          </ul>
          {!live && <div className="lp-kraft mt-8 max-w-md rounded-2xl p-5 shadow-[0_10px_30px_rgba(60,38,20,0.18)]">
            <table className="lp-nutri w-full text-left text-[15px]">
              <caption className="pb-2 text-left">
                <span className="lp-serif block text-xl font-bold">{copy.table}</span>
                <span className="text-[12px] font-medium uppercase tracking-[0.14em] opacity-80">{n.basis}</span>
              </caption>
              <tbody>
                {n.rows.map((r) => (
                  <tr key={r.key}>
                    <th scope="row" className={r.label.startsWith("of ") ? "pl-4 font-normal" : r.highlight ? "font-bold" : "font-medium"}>{r.label}</th>
                    <td className={`text-right tabular-nums ${r.highlight ? "font-bold" : ""}`}>{fmt(r.value, r.unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!n.labTested && <p className="mt-3 text-[13px] leading-snug opacity-85">{copy.pending}</p>}
          </div>}
        </div>
      </div>
    </section>
  );
}
