"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { surveyResponses, waitlist } from "@/db/schema";
import { getSurveyQuestions, recentSubmitsFromIp } from "@/lib/queries/survey";
import { hashIp, MAX_SUBMITS_PER_HOUR, MIN_SECONDS, RID_COOKIE, secondsSinceStart } from "@/lib/survey/guard";
import { personalityFor } from "@/lib/survey/personality";
import { cleanUtm, validateAnswers } from "@/lib/survey/validate";
import type { Personality } from "@/content/survey";

export type SubmitResult =
  | { ok: true; personality: Personality; shareRef: string }
  | { ok: false; reason: "invalid" | "too_fast" | "rate_limited" | "error"; errors?: Record<string, string> };

const submitInput = z.object({
  answers: z.unknown(),
  startToken: z.string().max(200),
  website: z.string().max(200).optional(), // honeypot: real people never see or fill it
  utm: z.unknown().optional(),
});

async function clientIpHash() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip");
  return hashIp(ip);
}

async function respondentId() {
  const jar = await cookies();
  let rid = jar.get(RID_COOKIE)?.value;
  if (!rid || !/^[0-9a-f-]{36}$/.test(rid)) {
    rid = randomUUID();
    jar.set(RID_COOKIE, rid, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365, path: "/" });
  }
  return rid;
}

/** Short, non-reversible code for share links, so responses can be attributed to whoever shared. */
const shareRefFor = (rid: string) => rid.replace(/-/g, "").slice(0, 8);

export async function submitSurvey(raw: unknown): Promise<SubmitResult> {
  const input = submitInput.safeParse(raw);
  if (!input.success) return { ok: false, reason: "invalid" };
  const { answers, startToken, website, utm } = input.data;

  const personalityFallback = personalityFor({});
  // Bots that fill the honeypot get a cheerful fake success and nothing is stored.
  if (website) return { ok: true, personality: personalityFallback, shareRef: "" };

  const elapsed = secondsSinceStart(startToken);
  if (elapsed == null || elapsed < MIN_SECONDS()) return { ok: false, reason: "too_fast" };

  const questions = await getSurveyQuestions();
  const checked = validateAnswers(questions, answers);
  if (!checked.ok) return { ok: false, reason: "invalid", errors: checked.errors };

  try {
    const rid = await respondentId();
    const ipHash = await clientIpHash();
    const existing = await db.select({ id: surveyResponses.id }).from(surveyResponses).where(eq(surveyResponses.respondentId, rid)).limit(1);
    if (!existing.length && ipHash && (await recentSubmitsFromIp(ipHash)) >= MAX_SUBMITS_PER_HOUR) {
      return { ok: false, reason: "rate_limited" };
    }
    await db.insert(surveyResponses).values({
      respondentId: rid, answers: checked.answers, source: "web", utm: cleanUtm(utm), ipHash,
    }).onConflictDoUpdate({
      target: surveyResponses.respondentId,
      set: { answers: checked.answers, updatedAt: sql`now()`, ...(cleanUtm(utm) ? { utm: cleanUtm(utm) } : {}) },
    });
    revalidatePath("/admin");
    return { ok: true, personality: personalityFor(checked.answers), shareRef: shareRefFor(rid) };
  } catch (e) {
    console.error("submitSurvey failed", e instanceof Error ? e.message : e);
    return { ok: false, reason: "error" };
  }
}

// ── inline waitlist on the thank-you screen (full /waitlist with double opt-in is SPEC §1.3) ──

const phoneIn = z.string().trim().transform((v) => v.replace(/[\s()-]/g, "")).pipe(
  z.string().regex(/^(\+91)?[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number"),
).transform((v) => (v.startsWith("+91") ? v : `+91${v}`));

const waitlistInput = z.object({
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email("That email looks off")]).optional(),
  phone: z.union([z.literal(""), phoneIn]).optional(),
  consent: z.literal(true, { message: "Tick the box so we're allowed to contact you" }),
  whatsappOptin: z.boolean().default(false),
  website: z.string().max(200).optional(),
  utm: z.unknown().optional(),
}).refine((v) => v.email || v.phone, { message: "Add an email or a WhatsApp number", path: ["email"] });

export type WaitlistResult = { ok: true } | { ok: false; errors: Record<string, string> };

const REF_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const referralCode = () => Array.from(randomBytes(6), (b) => REF_ALPHABET[b % REF_ALPHABET.length]).join("");

export async function joinWaitlist(raw: unknown): Promise<WaitlistResult> {
  const parsed = waitlistInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? "_"), i.message])) };
  }
  const v = parsed.data;
  if (v.website) return { ok: true };
  try {
    const jar = await cookies();
    const rid = jar.get(RID_COOKIE)?.value;
    const utm = { ...(cleanUtm(v.utm) ?? {}), ...(rid ? { respondent_id: rid } : {}) };
    for (let attempt = 0; attempt < 3; attempt++) {
      const rows = await db.insert(waitlist).values({
        email: v.email || null, phone: v.phone || null, consent: true,
        whatsappOptin: Boolean(v.phone) && v.whatsappOptin, referralCode: referralCode(), utm,
      }).onConflictDoNothing().returning({ id: waitlist.id });
      // No row back means the email is already on the list (fine, don't reveal it) or the code collided (retry).
      if (rows.length || v.email) break;
    }
    return { ok: true };
  } catch (e) {
    console.error("joinWaitlist failed", e instanceof Error ? e.message : e);
    return { ok: false, errors: { _: "Something went wrong. Try again?" } };
  }
}
