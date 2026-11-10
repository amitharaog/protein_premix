"use client";

import { useEffect, useRef, useState } from "react";
import type { launch as LaunchCopy } from "@/content/launch";
import { STILLS, storyAt, storyVars, T_END } from "@/lib/launch/timeline";
import { Inside } from "./inside";
import { Stage } from "./stage";
import { WaitlistForm } from "./waitlist-form";

// The launch page: a tall section whose sticky stage plays the story as you scroll (sachet, mug, microwave, voilà),
// then the waitlist. Native scrolling throughout; the scroll position only picks the moment of the story.

type Copy = typeof LaunchCopy;
const SCROLL_SPEED = 1.08; // the story finishes a little before the section ends, so the last scene holds

// One word per line, like a poster; the spaces between them keep "Tear it open" readable for screen readers.
const words = (s: string) => s.split(" ").flatMap((w, i) => [i ? " " : null, <span key={i} className="block">{w}</span>]);
const slideState = (i: number, step: number) => (i === step ? "active" : i < step ? "after" : "before");

export function LaunchStory({ copy, brand, live, year }: {
  copy: Copy; brand: string; live: boolean; year: number;
}) {
  const storyRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let last = -1;
    const update = () => {
      raf = 0;
      const story = storyRef.current;
      const stage = stageRef.current;
      if (!story || !stage) return;
      const range = story.offsetHeight - window.innerHeight;
      const p = range > 0 ? Math.min(1, Math.max(0, -story.getBoundingClientRect().top / range)) : 0;
      let t = Math.min(T_END, p * T_END * SCROLL_SPEED);
      if (reduce.matches) t = STILLS[Math.min(3, Math.round((t * 3) / T_END))];
      if (Math.abs(t - last) < 0.0005) return;
      last = t;
      const s = storyAt(t);
      for (const [k, v] of Object.entries(storyVars(s))) stage.style.setProperty(k, v);
      stage.dataset.idle = s.idle ? "1" : "0";
      stage.dataset.pour = s.pour > 0 ? "1" : "0";
      stage.dataset.steam = s.steam > 0 ? "1" : "0";
      stage.dataset.sparkle = s.sparkle > 0 ? "1" : "0";
      if (hintRef.current) hintRef.current.style.opacity = String(s.hint);
      story.dataset.t = t.toFixed(2);
      setStep(s.step);
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduce.addEventListener("change", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduce.removeEventListener("change", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="relative">
      <header className="fixed inset-x-0 top-0 z-30 bg-[#eee3d1e6] backdrop-blur-sm">
        <nav aria-label="Main" className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          <a href="#top" className="lp-wordmark" aria-label={brand}>{brand}</a>
          {!live && (
            <span title="Only you can open this page until you approve it" className="rounded-full border border-[var(--l-ink)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
              Preview<span className="hidden md:inline"> · not public yet</span>
            </span>
          )}
          <div className="flex items-center gap-6">
            <a href="#how" className="hidden text-sm font-medium underline-offset-4 hover:underline md:inline">{copy.nav.how}</a>
            <a href="#inside" className="hidden text-sm font-medium underline-offset-4 hover:underline md:inline">{copy.nav.inside}</a>
            <a href="#waitlist" className="hidden text-sm font-medium underline-offset-4 hover:underline md:inline">{copy.nav.waitlist}</a>
            <a href="#waitlist" className="lp-pill">{copy.nav.cta}</a>
          </div>
        </nav>
      </header>

      <main>
        <section id="top" ref={storyRef} aria-label={copy.nav.how} data-step={step} className="relative h-[500svh]">
          <div id="how" className="absolute inset-x-0 top-[27%]" aria-hidden="true" />
          <div className="sticky top-0 h-svh overflow-hidden">
            <div className="mx-auto flex h-full max-w-7xl flex-col px-4 pb-5 pt-[4.5rem] md:px-8 lg:grid lg:grid-cols-[1fr_1.25fr_0.9fr] lg:items-center lg:gap-6 lg:pb-12 lg:pt-20">
              <div className="grid shrink-0">
                {copy.steps.map((s, i) => (
                  <div key={s.n} className="lp-slide" data-state={slideState(i, step)} inert={i !== step}>
                    {i === 0
                      ? <h1 className="lp-headline">{words(s.headline)}</h1>
                      : <h2 className="lp-headline">{words(s.headline)}</h2>}
                    {i === 0 && (
                      <a href="#how" className="mt-8 hidden items-center gap-2 border-b border-current pb-1 text-sm font-semibold lg:inline-flex">
                        {copy.howLink} <span aria-hidden="true">↓</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>

              <div className="relative min-h-0 flex-1 py-2 lg:h-[80svh] lg:py-0">
                <Stage stageRef={stageRef} brand={brand} />
                <p ref={hintRef} aria-hidden="true"
                  className="lp-hint pointer-events-none absolute inset-x-0 bottom-0 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--l-muted)]">
                  {copy.scrollHint} ↓
                </p>
              </div>

              <div className="grid shrink-0">
                {copy.steps.map((s, i) => (
                  <div key={s.n} className="lp-slide" data-state={slideState(i, step)} inert={i !== step}>
                    <p className="flex items-baseline gap-3 lg:block">
                      <span className="lp-serif text-[34px] font-extrabold leading-none lg:text-6xl">{s.n}</span>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--l-muted)] lg:mt-4 lg:block">{s.kicker}</span>
                    </p>
                    <p className="lp-serif mt-1.5 text-[22px] font-bold leading-tight lg:mt-2 lg:text-[28px]">{s.title}</p>
                    <p className="lp-body mt-1.5 max-w-sm text-[15px] leading-relaxed text-[var(--l-muted)]">{s.body}</p>
                    {s.cta && <a href="#waitlist" className="lp-pill mt-4">{copy.nav.cta}</a>}
                  </div>
                ))}
              </div>
            </div>

            <ol aria-hidden="true" className="absolute right-4 top-1/2 hidden -translate-y-1/2 flex-col gap-2.5 md:flex">
              {copy.steps.map((s, i) => (
                <li key={s.n} className={`h-2 w-2 rounded-full transition-colors ${i === step ? "bg-[var(--l-ink)]" : "bg-[var(--l-line)]"}`} />
              ))}
            </ol>
          </div>
        </section>

        <Inside copy={copy.inside} brand={brand} />

        <section id="waitlist" aria-labelledby="waitlist-h" className="relative overflow-hidden bg-[var(--l-paper)] px-4 py-20 md:px-8 md:py-28">
          <div aria-hidden="true" className="lp-swirl-bg absolute inset-0" />
          <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--l-muted)]">{copy.waitlist.kicker}</p>
              <h2 id="waitlist-h" className="lp-headline mt-3">{words(copy.waitlist.headline)}</h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-[var(--l-muted)]">{copy.waitlist.body}</p>
            </div>
            <WaitlistForm copy={copy.waitlist} live={live} />
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--l-line)] px-4 py-8 text-sm text-[var(--l-muted)] md:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2">
          <span>© {year} {brand}</span>
          <span>{copy.footer}</span>
        </div>
      </footer>

    </div>
  );
}
