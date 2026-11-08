"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  contactStep, done as doneCopy, fallbackCopy, freeTextPlaceholders, intro, questionCopy, scaleLabels, ui,
  type Personality, type QuestionCopy,
} from "@/content/survey";
import type { SavedContact } from "@/lib/queries/survey";
import type { Answers, SurveyQuestion } from "@/lib/survey/validate";
import { forgetContact, joinWaitlist, submitSurvey } from "./actions";
import { CheckerStrip, Crown, Minister, Ornaments, Seal, TileTray, Wordmark } from "./art";

type Props = { questions: SurveyQuestion[]; initial: Answers | null; initialContact: SavedContact | null; startToken: string; siteUrl: string };
type ContactDraft = { name: string; email: string; phone: string; whatsappOptin: boolean };

const AUTO_ADVANCE_MS = 750;
const REACTION_EXTRA_MS = 900; // time to read the Minister's reaction before the next question
const SCALE: string[] = ["1", "2", "3", "4", "5"];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"];
const ARROWS: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
const isEmpty = (v: unknown) => v == null || v === "" || (Array.isArray(v) && v.length === 0);

export function SurveyClient({ questions, initial, initialContact, startToken, siteUrl }: Props) {
  const [step, setStep] = useState(-1); // -1 intro, 0..n-1 questions, n name and contact, n+1 done
  const [answers, setAnswers] = useState<Answers>(initial ?? {});
  const [contact, setContact] = useState<ContactDraft>({
    name: initialContact?.name ?? "", email: initialContact?.email ?? "",
    phone: initialContact?.phone?.replace(/^\+91/, "") ?? "", whatsappOptin: initialContact?.whatsappOptin ?? false,
  });
  const [consent, setConsent] = useState(false); // ticked afresh on every submit, never pre-ticked
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [hostLine, setHostLine] = useState<string | null>(null);
  const [bump, setBump] = useState(0); // re-triggers the mascot wobble
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<{ personality: Personality; shareRef: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [utm, setUtm] = useState<Record<string, string>>({});
  const honeypot = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const n = questions.length;
  const q = step >= 0 && step < n ? questions[step] : null;
  const copy = q ? (questionCopy[q.id] ?? fallbackCopy) : undefined;
  const answeredCount = questions.filter((x) => !isEmpty(answers[x.id])).length;
  const contactDone = Boolean(contact.name.trim() && (contact.phone.trim() || contact.email.trim()) && consent);
  // Editing a field clears its error message, so fixed fields stop looking wrong.
  const clearErrors = (...keys: string[]) =>
    setContactErrors((e) => (keys.some((k) => k in e) ? Object.fromEntries(Object.entries(e).filter(([k]) => !keys.includes(k))) : e));
  const editContact = (v: ContactDraft) => {
    if (v.name !== contact.name) clearErrors("name");
    if (v.phone !== contact.phone || v.email !== contact.email) clearErrors("phone", "email");
    setContact(v);
  };
  const editConsent = (v: boolean) => {
    if (v) clearErrors("consent");
    setConsent(v);
  };

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setUtm(Object.fromEntries([...p].filter(([k]) => k.startsWith("utm_") || k === "ref")));
  }, []);

  useEffect(() => {
    setHostLine(null);
    setNotice(null);
    if (timer.current) clearTimeout(timer.current);
    headingRef.current?.focus();
  }, [step]);

  const react = useCallback((line: string | undefined) => {
    if (line) setHostLine(line);
    setBump((b) => b + 1);
  }, []);

  const submit = useCallback(() => {
    // Quick check on this side; the server checks everything again (src/lib/survey/contact.ts).
    const quick: Record<string, string> = {};
    if (!contact.name.trim()) quick.name = contactStep.errors.name;
    if (!contact.phone.trim() && !contact.email.trim()) quick.phone = contactStep.errors.contact;
    if (!consent) quick.consent = contactStep.errors.consent;
    setContactErrors(quick);
    if (Object.keys(quick).length) {
      setBump((b) => b + 1);
      return;
    }
    startTransition(async () => {
      const res = await submitSurvey({ answers, contact: { ...contact, consent }, startToken, website: honeypot.current?.value ?? "", utm });
      if (res.ok) {
        setResult({ personality: res.personality, shareRef: res.shareRef });
        setStep(n + 1);
        return;
      }
      if (res.reason === "invalid" && res.errors) {
        const first = questions.findIndex((x) => res.errors?.[x.id]);
        if (first >= 0) {
          setStep(first);
          setTimeout(() => setNotice(ui.required), 0);
          return;
        }
        setContactErrors(res.errors);
        setBump((b) => b + 1);
        return;
      }
      setNotice(res.reason === "too_fast" ? ui.tooFast : res.reason === "rate_limited" ? ui.rateLimited : ui.error);
    });
  }, [answers, consent, contact, n, questions, startToken, utm]);

  const goNext = useCallback((current: Answers = answers) => {
    if (!q) return;
    if (q.required && isEmpty(current[q.id])) {
      setNotice(ui.required);
      setBump((b) => b + 1);
      return;
    }
    setStep(step + 1); // after the last question comes the name and contact step
  }, [answers, q, step]);

  const choose = useCallback((option: string) => {
    if (!q || !copy) return;
    setNotice(null);
    if (q.type === "multi") {
      const cur = (answers[q.id] as string[] | undefined) ?? [];
      const max = q.maxSelect ?? q.options.length;
      if (cur.includes(option)) {
        setAnswers({ ...answers, [q.id]: cur.filter((o) => o !== option) });
        return;
      }
      if (cur.length >= max) {
        setNotice(ui.maxReached(max));
        setBump((b) => b + 1);
        return;
      }
      setAnswers({ ...answers, [q.id]: [...cur, option] });
      react(copy.reactions?.[option]);
      return;
    }
    const next = { ...answers, [q.id]: option };
    setAnswers(next);
    react(copy.reactions?.[option]);
    if (copy.style === "slider") return; // people slide through the stops, so they press Next themselves
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => goNext(next), copy.reactions?.[option] ? AUTO_ADVANCE_MS + REACTION_EXTRA_MS : AUTO_ADVANCE_MS);
  }, [answers, copy, goNext, q, react]);

  // Keyboard: number keys pick options, Enter goes next (not while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q) return;
      const t = e.target as HTMLElement;
      if (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && !["radio", "checkbox"].includes((t as HTMLInputElement).type))) return;
      const opts = q.type === "scale_1_5" ? SCALE : q.options;
      const i = Number(e.key) - 1;
      if (e.key.length === 1 && i >= 0 && i < opts.length && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        choose(opts[i]);
      } else if (e.key === "Enter") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, goNext, q]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-3 py-3 sm:py-6">
      <div className="royal-label relative flex flex-1 flex-col overflow-hidden">
      <div className="checker h-5 shrink-0" aria-hidden />
      <div className="flex flex-1 flex-col px-5 pb-6 pt-4">
      <input ref={honeypot} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />

      {step >= 0 && (
        <header className="flex items-center gap-3">
          <Wordmark height={26} compact className="shrink-0" />
          <div className="min-w-0 flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={n} aria-valuenow={answeredCount} aria-label="Answered">
            <TileTray total={n + 1} answered={[...questions.map((x) => !isEmpty(answers[x.id])), contactDone]} current={step <= n ? step : -1} />
          </div>
          <p className="tabular shrink-0 font-caps text-xs font-bold text-muted">{`${Math.min(step + 1, n + 1)}/${n + 1}`}</p>
        </header>
      )}

      {step === -1 && <Intro count={n} welcomeBack={Boolean(initial)} onStart={() => setStep(0)} />}

      {q && copy && (
        <section key={q.id} className="anim-pop mt-5 flex flex-1 flex-col" aria-labelledby={`h-${q.id}`}>
          <Host text={hostLine ?? copy.host} bump={bump} />
          <p className="mt-5 font-caps text-[11px] font-bold tracking-[0.3em] text-muted" aria-hidden>No. {ROMAN[step] ?? step + 1}</p>
          <h1
            id={`h-${q.id}`}
            ref={headingRef}
            tabIndex={-1}
            className={`mt-1 font-royal leading-tight font-bold text-fg outline-none ${q.question.length > 90 ? "text-[22px]" : "text-[26px]"}`}
          >
            {q.question}
          </h1>
          {q.hint && <p className="mt-1 text-sm text-muted">{q.hint}{q.required || /optional/i.test(q.hint) ? "" : " · optional"}</p>}

          <div className="mt-4 flex-1">
            {q.type === "single" && copy.style === "slider" ? (
              <Slider q={q} value={answers[q.id] as string | undefined} onPick={choose} copy={copy} />
            ) : (q.type === "single" || q.type === "multi") ? (
              <ChoiceList q={q} value={answers[q.id]} onPick={choose} emoji={copy.emoji} cards={copy.style === "cards"} />
            ) : null}
            {q.type === "scale_1_5" && <Scale q={q} value={answers[q.id] as string | undefined} onPick={choose} emoji={copy.emoji} />}
            {q.type === "free_text" && (
              <FreeText q={q} value={(answers[q.id] as string | undefined) ?? ""} onChange={(v) => setAnswers({ ...answers, [q.id]: v })} />
            )}
          </div>

          <p aria-live="polite" className="min-h-6 pt-2 text-center text-sm font-medium text-bad">{notice}</p>

          <nav className="mt-2 flex items-center gap-3">
            <button type="button" onClick={() => setStep(step - 1)} className="h-12 rounded-full px-3 text-sm font-semibold text-muted hover:text-fg">
              ← {ui.back}
            </button>
            <div className="flex-1" />
            {!q.required && isEmpty(answers[q.id]) && (
              <button type="button" onClick={() => setStep(step + 1)} className="h-12 rounded-full px-3 text-sm font-semibold text-muted hover:text-fg">
                {ui.skip}
              </button>
            )}
            <button
              type="button"
              onClick={() => goNext()}
              disabled={pending}
              className="royal-btn h-12 min-w-32 px-6 text-sm uppercase disabled:opacity-60"
            >
              {`${ui.next} →`}
            </button>
          </nav>
        </section>
      )}

      {step === n && (
        <section key="contact" className="anim-pop mt-5 flex flex-1 flex-col" aria-labelledby="h-contact">
          <Host text={hostLine ?? contactStep.host} bump={bump} />
          <p className="mt-5 font-caps text-[11px] font-bold tracking-[0.3em] text-muted" aria-hidden>{contactStep.label}</p>
          <h1 id="h-contact" ref={headingRef} tabIndex={-1} className="mt-1 font-royal text-[26px] leading-tight font-bold text-fg outline-none">
            {contactStep.title}
          </h1>
          <p className="mt-1 text-sm text-muted">{contactStep.hint}</p>
          <form
            className="mt-4 flex flex-1 flex-col"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <ContactFields value={contact} onChange={editContact} consent={consent} onConsent={editConsent} errors={contactErrors} />
            <p aria-live="polite" className="min-h-6 pt-2 text-center text-sm font-medium text-bad">{notice}</p>
            <nav className="mt-2 flex items-center gap-3">
              <button type="button" onClick={() => setStep(n - 1)} className="h-12 rounded-full px-3 text-sm font-semibold text-muted hover:text-fg">
                ← {ui.back}
              </button>
              <div className="flex-1" />
              <button type="submit" disabled={pending} className="royal-btn h-12 min-w-32 px-6 text-sm uppercase disabled:opacity-60">
                {pending ? ui.submitting : ui.submit}
              </button>
            </nav>
          </form>
        </section>
      )}

      {step > n && result && (
        <Done
          personality={result.personality}
          shareUrl={`${siteUrl}/survey?utm_source=share&utm_medium=whatsapp&ref=${result.shareRef}`}
          utm={utm}
          prefill={{ email: contact.email, phone: contact.phone }}
          onEdit={() => setStep(0)}
        />
      )}
      </div>
      <div className="checker h-5 shrink-0" aria-hidden />
      </div>
    </main>
  );
}

