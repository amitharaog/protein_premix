"use client";

import { useState } from "react";
import { product } from "@/config/product";
import { launch } from "@/content/launch";
import { Mug, Sachet } from "./stage";

// The reveal on the survey's last screen (founder decision, 11 Nov 2026). It lives here, with the launch page, because
// it shows the product: the survey's own files never name it (src/content/content.test.ts). It only renders after the
// answers are stamped, so the questions stay blind. A sealed dossier: break the wax seal, the product slides out.

const c = launch.reveal;
// Rustic palette, the same tones as the launch page and the deck: kraft, walnut, caramel.
const KRAFT = "#EEE3D1";
const WALNUT = "#2E2017";
const CARAMEL = "#A55E31";

export function Reveal({ seeHref }: { seeHref: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    // Compact on purpose: it sits at the top of the survey's last screen, one row high, seal on the left.
    return (
      <section aria-label={c.sealedTitle} className="relative flex items-center gap-4 overflow-hidden rounded-[14px] p-4"
        style={{ background: KRAFT, color: WALNUT, border: `2px dashed ${CARAMEL}` }}>
        <button type="button" onClick={() => setOpen(true)} aria-expanded={false}
          className="reveal-seal grid size-[84px] shrink-0 place-items-center rounded-full text-[10px] font-bold uppercase leading-tight tracking-wider text-[#F3E9DA] shadow-[0_5px_0_#5e1a12] active:translate-y-1 active:shadow-[0_2px_0_#5e1a12]"
          style={{ background: "radial-gradient(circle at 35% 30%, #c2493a, #8e2a1f 70%)" }}>
          <span className="px-2">{c.open}</span>
        </button>
        <div className="min-w-0 text-left">
          <span className="inline-block -rotate-2 rounded-[3px] border-2 px-1.5 text-[10px] font-bold uppercase tracking-[0.25em]"
            style={{ borderColor: "#9c2f22", color: "#9c2f22" }}>{c.sealed}</span>
          <h2 className="mt-1 font-royal text-lg font-bold leading-tight">{c.sealedTitle}</h2>
          <p className="mt-0.5 text-[13px] leading-snug" style={{ color: "#5C4535" }}>{c.sealedBody}</p>
        </div>
      </section>
    );
  }

  return (
    <section aria-label={`${c.kicker}: ${product.name}`} className="anim-pop overflow-hidden rounded-[14px]" style={{ background: WALNUT, color: "#F3E9DA" }}>
      {/* The same drawn sachet and finished mug as the launch page (no photos), side by side on kraft. */}
      <div className="mx-auto grid max-w-[300px] grid-cols-2 items-center gap-2 px-4 pt-3" style={{ background: KRAFT }} aria-hidden>
        <div className="mx-auto w-[72%] -rotate-6 pb-3"><Sachet brand={product.name} id="rv" /></div>
        <div className="relative aspect-square overflow-hidden">
          <div className="absolute" style={{ width: "270%", aspectRatio: "1024 / 683", left: "-95%", top: "-36%" }}>
            <Mug id="rv-mug" top="baked" />
          </div>
        </div>
      </div>
      <div className="px-5 pb-5 pt-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: "#D9A06B" }}>{c.kicker}</p>
        <h2 className="mt-1 font-royal text-[30px] font-black leading-none">
          {c.lead} <span style={{ color: "#D9A06B" }}>{product.name}</span>
        </h2>
        <p className="mt-2 text-[15px] leading-snug" style={{ color: "#E4D3BC" }}>{c.body}</p>
        <ol className="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-2 text-[13px] font-semibold">
          {c.steps.map((s, i) => (
            <li key={s} className="flex items-center gap-1.5">
              <span className="rounded-full px-2.5 py-1" style={{ background: i === c.steps.length - 1 ? "#D9A06B" : "#4A3527", color: i === c.steps.length - 1 ? WALNUT : "#F3E9DA" }}>{s}</span>
              {i < c.steps.length - 1 && <span aria-hidden style={{ color: "#D9A06B" }}>›</span>}
            </li>
          ))}
        </ol>
        <a href={seeHref} className="mt-4 flex h-11 items-center justify-center rounded-full text-sm font-bold uppercase tracking-wide"
          style={{ background: "#D9A06B", color: WALNUT }}>
          {c.see} →
        </a>
      </div>
    </section>
  );
}
