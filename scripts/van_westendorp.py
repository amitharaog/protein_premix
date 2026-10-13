#!/usr/bin/env python3
"""Van Westendorp price sensitivity from a survey CSV (for example a Google Form export).

Finds the four price columns by header text: "too cheap", "bargain", "getting expensive", "too expensive".
Drops inconsistent answers (must be too_cheap <= bargain <= expensive <= too_expensive).

Usage: python3 scripts/van_westendorp.py data/economics/survey/responses.csv [--out data/economics/survey/]
"""
import argparse, csv, json, os, re, sys


def find_cols(headers):
    h = [x.lower() for x in headers]
    def pick(test):
        for i, x in enumerate(h):
            if test(x):
                return headers[i]
        return None
    cols = {
        "too_cheap": pick(lambda x: "too cheap" in x or "too_cheap" in x),
        "bargain": pick(lambda x: "bargain" in x or "good value" in x),
        "too_expensive": pick(lambda x: "too expensive" in x or "too_expensive" in x),
    }
    cols["expensive"] = pick(lambda x: ("expensive" in x and "too" not in x) or "getting expensive" in x)
    missing = [k for k, v in cols.items() if not v]
    if missing:
        sys.exit(f"could not find columns for: {missing}. Headers were: {headers}")
    return cols


def num(v):
    m = re.search(r"\d+(\.\d+)?", (v or "").replace(",", ""))
    return float(m.group()) if m else None


def crossing(grid, a, b):
    """First price where curve a minus curve b changes sign."""
    for i in range(1, len(grid)):
        d0, d1 = a[i - 1] - b[i - 1], a[i] - b[i]
        if d0 == 0:
            return grid[i - 1]
        if d0 * d1 < 0:
            t = d0 / (d0 - d1)
            return round(grid[i - 1] + t * (grid[i] - grid[i - 1]), 1)
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv")
    ap.add_argument("--out", default=None)
    a = ap.parse_args()
    out = a.out or os.path.dirname(a.csv) or "."
    rows = list(csv.DictReader(open(a.csv, newline="", encoding="utf-8-sig")))
    if not rows:
        sys.exit("no rows")
    c = find_cols(list(rows[0].keys()))

    good, dropped = [], 0
    for r in rows:
        v = [num(r[c[k]]) for k in ("too_cheap", "bargain", "expensive", "too_expensive")]
        if None in v or not (v[0] <= v[1] <= v[2] <= v[3]):
            dropped += 1
            continue
        good.append(v)
    n = len(good)
    if n == 0:
        sys.exit(f"no consistent responses ({dropped} dropped)")

    lo, hi = min(x[0] for x in good), max(x[3] for x in good)
    step = max(1.0, round((hi - lo) / 200, 1))
    grid, p = [], lo
    while p <= hi + step:
        grid.append(round(p, 2)); p += step

    share = lambda f: [sum(1 for x in good if f(x, g)) / n for g in grid]
    too_cheap = share(lambda x, g: x[0] >= g)        # falls as price rises
    cheap = share(lambda x, g: x[1] >= g)
    expensive = share(lambda x, g: x[2] <= g)        # rises as price rises
    too_exp = share(lambda x, g: x[3] <= g)
    not_cheap = [1 - v for v in cheap]
    not_exp = [1 - v for v in expensive]

    res = {
        "n_used": n, "n_dropped_inconsistent": dropped,
        "directional_only": n < 30,
        "point_of_marginal_cheapness": crossing(grid, too_cheap, not_cheap),
        "optimal_price_point": crossing(grid, too_cheap, too_exp),
        "indifference_price_point": crossing(grid, cheap, expensive),
        "point_of_marginal_expensiveness": crossing(grid, too_exp, not_exp),
        "median_answers": {k: sorted(x[i] for x in good)[n // 2]
                           for i, k in enumerate(["too_cheap", "bargain", "expensive", "too_expensive"])},
    }
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, "van_westendorp_curves.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["price", "too_cheap", "cheap", "not_cheap", "expensive", "not_expensive", "too_expensive"])
        for i, g in enumerate(grid):
            w.writerow([g] + [round(v[i], 4) for v in (too_cheap, cheap, not_cheap, expensive, not_exp, too_exp)])
    with open(os.path.join(out, "van_westendorp_result.json"), "w") as f:
        json.dump(res, f, indent=2)
    print(json.dumps(res, indent=2))


if __name__ == "__main__":
    main()
