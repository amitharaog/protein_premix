# Compliance notes for the build (not legal advice)

These notes are a summary of the research, written so the code can enforce safe defaults.
A qualified FSSAI consultant or lawyer must review them before launch. Every item marked
**VERIFY** must be checked against the current FSSAI text.

## Protein claims — implement in `src/lib/fssai.ts`

Source: FSSAI (Advertising & Claims) Regulations 2018, Schedule I. The thresholds are measured against the ICMR-NIN 2020 RDA, which is 54 g/day for the reference adult man (FSSAI directions of 2021).

| Claim | Condition (solid food) | With RDA = 54 g |
|---|---|---|
| "Source of protein" | ≥ 10 % RDA per 100 g, **or** ≥ 5 % RDA per 100 kcal | ≥ 5.4 g / 100 g, or ≥ 2.7 g / 100 kcal |
| "High / Rich in protein" | ≥ 20 % RDA per 100 g, **or** ≥ 10 % RDA per 100 kcal | ≥ 10.8 g / 100 g, or ≥ 5.4 g / 100 kcal |

```ts
export const PROTEIN_RDA_G = 54;            // config, editable in admin
export function proteinClaim(n: { protein_g: number; total_g: number; kcal: number }) {
  const per100g = (n.protein_g / n.total_g) * 100;
  const per100kcal = n.kcal > 0 ? (n.protein_g / n.kcal) * 100 : 0;
  if (per100g >= 0.20 * PROTEIN_RDA_G || per100kcal >= 0.10 * PROTEIN_RDA_G) return { claim: 'high', per100g, per100kcal };
  if (per100g >= 0.10 * PROTEIN_RDA_G || per100kcal >= 0.05 * PROTEIN_RDA_G) return { claim: 'source', per100g, per100kcal };
  return { claim: 'none', per100g, per100kcal };
}
```

Example: a 50 g sachet with 10 g protein has 20 g of protein per 100 g dry, which passes "high".
**VERIFY:** is the claim judged on the dry mix as sold, or on the cake as prepared with milk or water? Show both numbers in the lab UI.

## Copy rules the public site must enforce

- A nutrition or claim badge appears only if `products.lab_tested = true`, using `lab_protein_g` from a NABL-accredited lab report.
  - Before that, the copy must read "~10 g protein (target)".
  - The context matters: Citizens Protein Project (Apr 2024) found about 69 % of 36 Indian protein supplements under-delivered on their labelled protein.
  - FSSAI sent notices over protein and "muscle strength" claims in June and October 2026. The October notices went to Dr Reddy's, Nestlé Health Science, Amazon, Flipkart, Netmeds and Tirupati Wellness.
- No health or disease claims. Banned words, checked by lint and a unit test over `src/content/**`: muscle, recovery, immunity, diabetic, weight loss, burn, detox, cure, doctor-recommended.
- Position the product as a general food (a proprietary food or bakery premix), not a health supplement. **VERIFY** the licence category.
- "Gluten-free" needs lab testing. **VERIFY** the threshold. Until then the site says "made with gluten-free ingredients".
- "Eggless" and the green veg dot are fine for a recipe with no egg. Dairy whey is vegetarian, not vegan.
- Front-of-pack warnings: FSSAI plans red-hexagon "high in" warnings in a single phase (affidavit to the Supreme Court, 23 Sep 2026). Solid-food thresholds are roughly:
  - added sugar at about 5 % of energy, total sugar 10 %
  - added fat at about 15 % of energy, total fat 30 %
  - The rules are still a draft. When they're final there's a 365-day implementation period.
  - The lab should show a "FOP risk" flag when a recipe crosses those levels. Keep them as editable config.
- Allergen declaration: milk, tree nuts (almond, pistachio), soy if used.
- Packaged-food label fields to plan for: FSSAI licence number, veg logo, net quantity, MRP (Legal Metrology), best-before, batch number, manufacturer address, nutrition per 100 g and per serving.

## Data protection (India DPDP Act, 2023) — basics

- A purpose statement on each form, consent that is unticked by default, and a separate WhatsApp opt-in.
- A delete-on-request flow (`/privacy/delete`). Export is admin-only.
- Keep IPs hashed with a salt, never raw.
- No PII in logs, analytics or AI prompts.
