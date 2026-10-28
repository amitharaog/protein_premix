import { z } from "zod";

export type SurveyQuestion = {
  id: string;
  question: string;
  type: "single" | "multi" | "scale_1_5" | "free_text";
  options: string[];
  hint: string | null;
  maxSelect: number | null;
  required: boolean;
  maxLength: number | null;
};

export type Answers = Record<string, string | string[]>;
export type ValidationResult = { ok: true; answers: Answers } | { ok: false; errors: Record<string, string> };

const isEmpty = (v: unknown) => v == null || v === "" || (Array.isArray(v) && v.length === 0);

/** Server-side answer check (SPEC §1.2). Unknown question ids are dropped; empty answers are omitted. */
export function validateAnswers(questions: SurveyQuestion[], raw: unknown): ValidationResult {
  const input = z.record(z.string(), z.unknown()).safeParse(raw);
  if (!input.success) return { ok: false, errors: { _: "answers must be an object" } };

  const answers: Answers = {};
  const errors: Record<string, string> = {};
  for (const q of questions) {
    const v = input.data[q.id];
    if (isEmpty(v)) {
      if (q.required) errors[q.id] = "required";
      continue;
    }
    let schema: z.ZodType<string | string[]>;
    switch (q.type) {
      case "single":
        schema = z.enum(q.options as [string, ...string[]]);
        break;
      case "scale_1_5":
        schema = z.enum(["1", "2", "3", "4", "5"]);
        break;
      case "multi":
        schema = z
          .array(z.enum(q.options as [string, ...string[]]))
          .max(q.maxSelect ?? q.options.length)
          .refine((a) => new Set(a).size === a.length, "duplicate option");
        break;
      case "free_text":
        schema = z.string().trim().max(q.maxLength ?? 1000);
        break;
    }
    const r = schema.safeParse(q.type === "scale_1_5" && typeof v === "number" ? String(v) : v);
    if (r.success) {
      if (!isEmpty(r.data)) answers[q.id] = r.data;
      else if (q.required) errors[q.id] = "required";
    } else {
      errors[q.id] = r.error.issues[0]?.message ?? "invalid";
    }
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, answers };
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref"] as const;

/** Keeps only known attribution keys, trimmed to 100 chars each. */
export function cleanUtm(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== "object") return null;
  const out: Record<string, string> = {};
  for (const k of UTM_KEYS) {
    const v = (raw as Record<string, unknown>)[k];
    if (typeof v === "string" && v.trim()) out[k] = v.trim().slice(0, 100);
  }
  return Object.keys(out).length ? out : null;
}
