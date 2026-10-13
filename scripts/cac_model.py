#!/usr/bin/env python3
"""Monte Carlo CAC, contribution and 6-month LTV per channel.

Every input is [low, mid, high] and is sampled from a triangular distribution.
Prices are per serving, before platform commission, net of GST; order value = price x servings.
A break-even repeat rate above 100% means no realistic repeat rate makes the channel pay back.

  CAC          = (fixed + sampling + spend + hours x hourly_value) / new_customers
  new_customers = reach x conversion            (or spend / cpc x conversion when cpc_inr is set)
  contribution = price_per_serving x servings x (1 - commission) - servings x unit_cost - variable_cost_per_order
  LTV_6m       = contribution + repeat_rate x orders_per_repeater x repeat_contribution
  break-even repeat rate = (CAC - contribution) / (orders_per_repeater x repeat_contribution)

Usage:
  python3 scripts/cac_model.py --template > data/economics/cac_inputs.json
  python3 scripts/cac_model.py data/economics/cac_inputs.json --runs 5000 --out data/economics/
"""
import argparse, csv, json, os, random, statistics, sys

TEMPLATE = {
    "_note": "ALL VALUES ARE E4 PLACEHOLDERS. Replace each range with sourced numbers and set its grade. Ranges are [low, mid, high].",
    "global": {
        "unit_cost_inr_per_serving": {"v": [40, 45, 55], "grade": "E4", "source": "founder estimate"},
        "repeat_rate_6m": {"v": [0.10, 0.25, 0.45], "grade": "E4", "source": "MISSING: no repeat data yet"},
        "orders_per_repeater_6m": {"v": [1, 2, 4], "grade": "E4", "source": "MISSING"},
        "repeat_commission_pct": {"v": [0, 0, 0.05], "grade": "E4", "source": "assumes repeats come via WhatsApp"},
        "hourly_value_inr": {"v": [0, 0, 0], "grade": "E4", "source": "set >0 to cost founder time"}
    },
    "channels": {
        "flea_market": {
            "period": "one market day",
            "fixed_cost_inr": {"v": [1500, 3000, 6000], "grade": "E4", "source": "MISSING: organiser stall fees"},
            "sampling_cost_inr": {"v": [300, 600, 1200], "grade": "E4", "source": "MISSING"},
            "hours": {"v": [8, 10, 12], "grade": "E4", "source": "estimate incl. setup"},
            "reach": {"v": [200, 500, 1000], "grade": "E4", "source": "MISSING: footfall past stall"},
            "conversion": {"v": [0.02, 0.05, 0.10], "grade": "E4", "source": "MISSING"},
            "price_per_serving_inr": {"v": [78, 90, 99], "grade": "E4", "source": "hypothesis: 99 single, 83 three-pack, 78 week box"},
            "servings_per_order": {"v": [1, 1.5, 3], "grade": "E4", "source": "MISSING"},
            "variable_cost_per_order_inr": {"v": [5, 10, 15], "grade": "E4", "source": "bag, UPI, napkin"},
            "commission_pct": {"v": [0, 0, 0], "grade": "E4", "source": "none"}
        },
        "instagram_organic_whatsapp": {
            "period": "one month",
            "fixed_cost_inr": {"v": [0, 1000, 3000], "grade": "E4", "source": "props, samples for creators"},
            "sampling_cost_inr": {"v": [500, 1500, 3000], "grade": "E4", "source": "MISSING"},
            "hours": {"v": [15, 30, 50], "grade": "E4", "source": "content + DMs"},
            "reach": {"v": [2000, 8000, 25000], "grade": "E4", "source": "MISSING: monthly reach"},
            "conversion": {"v": [0.002, 0.005, 0.012], "grade": "E4", "source": "MISSING"},
            "price_per_serving_inr": {"v": [78, 83, 99], "grade": "E4", "source": "hypothesis: 99 single, 83 three-pack, 78 week box"},
            "servings_per_order": {"v": [3, 4, 7], "grade": "E4", "source": "MISSING"},
            "variable_cost_per_order_inr": {"v": [40, 60, 90], "grade": "E4", "source": "local delivery + packaging"},
            "commission_pct": {"v": [0, 0.02, 0.02], "grade": "E4", "source": "payment gateway"}
        },
        "meta_ads": {
            "period": "one month",
            "spend_inr": {"v": [5000, 10000, 20000], "grade": "E4", "source": "test budget"},
            "cpc_inr": {"v": [5, 10, 20], "grade": "E4", "source": "MISSING: benchmark"},
            "conversion": {"v": [0.005, 0.015, 0.03], "grade": "E4", "source": "click to order, MISSING"},
            "hours": {"v": [5, 10, 15], "grade": "E4", "source": "estimate"},
            "price_per_serving_inr": {"v": [78, 83, 99], "grade": "E4", "source": "hypothesis: 99 single, 83 three-pack, 78 week box"},
            "servings_per_order": {"v": [3, 4, 7], "grade": "E4", "source": "MISSING"},
            "variable_cost_per_order_inr": {"v": [40, 60, 90], "grade": "E4", "source": "delivery + packaging"},
            "commission_pct": {"v": [0.02, 0.02, 0.02], "grade": "E4", "source": "payment gateway"}
        },
        "quick_commerce": {
            "period": "one month",
            "fixed_cost_inr": {"v": [5000, 15000, 40000], "grade": "E4", "source": "MISSING: listing, distributor, in-app ads"},
            "reach": {"v": [2000, 10000, 40000], "grade": "E4", "source": "MISSING: impressions"},
            "conversion": {"v": [0.002, 0.006, 0.015], "grade": "E4", "source": "MISSING"},
            "hours": {"v": [5, 10, 20], "grade": "E4", "source": "estimate"},
            "price_per_serving_inr": {"v": [83, 99, 99], "grade": "E4", "source": "hypothesis: 99 single, 83 three-pack, 78 week box"},
            "servings_per_order": {"v": [1, 3, 3], "grade": "E4", "source": "MISSING"},
            "variable_cost_per_order_inr": {"v": [10, 20, 30], "grade": "E4", "source": "packaging + freight to dark store"},
            "commission_pct": {"v": [0.25, 0.35, 0.45], "grade": "E4", "source": "MISSING: platform + distributor margin"}
        }
    }
}

