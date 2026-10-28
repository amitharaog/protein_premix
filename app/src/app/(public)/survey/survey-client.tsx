"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { done as doneCopy, freeTextPlaceholders, intro, questionCopy, scaleLabels, ui, type Personality } from "@/content/survey";
import type { Answers, SurveyQuestion } from "@/lib/survey/validate";
import { joinWaitlist, submitSurvey } from "./actions";
import { BrownieTray, Drip, HourglassProgress, PosterArt } from "./art";

type Props = { questions: SurveyQuestion[]; initial: Answers | null; startToken: string; siteUrl: string };

const AUTO_ADVANCE_MS = 750;
const isEmpty = (v: unknown) => v == null || v === "" || (Array.isArray(v) && v.length === 0);

export function SurveyClient({ questions, initial, startToken, siteUrl }: Props) {
  const [step, setStep] = useState(-1); // -1 intro, 0..n-1 questions, n done
  const [answers, setAnswers] = useState<Answers>(initial ?? {});
  const [hostLine, setHostLine] = useState<string | null>(null);
  const [bump, setBump] = useState(0); // re-triggers the mug wobble
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

  const fraction = step >= n ? 1 : answeredCount / n;

  return (
    <main className={`mx-auto flex min-h-dvh w-full max-w-md flex-col pb-8 ${step === -1 ? "" : "px-4 pt-4"}`}>
      <input ref={honeypot} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />

      {step >= 0 && (
        <header className="flex items-center gap-3">
          <div key={bump} className={bump ? "anim-wobble" : ""}>
            <HourglassProgress fraction={fraction} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="tabular font-head text-sm font-semibold uppercase tracking-widest text-accent">
              {step < n ? ui.progress(step + 1, n) : doneCopy.title}
            </p>
            <div className="mt-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={n} aria-valuenow={answeredCount} aria-label="Answered">
              <BrownieTray total={n} answered={questions.map((x) => !isEmpty(answers[x.id]))} current={step < n ? step : -1} />
            </div>
          </div>
        </header>
      )}

      {step === -1 && (
        <Intro welcomeBack={Boolean(initial)} onStart={() => setStep(0)} />
      )}

      {q && copy && (
        <section key={q.id} className="anim-pop mt-5 flex flex-1 flex-col" aria-labelledby={`h-${q.id}`}>
          <HostBubble text={hostLine ?? copy.host} />
          <h1 id={`h-${q.id}`} ref={headingRef} tabIndex={-1} className="mt-4 font-head text-[26px] leading-[1.1] font-semibold uppercase tracking-tight text-frost outline-none">
            {q.question}
          </h1>
          {q.hint && <p className="mt-1 text-sm text-muted">{q.hint}{q.required || /optional/i.test(q.hint) ? "" : " · optional"}</p>}

          <div className="mt-4 flex-1">
            {(q.type === "single" || q.type === "multi") && (
              <ChoiceList q={q} value={answers[q.id]} emoji={copy.emoji} onPick={choose} />
            )}
            {q.type === "scale_1_5" && <Scale q={q} value={answers[q.id] as string | undefined} emoji={copy.emoji} onPick={choose} />}
            {q.type === "free_text" && (
              <FreeText q={q} value={(answers[q.id] as string | undefined) ?? ""} onChange={(v) => setAnswers({ ...answers, [q.id]: v })} />
            )}
          </div>

          <p aria-live="polite" className="min-h-6 pt-2 text-center text-sm font-medium text-bad">{notice}</p>

          <nav className="mt-2 flex items-center gap-3">
            <button type="button" onClick={() => setStep(step - 1)} className="h-12 rounded-full px-4 text-sm font-medium text-muted hover:text-fg">
              ← {ui.back}
            </button>
            <div className="flex-1" />
            {!q.required && isEmpty(answers[q.id]) && step < n - 1 && (
              <button type="button" onClick={() => setStep(step + 1)} className="h-12 rounded-full px-4 text-sm font-medium text-muted hover:text-fg">
                {ui.skip}
              </button>
            )}
            <button
              type="button"
              onClick={() => goNext()}
              disabled={pending}
              className="h-12 min-w-28 rounded-full bg-accent px-6 font-head text-lg font-semibold uppercase tracking-wide text-accent-fg shadow-[0_4px_0_#7f4a2b] transition active:translate-y-0.5 active:shadow-[0_1px_0_#7f4a2b] disabled:opacity-60"
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
    </main>
  );
}

function Intro({ welcomeBack, onStart }: { welcomeBack: boolean; onStart: () => void }) {
  return (
    <section className="anim-pop flex flex-1 flex-col">
      <div className="relative aspect-[2/3] max-h-[78dvh] w-full overflow-hidden">
        <PosterArt />
        <p className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-full bg-bg/90 px-3 py-1 font-head text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">{intro.kicker}</p>
        <h1 className="absolute inset-x-0 bottom-[7%] flex flex-col items-center font-display uppercase leading-[0.86]">
          <span className="flex items-end gap-2">
            <span className="text-[34px] text-[#c98a5e]">{intro.poster.small.split(" ").slice(0, 2).join(" ")}</span>
            <span className="text-[52px] text-accent">{intro.poster.small.split(" ").slice(2).join(" ")}</span>
          </span>
          <span className="text-[76px] tracking-tight text-accent">{intro.poster.big}</span>
          <span className="mt-1 text-[24px] tracking-wide text-frost">{intro.poster.tail}</span>
        </h1>
      </div>
      <div className="px-4">
        <div className="mt-5 grid grid-cols-2 gap-4 text-[13px] leading-snug">
          <p className="font-semibold text-accent">{intro.ask}</p>
          <p className="text-frost/90">{intro.spec}</p>
        </div>
        {welcomeBack && <p className="mt-4 rounded-[14px] border border-milk bg-panel p-3 text-sm">{ui.welcomeBack}</p>}
        <button
          type="button"
          onClick={onStart}
          className="mt-6 h-14 w-full rounded-full bg-accent font-display text-2xl uppercase tracking-wider text-accent-fg shadow-[0_6px_0_#7f4a2b] transition active:translate-y-1 active:shadow-[0_2px_0_#7f4a2b]"
        >
          {intro.cta} →
        </button>
        <p className="mt-4 text-[11px] leading-relaxed text-muted">{intro.purpose}</p>
      </div>
    </section>
  );
}

function HostBubble({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2" aria-live="polite">
      <span aria-hidden className="mt-1 text-2xl">☕</span>
      <p key={text} className="anim-pop relative rounded-[14px] rounded-tl-sm border border-milk/60 bg-panel px-4 py-3 text-[15px] leading-snug text-frost">
        {text}
      </p>
    </div>
  );
}

function ChoiceList({ q, value, emoji, onPick }: { q: SurveyQuestion; value: string | string[] | undefined; emoji: Record<string, string>; onPick: (o: string) => void }) {
  const multi = q.type === "multi";
  const selected = new Set(Array.isArray(value) ? value : value ? [value] : []);
  const full = multi && q.maxSelect != null && selected.size >= q.maxSelect;
  const grid = q.options.length > 6;
  return (
    <fieldset>
      <legend className="sr-only">{q.question}</legend>
      <div className={grid ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2"}>
        {q.options.map((o, i) => {
          const on = selected.has(o);
          return (
            <label
              key={o}
              className={[
                "group relative flex min-h-14 cursor-pointer items-center gap-3 rounded-[14px] border-2 px-4 py-3 transition duration-150 ease-out active:scale-[0.98]",
                on ? "border-accent bg-accent-soft pt-5" : "border-line bg-panel hover:border-milk",
                full && !on ? "opacity-50" : "",
                grid ? "flex-col justify-center text-center" : "",
              ].join(" ")}
            >
              <input
                type={multi ? "checkbox" : "radio"}
                name={q.id}
                value={o}
                checked={on}
                onChange={() => onPick(o)}
                className="peer sr-only"
              />
              {on && <Drip className="rounded-t-[12px]" />}
              <span aria-hidden className={`text-2xl transition-transform duration-150 ${on ? "scale-125" : ""}`}>{emoji[o] ?? "•"}</span>
              <span className={`text-[15px] font-medium leading-tight ${grid ? "" : "flex-1"}`}>{o}</span>
              {!grid && <kbd className="hidden text-xs text-muted sm:inline">{i + 1}</kbd>}
              {on && <span aria-hidden className="absolute right-2 bottom-1.5 text-xs text-accent">✓</span>}
              <span className="pointer-events-none absolute inset-0 rounded-[14px] peer-focus-visible:outline-3 peer-focus-visible:outline-kesar" />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function Scale({ q, value, emoji, onPick }: { q: SurveyQuestion; value: string | undefined; emoji: Record<string, string>; onPick: (o: string) => void }) {
  return (
    <fieldset>
      <legend className="sr-only">{q.question}</legend>
      <div className="grid grid-cols-5 gap-2">
        {["1", "2", "3", "4", "5"].map((o) => {
          const on = value === o;
          return (
            <label
              key={o}
              className={`relative flex cursor-pointer flex-col items-center gap-1 overflow-hidden rounded-[14px] border-2 pb-3 pt-4 transition duration-150 active:scale-95 ${on ? "border-accent bg-accent-soft" : "border-line bg-panel"}`}
            >
              <input type="radio" name={q.id} value={o} checked={on} onChange={() => onPick(o)} className="peer sr-only" />
              {on && <Drip />}
              <span aria-hidden className={`text-3xl transition-transform duration-150 ${on ? "scale-125" : "grayscale-[40%]"}`}>{emoji[o]}</span>
              <span className="tabular text-sm font-semibold">{o}</span>
              <span className="text-center text-[11px] leading-tight text-muted">{scaleLabels[o]}</span>
              <span className="pointer-events-none absolute inset-0 rounded-[14px] peer-focus-visible:outline-3 peer-focus-visible:outline-kesar" />
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
        className="w-full rounded-[14px] border-2 border-line bg-panel p-4 text-[15px] leading-relaxed placeholder:text-muted/70 focus:border-accent focus:outline-none"
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
      <Sprinkles />
      <div className="relative mt-2 overflow-hidden rounded-[20px] border-4 border-milk bg-panel px-6 pb-6 pt-8 text-center">
        <Drip className="h-4" />
        <p className="font-head text-sm font-semibold uppercase tracking-widest text-accent">{doneCopy.personalityLead}</p>
        <p aria-hidden className="mt-3 text-6xl">{personality.emoji}</p>
        <h1 className="mt-3 font-display text-[44px] uppercase leading-[0.9] text-frost">{personality.title}</h1>
        <p className="mt-3 text-muted">{personality.line}</p>
      </div>

      <p className="mt-6 text-center text-sm">{doneCopy.shareLead}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 items-center justify-center rounded-full bg-[#25D366] font-semibold text-[#0b2e17]"
        >
          WhatsApp
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
          className="h-12 rounded-full border-2 border-milk bg-panel font-semibold"
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

  if (joined) return <p className="mt-8 rounded-[14px] bg-accent-soft p-4 text-center font-medium">{doneCopy.joined}</p>;

  return (
    <form
      className="relative mt-8 rounded-[14px] border-2 border-milk bg-panel p-4"
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
      <h2 className="font-head text-xl font-semibold uppercase text-accent">{doneCopy.waitlistTitle}</h2>
      <p className="mt-1 text-sm text-muted">{doneCopy.waitlistBody}</p>
      <input ref={trap} name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      <label className="mt-3 block text-sm font-medium" htmlFor="wl-email">Email</label>
      <input id="wl-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
        className="mt-1 h-12 w-full rounded-xl border-2 border-line bg-bg px-3 focus:border-accent focus:outline-none" />
      {errors.email && <p className="mt-1 text-sm text-bad">{errors.email}</p>}
      <label className="mt-3 block text-sm font-medium" htmlFor="wl-phone">or WhatsApp number</label>
      <input id="wl-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98xxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)}
        className="mt-1 h-12 w-full rounded-xl border-2 border-line bg-bg px-3 focus:border-accent focus:outline-none" />
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
      <button type="submit" disabled={pending} className="mt-4 h-12 w-full rounded-full bg-accent font-head text-lg font-semibold uppercase tracking-wide text-accent-fg disabled:opacity-60">
        {doneCopy.join}
      </button>
    </form>
  );
}

function Sprinkles() {
  const [bits, setBits] = useState<{ left: number; delay: number; dur: number; char: string; size: number }[]>([]);
  useEffect(() => {
    const chars = ["🍫", "✨", "🧁", "💛", "🥄", "☕"];
    setBits(Array.from({ length: 34 }, () => ({
      left: Math.random() * 100, delay: Math.random() * 0.6, dur: 2.2 + Math.random() * 1.8,
      char: chars[Math.floor(Math.random() * chars.length)], size: 14 + Math.random() * 14,
    })));
  }, []);
  const nodes = useMemo(() => bits.map((b, i) => (
    <span key={i} aria-hidden className="sprinkle" style={{ left: `${b.left}vw`, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, fontSize: b.size }}>
      {b.char}
    </span>
  )), [bits]);
  return <>{nodes}</>;
}
