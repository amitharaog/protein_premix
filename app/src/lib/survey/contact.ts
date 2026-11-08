import { z } from "zod";
import { contactStep } from "@/content/survey";

const msg = contactStep.errors;

// Name and contact from the last step of the survey (required since 8 Nov 2026, founder request), and the shared
// email and phone rules the waitlist uses too. Contacts are stored in survey_contacts, never with the answers.

/** A 10-digit Indian mobile number, stored as +91XXXXXXXXXX. */
export const phoneIn = z.string().trim().transform((v) => v.replace(/[\s()-]/g, "")).pipe(
  z.string().regex(/^(\+91)?[6-9]\d{9}$/, msg.phone),
).transform((v) => (v.startsWith("+91") ? v : `+91${v}`));

export const emailIn = z.string().trim().toLowerCase().email(msg.email);

const contactInput = z.object({
  name: z.string().trim().min(1, msg.name).max(80, msg.nameLong),
  email: z.union([z.literal(""), emailIn]).optional(),
  phone: z.union([z.literal(""), phoneIn]).optional(),
  whatsappOptin: z.boolean().default(false),
  consent: z.literal(true, { message: msg.consent }),
}).refine((v) => v.email || v.phone, { message: msg.contact, path: ["phone"] });

export type Contact = { name: string; email: string | null; phone: string | null; whatsappOptin: boolean };
export type ContactResult = { ok: true; contact: Contact } | { ok: false; errors: Record<string, string> };

/** Field errors are keyed name, phone, email or consent (never a question id), first message per field. */
export function checkContact(raw: unknown): ContactResult {
  const r = contactInput.safeParse(raw ?? {});
  if (!r.success) {
    const errors: Record<string, string> = {};
    for (const i of r.error.issues) {
      const key = String(i.path[0] ?? "name");
      errors[key] ??= i.message;
    }
    // The "number or email" rule only runs once every field passes, so say it now too: one round of fixes, not two.
    const o = (raw ?? {}) as Record<string, unknown>;
    const blank = (x: unknown) => typeof x !== "string" || !x.trim();
    if (blank(o.email) && blank(o.phone)) errors.phone ??= msg.contact;
    return { ok: false, errors };
  }
  const v = r.data;
  return { ok: true, contact: { name: v.name, email: v.email || null, phone: v.phone || null, whatsappOptin: Boolean(v.phone) && v.whatsappOptin } };
}