function Intro({ count, welcomeBack, onStart }: { count: number; welcomeBack: boolean; onStart: () => void }) {
  return (
    <section className="anim-pop flex flex-1 flex-col">
      <p className="whitespace-nowrap text-center font-caps text-[11px] font-bold uppercase tracking-[0.14em] text-muted">✦ {intro.kicker(count)} ✦</p>
      <div className="mt-3 flex flex-col items-center">
        <Wordmark height={132} crown className="max-w-full" />
        <p className="ribbon -mt-1 font-caps text-xs font-bold uppercase tracking-[0.16em]">{intro.ribbon}</p>
        <p className="mt-1.5 font-caps text-[10px] font-semibold uppercase tracking-[0.4em] text-muted">{intro.est}</p>
      </div>
      <div className="relative mx-auto mt-2 aspect-[36/26] w-full">
        <Ornaments className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="medallion grid size-[200px] place-items-center rounded-full">
            <Minister size={156} className="anim-bob" />
          </div>
        </div>
        <Seal lines={intro.badges[0]} rotate={-8} className="absolute -left-2 bottom-0 w-[96px]" />
        <Seal lines={intro.badges[1]} rotate={8} className="absolute -right-2 top-0 w-[96px]" />
      </div>
      <p className="speech mx-auto mt-4 max-w-xs rounded-[12px] border-2 border-line bg-panel px-4 py-2.5 text-center text-[15px] leading-snug text-fg shadow-[3px_3px_0_var(--gold)]">
        {intro.host}
      </p>
      <h1 className="mt-5 text-center font-royal text-[36px] leading-none font-black italic text-fg">{intro.headline}</h1>
      <p className="mt-2 text-center font-medium text-muted">{intro.sub}</p>
      <Agenda />
      <p className="mt-4 text-center text-sm font-medium text-fg">📇 {intro.contactNote}</p>
      {welcomeBack && <p className="royal-frame mt-3 rounded-[10px] bg-gold-soft p-3.5 text-sm">{ui.welcomeBack}</p>}
      <div className="flex-1" />
      <button type="button" onClick={onStart} className="royal-btn mt-6 h-14 w-full text-base uppercase">
        {intro.cta} →
      </button>
      <p className="mt-4 text-[11px] leading-relaxed text-muted">{intro.purpose}</p>
    </section>
  );
}

