"use client";

import { useState } from "react";
import { joinWaitlist } from "@/app/(public)/survey/actions";
import type { launch } from "@/content/launch";

// The launch page's waitlist form. It uses the same server action as the survey's thank-you screen (consent box,
// email or WhatsApp, honeypot). In the owner preview it stays switched off, so test sign-ups never count as E1.

type Copy = (typeof launch)["waitlist"];

export function WaitlistForm({ copy, live }: { copy: Copy; live: boolean }) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const clear = (...keys: string[]) => setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !keys.includes(k))));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!live || state === "sending") return;
    setState("sending");
    const r = await joinWaitlist({
      email, phone, consent, whatsappOptin: Boolean(phone.trim()), website, utm: { utm_source: "launch" },
    }).catch(() => ({ ok: false as const, errors: { _: "Something went wrong. Try again?" } }));
    if (r.ok) return setState("done");
    setErrors(r.errors);
    setState("idle");
  }

  if (state === "done") {
    return <p role="status" className="rounded-[22px] bg-[var(--l-bg)] p-7 text-lg font-semibold shadow-[0_18px_50px_-24px_rgba(42,26,17,.45)]">{copy.done}</p>;
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-[22px] bg-[var(--l-bg)] p-5 shadow-[0_18px_50px_-24px_rgba(42,26,17,.45)] md:p-7">
      <div>
        <label htmlFor="lp-email" className="text-sm font-semibold">{copy.email}</label>
        <input id="lp-email" type="email" inputMode="email" autoComplete="email" value={email}
          onChange={(e) => { setEmail(e.target.value); clear("email"); }}
          aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "lp-email-err" : "lp-either"} className="lp-input mt-1" />
        {errors.email && <p id="lp-email-err" className="mt-1 text-sm font-semibold text-[#8c1d2b]">{errors.email}</p>}
      </div>
      <div>
        <label htmlFor="lp-phone" className="text-sm font-semibold">{copy.phone}</label>
        <div className="mt-1 flex">
          <span className="flex items-center rounded-l-[12px] border-[1.5px] border-r-0 border-[var(--l-line)] bg-[var(--l-paper)] px-3 text-[15px] text-[var(--l-muted)]">+91</span>
          <input id="lp-phone" type="tel" inputMode="numeric" autoComplete="tel-national" value={phone}
            onChange={(e) => { setPhone(e.target.value); clear("phone", "email"); }}
            aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "lp-phone-err" : "lp-either"} className="lp-input rounded-l-none" />
        </div>
        {errors.phone && <p id="lp-phone-err" className="mt-1 text-sm font-semibold text-[#8c1d2b]">{errors.phone}</p>}
      </div>
      <p id="lp-either" className="text-xs text-[var(--l-muted)]">{copy.either}</p>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden"
        value={website} onChange={(e) => setWebsite(e.target.value)} />
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); clear("consent"); }}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--l-ink)]" aria-describedby={errors.consent ? "lp-consent-err" : undefined} />
        <span>{copy.consent}</span>
      </label>
      {errors.consent && <p id="lp-consent-err" className="text-sm font-semibold text-[#8c1d2b]">{errors.consent}</p>}
      <p className="text-xs leading-relaxed text-[var(--l-muted)]">{copy.purpose}</p>
      {errors._ && <p role="alert" className="text-sm font-semibold text-[#8c1d2b]">{errors._}</p>}
      <button type="submit" disabled={!live || state === "sending"} className="lp-pill w-full justify-center">{copy.submit}</button>
      {!live && <p className="text-xs font-semibold text-[var(--l-caramel-dark)]">{copy.preview}</p>}
    </form>
  );
}
