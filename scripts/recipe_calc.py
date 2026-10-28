#!/usr/bin/env python3
"""Gram maths for the recipe-builder agent: match a pantry to known recipes, then weigh, scale and check one.

All nutrition is an estimate (E4) from data/formulation/nutrition.csv, never a lab value.
Costs use retail prices from data/formulation/seed/ingredients_catalog.json; unknown prices show as MISSING.
Checks come from data/formulation/seed/formulation_notes.json (Tips 1, 2, 7, 8, 9).

Usage:
  python3 scripts/recipe_calc.py ids
  python3 scripts/recipe_calc.py match --have "whey, almond flour, cocoa, erythritol, baking powder"
  python3 scripts/recipe_calc.py match --pantry data/formulation/pantry.csv
  python3 scripts/recipe_calc.py calc --slug classic-chocolate-fudge-mug-cake --servings 10
  python3 scripts/recipe_calc.py calc --file data/formulation/suggestions/2026-10-28_x.json --scale-total 55 --pantry data/formulation/pantry.csv

Recipe file shape: {"name": "...", "items": [{"id": "wpc80", "grams": 9}, ...], "liquid": {"id": "milk_toned", "ml": 55}}
Pantry file shape (CSV): ingredient,grams_on_hand   (grams_on_hand may be blank: "have some, amount unknown")
"""
import argparse, csv, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FORM = os.path.join(ROOT, "data", "formulation")
SEED = os.path.join(FORM, "seed")

PROTEIN_RDA_G = 54  # ICMR-NIN 2020, per the build kit's COMPLIANCE.md
WHEY = {"wpc80", "wpi90"}
WATER_HOLDING = {"casein", "mpc70", "smp"}
STRUCTURAL_KINDS = {"protein", "flour", "leavening", "binder"}
REF_SERVE_G = 55  # Tips 7 and 8 are written per 50-60 g of mix
WET = {"milk_toned", "water", "egg", "ghee", "oil"}  # added at home, so outside the dry-mix ratios

ALIASES = {
    "whey": "wpc80", "whey protein": "wpc80", "whey concentrate": "wpc80", "wpc": "wpc80",
    "whey isolate": "wpi90", "wpi": "wpi90", "isolate": "wpi90",
    "casein": "casein", "micellar casein": "casein", "mpc": "mpc70", "milk protein": "mpc70",
    "milk powder": "smp", "skimmed milk powder": "smp", "skim milk powder": "smp",
    "pea protein": "pea", "rice protein": "rice_protein", "soy protein": "soy_isolate",
    "almond flour": "almond_flour", "almond powder": "almond_flour", "badam powder": "almond_flour",
    "rice flour": "rice_flour", "jowar": "jowar_flour", "ragi": "ragi_flour", "nachni": "ragi_flour",
    "oats": "oat_flour", "oat flour": "oat_flour", "chickpea flour": "besan", "gram flour": "besan",
    "cocoa": "cocoa", "cocoa powder": "cocoa", "chocolate chips": "choc_chips", "dark chocolate": "choc_chips",
    "isabgol": "psyllium", "psyllium": "psyllium", "xanthan": "xanthan",
    "baking powder": "baking_powder", "baking soda": "baking_soda", "soda": "baking_soda",
    "elaichi": "cardamom", "kesar": "saffron", "jaiphal": "nutmeg", "dalchini": "cinnamon",
    "coffee": "coffee", "instant coffee": "coffee", "gud": "jaggery", "jaggery": "jaggery",
    "pista": "pistachio", "strawberry powder": "fd_strawberry", "beet": "beetroot",
    "creamer": "fat_powder", "coconut milk powder": "coconut_milk_powder",
    "milk": "milk_toned", "oil": "oil", "ghee": "ghee", "sugar": "sugar", "egg": "egg", "eggs": "egg",
}


def load_nutrition():
    with open(os.path.join(FORM, "nutrition.csv"), newline="", encoding="utf-8") as f:
        rows = {}
        for r in csv.DictReader(f):
            for k in ("protein_g", "fat_g", "carbs_g", "kcal"):
                r[k] = float(r[k])
            rows[r["id"]] = r
        return rows


