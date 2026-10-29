"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { done as doneCopy, freeTextPlaceholders, intro, questionCopy, scaleLabels, ui, type Personality } from "@/content/survey";
import type { Answers, SurveyQuestion } from "@/lib/survey/validate";
import { joinWaitlist, submitSurvey } from "./actions";
import { CheckerStrip, Crown, MugCake, MugLevel, Ornaments, Seal, TileTray, Wordmark } from "./art";

type Props = { questions: SurveyQuestion[]; initial: Answers | null; startToken: string; siteUrl: string };

const AUTO_ADVANCE_MS = 750;
const SCALE: string[] = ["1", "2", "3", "4", "5"];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const isEmpty = (v: unknown) => v == null || v === "" || (Array.isArray(v) && v.length === 0);

export function SurveyClient({ questions, initial, startToken, siteUrl }: Props) {
  const [step, setStep] = useState(-1); // -1 intro, 0..n-1 questions, n done
  const [answers, setAnswers] = useState<Answers>(initial ?? {});
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
  const copy = q ? questionCopy[q.id] : undefined;
  const answeredCount = questions.filter((x) => !isEmpty(answers[x.id])).length;

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

  const submit = useCallback((final: Answers) => {
    startTransition(async () => {
      const res = await submitSurvey({ answers: final, startToken, website: honeypot.current?.value ?? "", utm });
      if (res.ok) {
        setResult({ personality: res.personality, shareRef: res.shareRef });
        setStep(n);
        return;
      }
      if (res.reason === "invalid" && res.errors) {
        const first = questions.findIndex((x) => res.errors?.[x.id]);
        if (first >= 0) {
          setStep(first);
          setTimeout(() => setNotice(ui.required), 0);
          return;
        }
      }
      setNotice(res.reason === "too_fast" ? ui.tooFast : res.reason === "rate_limited" ? ui.rateLimited : ui.error);
    });
  }, [n, questions, startToken, utm]);

  const goNext = useCallback((current: Answers = answers) => {
    if (!q) return;
    if (q.required && isEmpty(current[q.id])) {
      setNotice(ui.required);
      setBump((b) => b + 1);
      return;
    }
    if (step === n - 1) submit(current);
    else setStep(step + 1);
  }, [answers, n, q, step, submit]);

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
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => goNext(next), copy.reactions?.[option] ? AUTO_ADVANCE_MS + 500 : AUTO_ADVANCE_MS);
  }, [answers, copy, goNext, q, react]);

  // Keyboard: number keys pick options, Enter goes next (not while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q) return;
      const t = e.target as HTMLElement;
      if (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && (t as HTMLInputElement).type !== "radio" && (t as HTMLInputElement).type !== "checkbox")) return;
      const opts = q.type === "scale_1_5" ? ["1", "2", "3", "4", "5"] : q.options;
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
          <Wordmark height={28} className="shrink-0" />
          <div className="min-w-0 flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={n} aria-valuenow={answeredCount} aria-label="Answered">
            <TileTray total={n} answered={questions.map((x) => !isEmpty(answers[x.id]))} current={step < n ? step : -1} />
          </div>
          <p className="tabular shrink-0 font-caps text-xs font-bold text-muted">{step < n ? `${step + 1}/${n}` : `${n}/${n}`}</p>
        </header>
      )}

      {step === -1 && <Intro count={n} welcomeBack={Boolean(initial)} onStart={() => setStep(0)} />}

      {q && copy && (
        <section key={q.id} className="anim-pop mt-5 flex flex-1 flex-col" aria-labelledby={`h-${q.id}`}>
          <Host text={hostLine ?? copy.host} bump={bump} />
          <p className="mt-5 font-caps text-[11px] font-bold tracking-[0.3em] text-muted" aria-hidden>No. {ROMAN[step] ?? step + 1}</p>
          <h1 id={`h-${q.id}`} ref={headingRef} tabIndex={-1} className="mt-1 font-royal text-[26px] leading-tight font-bold text-fg outline-none">
            {q.question}
          </h1>
          {q.hint && <p className="mt-1 text-sm text-muted">{q.hint}{q.required || /optional/i.test(q.hint) ? "" : " · optional"}</p>}

          <div className="mt-4 flex-1">
            {(q.type === "single" || q.type === "multi") && <ChoiceList q={q} value={answers[q.id]} onPick={choose} />}
            {q.type === "scale_1_5" && <Scale q={q} value={answers[q.id] as string | undefined} onPick={choose} />}
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
            {!q.required && isEmpty(answers[q.id]) && step < n - 1 && (
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
              {step === n - 1 ? (pending ? ui.submitting : ui.submit) : `${ui.next} →`}
            </button>
          </nav>
        </section>
      )}

      {step >= n && result && (
        <Done
          personality={result.personality}
          shareUrl={`${siteUrl}/survey?utm_source=share&utm_medium=whatsapp&ref=${result.shareRef}`}
          utm={utm}
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
      <p className="text-center font-caps text-[11px] font-bold uppercase tracking-[0.22em] text-muted">✦ {intro.kicker(count)} ✦</p>
      <div className="mt-3 flex flex-col items-center">
        <Wordmark height={112} crown />
        <p className="ribbon -mt-1 font-caps text-sm font-bold uppercase tracking-[0.3em]">{intro.tagline}</p>
        <p className="mt-1.5 font-caps text-[10px] font-semibold uppercase tracking-[0.4em] text-muted">{intro.est}</p>
      </div>
      <div className="relative mx-auto mt-2 aspect-[36/26] w-full">
        <Ornaments className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="medallion grid size-[200px] place-items-center rounded-full">
            <MugCake size={160} steam className="anim-bob" />
          </div>
        </div>
        <Seal lines={intro.badges[0]} rotate={-8} className="absolute -left-2 bottom-0 w-[96px]" />
        <Seal lines={intro.badges[1]} rotate={8} className="absolute -right-2 top-0 w-[96px]" />
        <Seal lines={intro.badges[2]} rotate={-5} className="absolute -right-3 bottom-0 w-[90px]" />
      </div>
      <h1 className="mt-4 text-center font-royal text-[36px] leading-none font-black italic text-fg">{intro.headline}</h1>
      <p className="mt-2 text-center font-medium text-muted">{intro.sub}</p>
      <Steps />
      <p className="royal-frame mt-5 rounded-[10px] bg-panel p-3.5 text-sm leading-snug text-fg">{intro.spec}</p>
      {welcomeBack && <p className="royal-frame mt-3 rounded-[10px] bg-gold-soft p-3.5 text-sm">{ui.welcomeBack}</p>}
      <div className="flex-1" />
      <button type="button" onClick={onStart} className="royal-btn mt-6 h-14 w-full text-base uppercase">
        {intro.cta} →
      </button>
      <p className="mt-4 text-[11px] leading-relaxed text-muted">{intro.purpose}</p>
    </section>
  );
}

function Steps() {
  return (
    <section aria-label={intro.stepsTitle} className="mt-6">
      <h2 className="rule-ornament font-caps text-xs font-bold uppercase tracking-[0.3em] text-fg">{intro.stepsTitle}</h2>
      <ol className="mt-3 grid grid-cols-3 gap-2">
        {intro.steps.map((s, i) => (
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
        <MugCake size={58} />
      </span>
      <p key={text} className="anim-pop relative mb-2 rounded-[12px] rounded-bl-sm border-2 border-line bg-panel shadow-[3px_3px_0_var(--gold)] px-4 py-2.5 text-[15px] leading-snug text-fg">
        {text}
      </p>
    </div>
  );
}

function ChoiceList({ q, value, onPick }: { q: SurveyQuestion; value: string | string[] | undefined; onPick: (o: string) => void }) {
  const multi = q.type === "multi";
  const selected = new Set(Array.isArray(value) ? value : value ? [value] : []);
  const full = multi && q.maxSelect != null && selected.size >= q.maxSelect;
  return (
    <fieldset>
      <legend className="sr-only">{q.question}</legend>
      <div className="flex flex-col gap-2">
        {q.options.map((o, i) => {
          const on = selected.has(o);
          return (
            <label
              key={o}
              className={[
                "relative flex min-h-14 cursor-pointer items-center gap-3 overflow-hidden rounded-[10px] border-2 border-line px-4 py-3 transition duration-150 ease-out active:scale-[0.98]",
                on ? "bg-accent-soft pt-5 shadow-[3px_3px_0_var(--line)]" : "bg-panel shadow-[3px_3px_0_var(--gold)] hover:bg-gold-soft/40",
                full && !on ? "opacity-50" : "",
              ].join(" ")}
            >
              <input type={multi ? "checkbox" : "radio"} name={q.id} value={o} checked={on} onChange={() => onPick(o)} className="peer sr-only" />
              {on && <CheckerStrip />}
              <span
                aria-hidden
                className={`grid size-6 shrink-0 place-items-center border-2 text-xs font-bold transition ${multi ? "rounded-md" : "rounded-full"} ${on ? "border-accent bg-accent text-accent-fg" : "border-line"}`}
              >
                {on ? "✓" : ""}
              </span>
              <span className="flex-1 text-[15px] font-medium leading-tight">{o}</span>
              <kbd className="hidden text-xs text-muted sm:inline">{i + 1}</kbd>
              <span className="pointer-events-none absolute inset-0 rounded-[10px] peer-focus-visible:outline-3 peer-focus-visible:outline-kesar" />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function Scale({ q, value, onPick }: { q: SurveyQuestion; value: string | undefined; onPick: (o: string) => void }) {
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
              <MugLevel level={Number(o)} size={44} />
              <span className="tabular font-caps text-sm font-bold">{ROMAN[Number(o) - 1]}</span>
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

function Done({ personality, shareUrl, utm, onEdit }: { personality: Personality; shareUrl: string; utm: Record<string, string>; onEdit: () => void }) {
  const [copied, setCopied] = useState(false);
  const shareText = doneCopy.shareText(personality.title, shareUrl);
  return (
    <section className="anim-pop mt-6 flex flex-1 flex-col">
      <div className="royal-frame relative overflow-hidden rounded-[14px] bg-panel px-5 pb-6 pt-7 text-center shadow-[4px_4px_0_var(--gold)]">
        <CheckerStrip className="h-3" />
        <Crown className="mx-auto h-9 w-auto" />
        <p className="mt-2 font-caps text-[11px] font-bold uppercase tracking-[0.25em] text-muted">{doneCopy.personalityLead}</p>
        <h1 className="mt-2 font-royal text-[30px] leading-tight font-black italic text-fg">{personality.title}</h1>
        <p className="mx-auto mt-2 max-w-xs text-muted">{personality.line}</p>
        <div className="mt-3 flex justify-center"><MugCake size={76} /></div>
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

      <WaitlistMini utm={utm} />

      <button type="button" onClick={onEdit} className="mx-auto mt-6 h-11 px-4 text-sm font-medium text-muted underline underline-offset-4">
        {doneCopy.edit}
      </button>
    </section>
  );
}

function WaitlistMini({ utm }: { utm: Record<string, string> }) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