function Agenda() {
  return (
    <section aria-label={intro.agendaTitle} className="mt-6">
      <h2 className="rule-ornament font-caps text-xs font-bold uppercase tracking-[0.3em] text-fg">{intro.agendaTitle}</h2>
      <ol className="mt-3 grid grid-cols-3 gap-2">
        {intro.agenda.map((s, i) => (
          <li key={s} className="royal-frame flex flex-col items-center gap-2 rounded-[10px] bg-panel px-2 py-3 text-center">
            <span className="grid size-8 place-items-center rounded-full bg-accent font-caps text-[13px] font-bold text-accent-fg ring-2 ring-gold ring-offset-2 ring-offset-panel">
              {ROMAN[i]}
            </span>
            <span className="text-[12.5px] font-semibold leading-tight text-fg">{s}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Host({ text, bump }: { text: string; bump: number }) {
  return (
    <div className="flex items-end gap-2" aria-live="polite">
      <span key={bump} className={`shrink-0 ${bump ? "anim-wobble" : ""}`}>
        <Minister size={60} />
      </span>
      <p key={text} className="anim-pop relative mb-2 rounded-[12px] rounded-bl-sm border-2 border-line bg-panel shadow-[3px_3px_0_var(--gold)] px-4 py-2.5 text-[15px] leading-snug text-fg">
        {text}
      </p>
    </div>
  );
}

function ChoiceList({ q, value, onPick, emoji, cards = false }: {
  q: SurveyQuestion; value: string | string[] | undefined; onPick: (o: string) => void; emoji: Record<string, string>; cards?: boolean;
}) {
  const multi = q.type === "multi";
  const selected = new Set(Array.isArray(value) ? value : value ? [value] : []);
  const full = multi && q.maxSelect != null && selected.size >= q.maxSelect;
  return (
    <fieldset>
      <legend className="sr-only">{q.question}</legend>
      <div className={`flex flex-col ${cards ? "gap-2.5" : "gap-2"}`}>
        {q.options.map((o, i) => {
          const on = selected.has(o);
          const icon = emoji[o];
          return (
            <label
              key={o}
              className={[
                "relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-[10px] border-2 border-line px-4 py-3 transition duration-150 ease-out active:scale-[0.98]",
                cards ? "min-h-[68px]" : "min-h-14",
                on ? "bg-accent-soft pt-5 shadow-[3px_3px_0_var(--line)]" : "bg-panel shadow-[3px_3px_0_var(--gold)] hover:bg-gold-soft/40",
                cards && on ? "-rotate-1" : "",
                full && !on ? "opacity-50" : "",
              ].join(" ")}
            >
              <input type={multi ? "checkbox" : "radio"} name={q.id} value={o} checked={on} onChange={() => onPick(o)} className="peer sr-only" />
              {on && <CheckerStrip />}
              {cards ? (
                <span aria-hidden className={`grid size-12 shrink-0 place-items-center rounded-full border-2 border-line bg-panel text-[26px] leading-none transition-transform duration-150 ${on ? "scale-110" : ""}`}>
                  {icon}
                </span>
              ) : (
                <span
                  aria-hidden
                  className={`grid size-6 shrink-0 place-items-center border-2 text-xs font-bold transition ${multi ? "rounded-md" : "rounded-full"} ${on ? "border-accent bg-accent text-accent-fg" : "border-line"}`}
                >
                  {on ? "✓" : ""}
                </span>
              )}
              {!cards && icon && <span aria-hidden className="text-xl leading-none">{icon}</span>}
              <span className={`flex-1 leading-tight ${cards ? "text-base font-semibold" : "text-[15px] font-medium"}`}>{o}</span>
              {cards && on ? (
                <span aria-hidden className="stamp stamp-sm anim-stamp shrink-0">Noted</span>
              ) : (
                <kbd className="hidden text-xs text-muted sm:inline">{i + 1}</kbd>
              )}
              <span className="pointer-events-none absolute inset-0 rounded-[10px] peer-focus-visible:outline-3 peer-focus-visible:outline-kesar" />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** A single choice laid out as a track: drag the spoon along it, tap a stop, or use the arrow keys. */
function Slider({ q, value, onPick, copy }: { q: SurveyQuestion; value: string | undefined; onPick: (o: string) => void; copy: QuestionCopy }) {
  const track = useRef<HTMLDivElement>(null);
  const count = q.options.length;
  const idx = value ? q.options.indexOf(value) : -1;
  const shown = idx >= 0 ? q.options[idx] : null;
  const at = (i: number) => `${((i + 0.5) * 100) / count}%`; // stop i sits in the middle of column i
  const pick = (i: number) => {
    const o = q.options[Math.min(count - 1, Math.max(0, i))];
    if (o !== value) onPick(o);
  };
  const pickAt = (clientX: number) => {
    const r = track.current?.getBoundingClientRect();
    if (r && r.width > 0) pick(Math.floor(((clientX - r.left) / r.width) * count));
  };
  return (
    <div className="royal-frame rounded-[14px] bg-panel px-3 pb-3 pt-5 text-center shadow-[3px_3px_0_var(--gold)]">
      <div key={shown ?? "none"} className="anim-pop" aria-hidden>
        <p className="text-[56px] leading-none">{shown ? (copy.emoji[shown] ?? "🥄") : "🥄"}</p>
        <p className="mt-2 flex min-h-12 items-center justify-center px-2 font-royal text-xl font-bold leading-tight text-fg">{shown ?? ui.sliderPrompt}</p>
      </div>
      <div
        ref={track}
        role="slider"
        tabIndex={0}
        aria-label={q.question}
        aria-valuemin={1}
        aria-valuemax={count}
        aria-valuenow={idx >= 0 ? idx + 1 : undefined}
        aria-valuetext={shown ?? ui.sliderPrompt}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          pickAt(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) pickAt(e.clientX);
        }}
        onKeyDown={(e) => {
          const move = ARROWS[e.key];
          if (move) {
            e.preventDefault();
            pick(idx < 0 ? 0 : idx + move);
          } else if (e.key === "Home" || e.key === "End") {
            e.preventDefault();
            pick(e.key === "Home" ? 0 : count - 1);
          }
        }}
        className="relative mt-3 h-14 cursor-pointer touch-none select-none rounded-full focus-visible:outline-3 focus-visible:outline-kesar"
      >
        <span aria-hidden className="absolute top-1/2 h-3.5 -translate-y-1/2 rounded-full border-2 border-line bg-gold-soft" style={{ left: at(0), right: at(0) }} />
        <span
          aria-hidden
          className="absolute top-1/2 h-3.5 -translate-y-1/2 rounded-l-full bg-accent transition-[width] duration-150"
          style={{ left: at(0), width: idx > 0 ? `${(idx * 100) / count}%` : 0 }}
        />
        {q.options.map((o, i) => (
          <span key={o} aria-hidden className={`absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-line ${i <= idx ? "bg-gold" : "bg-panel"}`} style={{ left: at(i) }} />
        ))}
        {idx >= 0 && (
          <span
            aria-hidden
            className="absolute top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-line bg-panel text-2xl shadow-[2px_2px_0_var(--gold)] transition-[left] duration-150"
            style={{ left: at(idx) }}
          >
            🥄
          </span>
        )}
      </div>
      <div className="mt-1 grid" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
        {q.options.map((o, i) => (
          <button
            key={o}
            type="button"
            tabIndex={-1}
            aria-label={o}
            onClick={() => pick(i)}
            className={`flex flex-col items-center gap-1 rounded-[8px] px-0.5 py-1.5 transition ${i === idx ? "bg-accent-soft" : "hover:bg-gold-soft/40"}`}
          >
            <span aria-hidden className={`text-xl leading-none transition-transform duration-150 ${i === idx ? "scale-125" : ""}`}>{copy.emoji[o]}</span>
            <span aria-hidden className={`text-[11px] leading-tight ${i === idx ? "font-bold text-fg" : "font-semibold text-muted"}`}>{copy.short?.[o] ?? o}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Scale({ q, value, onPick, emoji }: { q: SurveyQuestion; value: string | undefined; onPick: (o: string) => void; emoji: Record<string, string> }) {
  return (
    <fieldset>
      <legend className="sr-only">{q.question}</legend>
      <div className="grid grid-cols-5 gap-2">
        {SCALE.map((o) => {
          const on = value === o;
          return (
            <label
              key={o}
              className={`relative flex cursor-pointer flex-col items-center gap-1 overflow-hidden rounded-[10px] border-2 border-line pb-3 pt-4 transition duration-150 active:scale-95 ${on ? "bg-accent-soft shadow-[3px_3px_0_var(--line)]" : "bg-panel shadow-[3px_3px_0_var(--gold)]"}`}
            >
              <input type="radio" name={q.id} value={o} checked={on} onChange={() => onPick(o)} className="peer sr-only" />
              {on && <CheckerStrip />}
              <span aria-hidden className={`text-[30px] leading-none transition duration-150 ${on ? "scale-125" : value ? "opacity-50 grayscale" : ""}`}>
                {emoji[o] ?? o}
              </span>
              <span className="tabular font-caps text-sm font-bold">{o}</span>
              <span className="text-center text-[11px] leading-tight text-muted">{scaleLabels[o]}</span>
              <span className="pointer-events-none absolute inset-0 rounded-[10px] peer-focus-visible:outline-3 peer-focus-visible:outline-kesar" />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function FreeText({ q, value, onChange }: { q: SurveyQuestion; value: string; onChange: (v: string) => void }) {
  const max = q.maxLength ?? 1000;
  const [ph, setPh] = useState(freeTextPlaceholders[0]);
  useEffect(() => setPh(freeTextPlaceholders[Math.floor(Math.random() * freeTextPlaceholders.length)]), []);
  return (
    <div>
      <label htmlFor={`t-${q.id}`} className="sr-only">{q.question}</label>
      <textarea
        id={`t-${q.id}`}
        value={value}
        maxLength={max}
        onChange={(e) => onChange(e.target.value)}
        placeholder={ph}
        rows={6}
        className="w-full rounded-[10px] border-2 border-line bg-panel p-4 text-[15px] shadow-[3px_3px_0_var(--gold)] leading-relaxed placeholder:text-muted/70 focus:outline-none focus-visible:outline-3 focus-visible:outline-kesar"
      />
      <p className="tabular mt-1 text-right text-xs text-muted">{ui.charsLeft(max - value.length)}</p>
    </div>
  );
}

function Done({ personality, shareUrl, utm, prefill, onEdit }: {
  personality: Personality; shareUrl: string; utm: Record<string, string>; prefill: { email: string; phone: string }; onEdit: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const shareText = doneCopy.shareText(personality.title, shareUrl);
  return (
    <section className="anim-pop mt-6 flex flex-1 flex-col">
      <div className="royal-frame relative overflow-hidden rounded-[14px] bg-panel px-5 pb-6 pt-7 text-center shadow-[4px_4px_0_var(--gold)]">
        <CheckerStrip className="h-3" />
        <span aria-hidden className="stamp anim-stamp absolute right-4 top-8">{doneCopy.stamp}</span>
        <Crown className="mx-auto h-9 w-auto" />
        <p className="mt-2 font-caps text-[11px] font-bold uppercase tracking-[0.25em] text-muted">{doneCopy.personalityLead}</p>
        <h1 className="mt-2 font-royal text-[30px] leading-tight font-black italic text-fg">{personality.title}</h1>
        <p className="mx-auto mt-2 max-w-xs text-muted">{personality.line}</p>
        <div className="mt-3 flex justify-center"><Minister size={84} /></div>
      </div>

      <p className="mt-6 text-sm text-muted">{doneCopy.shareLead}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="royal-frame flex h-12 items-center justify-center rounded-full bg-panel text-sm font-semibold"
        >
          Share on WhatsApp
        </a>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(shareUrl);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
          className="royal-frame h-12 rounded-full bg-panel text-sm font-semibold"
        >
          {copied ? doneCopy.copied : doneCopy.copy}
        </button>
      </div>

      <WaitlistMini utm={utm} prefill={prefill} />

      <button type="button" onClick={onEdit} className="mx-auto mt-6 h-11 px-4 text-sm font-medium text-muted underline underline-offset-4">
        {doneCopy.edit}
      </button>
      <Forget />
    </section>
  );
}

/** Name and contact for the last step. Labels, autocomplete and inline errors, like the waitlist form. */
function ContactFields({ value, onChange, consent, onConsent, errors }: {
  value: ContactDraft; onChange: (v: ContactDraft) => void; consent: boolean; onConsent: (v: boolean) => void; errors: Record<string, string>;
}) {
  const field = "mt-1 h-12 w-full rounded-[10px] border-2 border-line bg-[#fffaf0] px-3 focus:outline-none focus-visible:outline-3 focus-visible:outline-kesar";
  const err = (k: string) => errors[k] && <p id={`e-${k}`} className="mt-1 text-sm text-bad">{errors[k]}</p>;
  return (
    <div>
      <div className="royal-frame rounded-[14px] bg-panel p-4 shadow-[3px_3px_0_var(--gold)]">
        <label className="block text-sm font-medium" htmlFor="c-name">{contactStep.name}</label>
        <input id="c-name" autoComplete="name" maxLength={80} value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })}
          aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "e-name" : undefined} className={field} />
        {err("name")}
        <label className="mt-3 block text-sm font-medium" htmlFor="c-phone">{contactStep.phone}</label>
        <input id="c-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder={contactStep.phonePlaceholder} value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "e-phone" : undefined} className={field} />
        {err("phone")}
        <label className="mt-3 block text-sm font-medium" htmlFor="c-email">{contactStep.email}</label>
        <input id="c-email" type="email" inputMode="email" autoComplete="email" value={value.email} onChange={(e) => onChange({ ...value, email: e.target.value })}
          aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "e-email" : undefined} className={field} />
        {err("email")}
        <label className="mt-4 flex items-start gap-3 text-sm">
          <input type="checkbox" checked={consent} onChange={(e) => onConsent(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]"
            aria-describedby={errors.consent ? "e-consent" : undefined} />
          <span>{contactStep.consent}</span>
        </label>
        {err("consent")}
        {value.phone.trim() && (
          <label className="mt-2 flex items-start gap-3 text-sm">
            <input type="checkbox" checked={value.whatsappOptin} onChange={(e) => onChange({ ...value, whatsappOptin: e.target.checked })}
              className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]" />
            <span>{contactStep.whatsapp}</span>
          </label>
        )}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted">{contactStep.honest}</p>
    </div>
  );
}

/** Lets the person delete their name and contact again (consent can be withdrawn any time); the answers stay. */
function Forget() {
  const [state, setState] = useState<"idle" | "confirm" | "done" | "error">("idle");
  const [pending, startTransition] = useTransition();
  if (state === "done") return <p className="mt-2 text-center text-sm text-muted" role="status">{doneCopy.forgotten}</p>;
  if (state === "idle") {
    return (
      <button type="button" onClick={() => setState("confirm")} className="mx-auto h-11 px-4 text-sm font-medium text-muted underline underline-offset-4">
        {doneCopy.forget}
      </button>
    );
  }
  return (
    <div className="royal-frame mt-2 rounded-[12px] bg-panel p-3 text-center text-sm" role="alertdialog" aria-label={doneCopy.forget}>
      <p>{state === "error" ? doneCopy.forgetError : doneCopy.forgetConfirm}</p>
      <div className="mt-2 flex justify-center gap-2">
        <button type="button" onClick={() => setState("idle")} className="h-10 px-4 font-medium text-muted underline underline-offset-4">{doneCopy.forgetNo}</button>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => setState((await forgetContact()).ok ? "done" : "error"))}
          className="royal-btn h-10 px-4 text-xs uppercase disabled:opacity-60"
        >
          {doneCopy.forgetYes}
        </button>
      </div>
    </div>
  );
}

function WaitlistMini({ utm, prefill }: { utm: Record<string, string>; prefill: { email: string; phone: string } }) {
  const [email, setEmail] = useState(prefill.email);
  const [phone, setPhone] = useState(prefill.phone);
  const [consent, setConsent] = useState(false);
  const [wa, setWa] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [joined, setJoined] = useState(false);
  const [pending, startTransition] = useTransition();
  const trap = useRef<HTMLInputElement>(null);

  if (joined) return <p className="royal-frame mt-8 rounded-[14px] bg-accent-soft p-4 text-center font-medium">{doneCopy.joined}</p>;

  return (
    <form
      className="royal-frame relative mt-8 rounded-[14px] bg-panel p-4 shadow-[4px_4px_0_var(--gold)]"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await joinWaitlist({ email, phone, consent, whatsappOptin: wa, website: trap.current?.value ?? "", utm });
          if (res.ok) setJoined(true);
          else setErrors(res.errors);
        });
      }}
      noValidate
    >
      <h2 className="font-royal text-xl font-bold text-fg">{doneCopy.waitlistTitle}</h2>
      <p className="mt-1 text-sm text-muted">{doneCopy.waitlistBody}</p>
      <input ref={trap} name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      <label className="mt-3 block text-sm font-medium" htmlFor="wl-email">Email</label>
      <input id="wl-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
        className="mt-1 h-12 w-full rounded-[10px] border-2 border-line bg-[#fffaf0] px-3 focus:outline-none focus-visible:outline-3 focus-visible:outline-kesar" />
      {errors.email && <p className="mt-1 text-sm text-bad">{errors.email}</p>}
      <label className="mt-3 block text-sm font-medium" htmlFor="wl-phone">or WhatsApp number</label>
      <input id="wl-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98xxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)}
        className="mt-1 h-12 w-full rounded-[10px] border-2 border-line bg-[#fffaf0] px-3 focus:outline-none focus-visible:outline-3 focus-visible:outline-kesar" />
      {errors.phone && <p className="mt-1 text-sm text-bad">{errors.phone}</p>}
      <label className="mt-4 flex items-start gap-3 text-sm">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-5 accent-[var(--accent)]" />
        <span>{doneCopy.consent}</span>
      </label>
      {errors.consent && <p className="mt-1 text-sm text-bad">{errors.consent}</p>}
      {phone && (
        <label className="mt-2 flex items-start gap-3 text-sm">
          <input type="checkbox" checked={wa} onChange={(e) => setWa(e.target.checked)} className="mt-0.5 size-5 accent-[var(--accent)]" />
          <span>{doneCopy.whatsappOptin}</span>
        </label>
      )}
      {errors._ && <p className="mt-2 text-sm text-bad">{errors._}</p>}
      <button type="submit" disabled={pending} className="royal-btn mt-4 h-12 w-full text-sm uppercase disabled:opacity-60">
        {doneCopy.join}
      </button>
    </form>
  );
}