def load_json(name):
    with open(os.path.join(SEED, name), encoding="utf-8") as f:
        return json.load(f)


def price_per_g(catalog):
    """Chosen option if it has a price, else the cheapest priced option. Returns {id: (inr_per_g, label)}."""
    out = {}
    for doc in catalog:
        priced = [o for o in doc["options"] if o.get("price_inr") and o.get("pack_g")]
        if not priced:
            continue
        chosen = doc["options"][doc.get("chosen", 0)] if doc["options"] else None
        if chosen in priced:
            o, how = chosen, "chosen"
        else:
            o, how = min(priced, key=lambda o: o["price_inr"] / o["pack_g"]), "cheapest priced"
        out[doc["id"]] = (o["price_inr"] / o["pack_g"], f'{o["site"]}, {how}, {o["price_type"]}')
    return out


def resolve(name, nutrition):
    """Map free text ("Elaichi powder", "whey") to an ingredient id, or None."""
    t = re.sub(r"[^a-z0-9 _]", " ", name.lower()).strip()
    t = re.sub(r"\s+", " ", t)
    if t in nutrition:
        return t
    if t.replace(" ", "_") in nutrition:
        return t.replace(" ", "_")
    for alias in sorted(ALIASES, key=len, reverse=True):
        if alias == t or re.search(rf"\b{re.escape(alias)}\b", t):
            return ALIASES[alias]
    for i, r in nutrition.items():
        if t and t in r["name"].lower():
            return i
    return None


def read_pantry(args, nutrition):
    """Returns ({id: grams or None}, [unmapped names])."""
    have, unmapped = {}, []
    entries = []
    if args.have:
        entries += [(x.strip(), "") for x in args.have.split(",") if x.strip()]
    if args.pantry:
        with open(args.pantry, newline="", encoding="utf-8") as f:
            for r in csv.reader(f):
                if not r or r[0].strip().lower() in ("ingredient", "id", ""):
                    continue
                entries.append((r[0].strip(), r[1].strip() if len(r) > 1 else ""))
    for name, grams in entries:
        i = resolve(name, nutrition)
        if not i:
            unmapped.append(name)
            continue
        g = float(re.sub(r"[^0-9.]", "", grams)) if re.search(r"\d", grams) else None
        if i in have and have[i] is not None and g is not None:
            g += have[i]
        have[i] = g if g is not None else have.get(i)
    return have, unmapped


def merge_items(items):
    merged = {}
    for it in items:
        merged[it["id"]] = merged.get(it["id"], 0) + float(it["grams"])
    return merged


def fmt_g(g):
    if g >= 10:
        return f"{g:.1f}"
    if g >= 1:
        return f"{g:.2f}"
    return f"{g:.3f}"


def cmd_ids(args):
    nut = load_nutrition()
    for i, r in nut.items():
        print(f"{i:22} {r['kind']:10} {r['name']}")