COST_KEYS = ["fixed_cost_inr", "sampling_cost_inr", "spend_inr"]


def tri(r, rng):
    lo, mid, hi = r
    return lo if lo == hi else rng.triangular(lo, hi, mid)


def val(spec, key, rng=None, mode="sample"):
    if key not in spec:
        return 0.0
    r = spec[key]["v"]
    return {"lo": r[0], "mid": r[1], "hi": r[2]}.get(mode) if mode != "sample" else tri(r, rng)


def one(g, ch, rng=None, mode="sample", override=None):
    def V(spec, k):
        if override and override[0] is spec and override[1] == k:
            return override[2]
        return val(spec, k, rng, mode)
    cost = sum(V(ch, k) for k in COST_KEYS) + V(ch, "hours") * V(g, "hourly_value_inr")
    if "cpc_inr" in ch:
        cpc = V(ch, "cpc_inr")
        visitors = V(ch, "spend_inr") / cpc if cpc else 0
    else:
        visitors = V(ch, "reach")
    customers = visitors * V(ch, "conversion")
    unit = V(g, "unit_cost_inr_per_serving")
    serv, var = V(ch, "servings_per_order"), V(ch, "variable_cost_per_order_inr")
    aov = V(ch, "price_per_serving_inr") * serv
    contrib = aov * (1 - V(ch, "commission_pct")) - serv * unit - var
    rep_contrib = aov * (1 - V(g, "repeat_commission_pct")) - serv * unit - var
    rr, opr = V(g, "repeat_rate_6m"), V(g, "orders_per_repeater_6m")
    cac = cost / customers if customers > 0 else float("inf")
    ltv = contrib + rr * opr * rep_contrib
    be = (cac - contrib) / (opr * rep_contrib) if opr * rep_contrib > 0 and cac != float("inf") else float("inf")
    return {"customers": customers, "cac": cac, "contribution": contrib, "ltv_6m": ltv,
            "ltv_to_cac": ltv / cac if cac not in (0, float("inf")) else 0.0,
            "payback_orders": cac / contrib if contrib > 0 else float("inf"),
            "breakeven_repeat_rate": max(0.0, be)}