def cmd_match(args):
    nut = load_nutrition()
    have, unmapped = read_pantry(args, nut)
    if not have:
        sys.exit("No ingredients given. Use --have or --pantry.")
    results = []
    for rec in load_json("recipes.json"):
        items = merge_items(rec["items"])
        missing = [i for i in items if i not in have]
        structural = [i for i in missing if nut.get(i, {}).get("kind") in STRUCTURAL_KINDS]
        known = {i: have[i] / g for i, g in items.items() if i in have and have[i] is not None and g > 0}
        limit = min(known, key=known.get) if known else None
        results.append({
            "slug": rec["slug"], "name": rec["name"], "total_g": rec["total_g"], "protein_g_est": rec["protein_g"],
            "coverage_pct": round(100 * (len(items) - len(missing)) / len(items)),
            "missing_structural": structural, "missing_minor": [i for i in missing if i not in structural],
            "servings_from_stock": int(known[limit]) if limit else None, "limited_by": limit,
        })
    results.sort(key=lambda r: (len(r["missing_structural"]), len(r["missing_minor"]), -r["coverage_pct"]))
    if args.json:
        print(json.dumps({"have": have, "unmapped": unmapped, "recipes": results}, indent=1))
        return
    print("Mapped pantry:", ", ".join(f"{i}={fmt_g(g) + ' g' if g is not None else 'some'}" for i, g in have.items()))
    if unmapped:
        print("Not recognised (add to nutrition.csv or rename):", ", ".join(unmapped))
    print()
    print(f"{'recipe':44} {'cover':>5}  {'serves':>6} {'limited by':14} missing (structural | minor)")
    for r in results:
        s = r["servings_from_stock"]
        print(f"{r['name'][:44]:44} {r['coverage_pct']:>4}%  {('-' if s is None else s):>6} {r['limited_by'] or '-':14} "
              f"{', '.join(r['missing_structural']) or '-'} | {', '.join(r['missing_minor']) or '-'}")
    print("\nserves = servings the ingredients you gave amounts for can cover; missing items and 'some' amounts are not counted."
          "\nProtein figures in recipes.json are estimates (E4).")


def check(items, nut, dry_total):
    """Formulation-note checks. Returns list of (level, message)."""
    out = []
    by_kind = {}
    for i, g in items.items():
        by_kind.setdefault(nut[i]["kind"], 0)
        by_kind[nut[i]["kind"]] += g
    scale = REF_SERVE_G / dry_total if dry_total else 1
    powder = by_kind.get("protein", 0)
    share = 100 * powder / dry_total if dry_total else 0
    if share > 50:
        out.append(("FAIL", f"Protein powders are {share:.0f}% of dry mix; above ~50% it turns rubbery (Tip 1, f6)."))
    elif share > 45:
        out.append(("WARN", f"Protein powders are {share:.0f}% of dry mix; notes say keep at or under 45% (Tip 1)."))
    flour = by_kind.get("flour", 0)
    fshare = 100 * flour / dry_total if dry_total else 0
    if not 25 <= fshare <= 40:
        out.append(("NOTE", f"Flours are {fshare:.0f}% of dry mix; notes target 30-35% (f6)."))
    whey_p = sum(items[i] * nut[i]["protein_g"] / 100 for i in items if i in WHEY)
    hold_p = sum(items[i] * nut[i]["protein_g"] / 100 for i in items if i in WATER_HOLDING)
    if whey_p and (whey_p + hold_p) and hold_p / (whey_p + hold_p) < 0.35:
        out.append(("WARN", f"Water-holding protein (casein/MPC/SMP) is {100 * hold_p / (whey_p + hold_p):.0f}% of powder protein; "
                            "notes say at least 35-40% or whey dries out (Tip 2)."))
    bp = items.get("baking_powder", 0) * scale
    if not 1.8 <= bp <= 2.8:
        out.append(("WARN", f"Baking powder is {bp:.1f} g per {REF_SERVE_G} g mix; notes say 2-2.5 g (Tip 7)."))
    if any(i in items for i in ("cocoa", "fd_strawberry", "orange_powder")) and "baking_soda" not in items:
        out.append(("NOTE", "Cocoa or fruit present without baking soda; notes add 0.2 g soda (Tip 7)."))
    if items.get("psyllium", 0) * scale > 1.5 or items.get("xanthan", 0) * scale > 0.2:
        out.append(("WARN", "Psyllium over 1.5 g or xanthan over 0.2 g per 55 g mix turns gummy (Tip 8)."))
    if items.get("erythritol", 0) > 12:
        out.append(("WARN", f"Erythritol {items['erythritol']:.1f} g per serving; notes cap at 12 g (Tip 9)."))
    if items.get("stevia", 0) > 0.06:
        out.append(("WARN", f"Stevia {items['stevia']:.3f} g per serving; above 0.05 g turns bitter (Tip 9)."))
    if "allulose" in items:
        out.append(("FLAG", "Allulose: FSSAI ingredient status unclear (catalog note). Fine for kitchen trials only."))
    if any(nut[i]["kind"] == "egg" for i in items):
        out.append(("FLAG", "Contains egg: conflicts with the vegetarian, no-egg hypothesis in CLAUDE.md."))
    return out


def totals(items, nut):
    t = {"grams": 0, "protein_g": 0, "fat_g": 0, "carbs_g": 0, "kcal": 0}
    for i, g in items.items():
        t["grams"] += g
        for k in ("protein_g", "fat_g", "carbs_g", "kcal"):
            t[k] += g * nut[i][k] / 100
    return t


def claim(protein_g, total_g, kcal):
    per100g = 100 * protein_g / total_g if total_g else 0
    per100kcal = 100 * protein_g / kcal if kcal else 0
    if per100g >= 0.20 * PROTEIN_RDA_G or per100kcal >= 0.10 * PROTEIN_RDA_G:
        c = "high"
    elif per100g >= 0.10 * PROTEIN_RDA_G or per100kcal >= 0.05 * PROTEIN_RDA_G:
        c = "source"
    else:
        c = "none"
    return {"claim": c, "protein_per_100g": round(per100g, 1), "protein_per_100kcal": round(per100kcal, 1)}


def cmd_calc(args):
    nut = load_nutrition()
    if args.slug:
        rec = next((r for r in load_json("recipes.json") if r["slug"] == args.slug), None)
        if not rec:
            sys.exit(f"No recipe with slug {args.slug}. Run 'match' to list slugs.")
        est = next((e for e in load_json("recipe_estimates.json") if e["name"] == rec["name"]), {})
        if est.get("liquid") and "liquid" not in rec:
            rec["liquid_text"] = est["liquid"]
    else:
        with open(args.file, encoding="utf-8") as f:
            rec = json.load(f)
    items = merge_items(rec["items"])
    unknown = [i for i in items if i not in nut]
    if unknown:
        sys.exit(f"No nutrition row for: {unknown}. Add them to data/formulation/nutrition.csv first (grade E4, source).")
    dry = sum(g for i, g in items.items() if i not in WET)
    if args.scale_total:
        f = args.scale_total / dry
        items = {i: g * f for i, g in items.items()}
        dry = args.scale_total
    n = args.servings
    prices = price_per_g(load_json("ingredients_catalog.json"))
    have, unmapped = read_pantry(args, nut) if (args.pantry or args.have) else ({}, [])

    rows, cost, cost_missing, short = [], 0.0, [], []
    for i, g in sorted(items.items(), key=lambda x: -x[1]):
        p = prices.get(i)
        c = g * p[0] if p else None
        if c is None:
            cost_missing.append(i)
        else:
            cost += c
        stock = None
        if have:
            if i not in have:
                stock = "missing"
            elif have[i] is None:
                stock = "amount unknown"
            else:
                stock = "ok" if have[i] >= g * n else f"short {fmt_g(g * n - have[i])} g"
            if stock not in ("ok", "amount unknown"):
                short.append(i)
        rows.append({"id": i, "name": nut[i]["name"], "g_per_serving": round(g, 3), "g_batch": round(g * n, 3),
                     "protein_g": round(g * nut[i]["protein_g"] / 100, 2),
                     "cost_inr": None if c is None else round(c, 2), "stock": stock})

    dry_items = {i: g for i, g in items.items() if i not in WET}
    wet_items = {i: g for i, g in items.items() if i in WET}
    t = totals(dry_items, nut)
    prepared = None
    liquid = rec.get("liquid")
    if liquid and liquid.get("id") in nut:
        wet_items[liquid["id"]] = wet_items.get(liquid["id"], 0) + float(liquid["ml"])
    if wet_items:
        wt = totals(wet_items, nut)
        prepared = {k: t[k] + wt[k] for k in t}
    result = {
        "name": rec.get("name", "unnamed"), "servings": n, "dry_mix_g_per_serving": round(dry, 2),
        "per_serving_dry": {k: round(v, 1) for k, v in t.items()},
        "per_serving_prepared": None if not prepared else {k: round(v, 1) for k, v in prepared.items()},
        "liquid": liquid or rec.get("liquid_text"),
        "fssai_dry_mix": claim(t["protein_g"], t["grams"], t["kcal"]),
        "fssai_prepared": None if not prepared else claim(prepared["protein_g"], prepared["grams"], prepared["kcal"]),
        "cost_inr_per_serving_retail": round(cost, 2), "cost_missing_for": cost_missing,
        "items": rows, "checks": [{"level": l, "msg": m} for l, m in check(dry_items, nut, dry)] +
                  [{"level": "FLAG", "msg": "Contains egg: conflicts with the vegetarian, no-egg hypothesis in CLAUDE.md."}
                   for _ in [1] if "egg" in wet_items],
        "sub_gram_items": [r["id"] for r in rows if 0 < r["g_per_serving"] < 1],
        "pantry_short": short, "pantry_unmapped": unmapped, "grade": "E4",
    }
    if args.json:
        print(json.dumps(result, indent=1, ensure_ascii=False))
        return

    print(f"{result['name']}  |  {fmt_g(dry)} g dry mix per serving  |  batch of {n}")
    print(f"\n{'ingredient':40} {'g/serve':>9} {'g/batch':>9} {'protein':>8} {'₹/serve':>8}  stock")
    for r in rows:
        cs = "MISSING" if r["cost_inr"] is None else f"{r['cost_inr']:.2f}"
        print(f"{r['name'][:40]:40} {fmt_g(r['g_per_serving']):>9} {fmt_g(r['g_batch']):>9} "
              f"{r['protein_g']:>8.1f} {cs:>8}  {r['stock'] or ''}")
    d = result["per_serving_dry"]
    print(f"\nPer serving, dry mix (E4 estimate): {d['protein_g']} g protein, {d['kcal']:.0f} kcal, "
          f"{d['fat_g']} g fat, {d['carbs_g']} g carbs (total, incl. fibre and polyols)")
    if prepared:
        p = result["per_serving_prepared"]
        added = ", ".join(f"{fmt_g(g)} g {nut[i]['name']}" for i, g in wet_items.items())
        print(f"As prepared with {added}: {p['protein_g']} g protein, {p['kcal']:.0f} kcal")
    elif result["liquid"]:
        print(f"Liquid: {result['liquid']}")
    fd = result["fssai_dry_mix"]
    print(f"FSSAI protein claim on dry mix (internal only, needs lab test): {fd['claim']} "
          f"({fd['protein_per_100g']} g/100 g, {fd['protein_per_100kcal']} g/100 kcal)")
    print(f"Ingredient cost per serving at retail: ₹{cost:.2f}" +
          (f" + MISSING prices for {', '.join(cost_missing)}" if cost_missing else ""))
    if result["sub_gram_items"]:
        print(f"Under 1 g per serving ({', '.join(result['sub_gram_items'])}): weigh for the whole batch, "
              "or use a 0.01 g scale; a kitchen scale cannot weigh these per cup.")
    for c in result["checks"]:
        print(f"[{c['level']}] {c['msg']}")
    if short:
        print("Pantry short for this batch:", ", ".join(short))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("ids", help="list known ingredient ids")
    for name in ("match", "calc"):
        p = sub.add_parser(name)
        p.add_argument("--have", help='comma-separated ingredients, e.g. "whey, cocoa, almond flour"')
        p.add_argument("--pantry", help="CSV: ingredient,grams_on_hand")
        p.add_argument("--json", action="store_true")
        if name == "calc":
            g = p.add_mutually_exclusive_group(required=True)
            g.add_argument("--slug", help="a recipe slug from seed/recipes.json")
            g.add_argument("--file", help="a recipe JSON file")
            p.add_argument("--servings", type=int, default=1)
            p.add_argument("--scale-total", type=float, help="rescale every item so the dry mix weighs this many grams")
    args = ap.parse_args()
    {"ids": cmd_ids, "match": cmd_match, "calc": cmd_calc}[args.cmd](args)


if __name__ == "__main__":
    main()