def pct(xs, p):
    xs = sorted(x for x in xs if x != float("inf"))
    if not xs:
        return float("inf")
    return xs[min(len(xs) - 1, int(p * len(xs)))]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inputs", nargs="?")
    ap.add_argument("--template", action="store_true")
    ap.add_argument("--runs", type=int, default=5000)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--out", default="data/economics/")
    a = ap.parse_args()
    if a.template:
        print(json.dumps(TEMPLATE, indent=2)); return
    if not a.inputs:
        sys.exit("give an inputs file or --template")
    cfg = json.load(open(a.inputs))
    g, chans = cfg["global"], cfg["channels"]
    rng = random.Random(a.seed)
    os.makedirs(a.out, exist_ok=True)

    results, sens = [], []
    for name, ch in chans.items():
        sims = [one(g, ch, rng) for _ in range(a.runs)]
        row = {"channel": name, "period": ch.get("period", "")}
        for m in ["customers", "cac", "contribution", "ltv_6m", "ltv_to_cac", "payback_orders", "breakeven_repeat_rate"]:
            xs = [s[m] for s in sims]
            row[f"{m}_p10"], row[f"{m}_p50"], row[f"{m}_p90"] = (round(pct(xs, q), 2) for q in (0.1, 0.5, 0.9))
        row["share_runs_ltv_gt_cac"] = round(sum(1 for s in sims if s["ltv_to_cac"] > 1) / a.runs, 3)
        e4 = [k for spec in (g, ch) for k, v in spec.items() if isinstance(v, dict) and v.get("grade") == "E4"]
        row["e4_inputs"] = len(e4)
        results.append(row)

        base = one(g, ch, mode="mid")["ltv_to_cac"]
        for spec, label in ((g, "global"), (ch, name)):
            for k, v in spec.items():
                if not isinstance(v, dict) or "v" not in v or v["v"][0] == v["v"][2]:
                    continue
                lo = one(g, ch, mode="mid", override=(spec, k, v["v"][0]))["ltv_to_cac"]
                hi = one(g, ch, mode="mid", override=(spec, k, v["v"][2]))["ltv_to_cac"]
                sens.append({"channel": name, "input": f"{label}.{k}", "ltv_to_cac_at_low": round(lo, 3),
                             "ltv_to_cac_at_mid": round(base, 3), "ltv_to_cac_at_high": round(hi, 3),
                             "swing": round(abs(hi - lo), 3), "grade": v.get("grade", "")})

    sens.sort(key=lambda r: (r["channel"], -r["swing"]))
    for fname, rows in (("cac_results.csv", results), ("cac_sensitivity.csv", sens)):
        with open(os.path.join(a.out, fname), "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader(); w.writerows(rows)

    print(f"{'channel':28} {'CAC p10/p50/p90 (INR)':>26} {'LTV:CAC p50':>12} {'P(LTV>CAC)':>11} {'BE repeat':>10}")
    for r in results:
        cac = f"{r['cac_p10']:.0f}/{r['cac_p50']:.0f}/{r['cac_p90']:.0f}"
        print(f"{r['channel']:28} {cac:>26} {r['ltv_to_cac_p50']:>12.2f} {r['share_runs_ltv_gt_cac']:>11.0%} {r['breakeven_repeat_rate_p50']:>10.0%}")
    print("\nTop driver per channel:")
    for name in chans:
        top = next(s for s in sens if s["channel"] == name)
        print(f"  {name}: {top['input']} (swing {top['swing']}, grade {top['grade']})")
    print(f"\nwrote cac_results.csv and cac_sensitivity.csv to {a.out}")


if __name__ == "__main__":
    main()
