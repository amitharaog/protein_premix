#!/usr/bin/env python3
"""Keyword finder: Google (India), YouTube and Amazon.in autocomplete, optional Google Trends.

Autocomplete only returns phrases that enough people type, so a hit means searches happen.
It does not give volume. For volume, export Google Keyword Planner to data/keywords/keyword_planner.csv.

Usage:
  python3 scripts/keywords.py --seeds "protein brownie" "protein cake" --expand --out data/keywords/
"""
import argparse, csv, datetime, json, os, string, sys, time, urllib.parse, urllib.request

UA = "Mozilla/5.0 (keyword-research script; contact: owner of this repo)"
TODAY = datetime.date.today().isoformat()


def get_json(url, timeout=10):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en-IN,en;q=0.9"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        raw = r.read().decode("utf-8", errors="replace")
    return json.loads(raw)


def google(q):
    url = "https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=in&q=" + urllib.parse.quote(q)
    data = get_json(url)
    return data[1] if isinstance(data, list) and len(data) > 1 else []


def youtube(q):
    url = "https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&hl=en&gl=in&q=" + urllib.parse.quote(q)
    data = get_json(url)
    return data[1] if isinstance(data, list) and len(data) > 1 else []


def amazon_in(q):
    # A21TJRUUN4KGV is the Amazon.in marketplace id
    url = ("https://completion.amazon.in/api/2017/suggestions?limit=11&prefix=" + urllib.parse.quote(q)
           + "&suggestion-type=KEYWORD&page-type=Gateway&alias=aps&site-variant=desktop&mid=A21TJRUUN4KGV&lop=en_IN")
    data = get_json(url)
    return [s.get("value", "") for s in data.get("suggestions", []) if s.get("value")]


SOURCES = {"google_in": google, "youtube_in": youtube, "amazon_in": amazon_in}

BUY = ["mix", "premix", "buy", "price", "online", "near me", "amazon", "blinkit", "zepto", "brand", "pack", "ready"]
MAKE = ["recipe", "how to", "without", "at home", "homemade", "eggless", "microwave", "air fryer", "oven", "cooker"]
PROBLEM = ["dry", "rubbery", "bitter", "chalky", "healthy", "low sugar", "sugar free", "low calorie", "keto"]
ADJ = ["bar", "atta", "bread", "powder", "shake", "chips", "cookies"]


def cluster(phrase):
    p = phrase.lower()
    if any(k in p for k in BUY):
        return "buy"
    if any(k in p for k in MAKE):
        return "make"
    if any(k in p for k in PROBLEM):
        return "problem"
    if any(k in p for k in ADJ):
        return "adjacent"
    return "other"


def strength(source):
    return {"amazon_in": "medium"}.get(source, "low")


def trends(seeds, out):
    try:
        from pytrends.request import TrendReq
    except ImportError:
        print("[trends] pytrends not installed; skipping (pip install pytrends)", file=sys.stderr)
        return
    try:
        py = TrendReq(hl="en-IN", tz=330)
        rows = []
        for i in range(0, len(seeds), 5):
            batch = seeds[i:i + 5]
            py.build_payload(batch, timeframe="today 5-y", geo="IN")
            df = py.interest_over_time()
            if df.empty:
                continue
            for ts, r in df.iterrows():
                for kw in batch:
                    rows.append({"date": ts.date().isoformat(), "keyword": kw, "interest": int(r[kw])})
            time.sleep(2)
        path = os.path.join(out, "trends_in_5y.csv")
        with open(path, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=["date", "keyword", "interest"])
            w.writeheader(); w.writerows(rows)
        print(f"[trends] wrote {len(rows)} rows to {path}")
    except Exception as e:  # Trends rate-limits often
        print(f"[trends] failed: {e}", file=sys.stderr)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", nargs="+", required=True)
    ap.add_argument("--expand", action="store_true", help="also query seed + a..z")
    ap.add_argument("--sources", nargs="+", default=list(SOURCES))
    ap.add_argument("--delay", type=float, default=0.4)
    ap.add_argument("--no-trends", action="store_true")
    ap.add_argument("--out", default="data/keywords/")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)

    seen, rows, errors = set(), [], {}
    for seed in a.seeds:
        queries = [seed] + ([f"{seed} {c}" for c in string.ascii_lowercase] if a.expand else [])
        for src in a.sources:
            fn = SOURCES[src]
            if errors.get(src, 0) >= 5:
                continue
            for q in queries:
                try:
                    sugg = fn(q)
                except Exception as e:
                    errors[src] = errors.get(src, 0) + 1
                    print(f"[{src}] {q!r}: {e}", file=sys.stderr)
                    if errors[src] >= 5:
                        print(f"[{src}] too many errors, skipping this source", file=sys.stderr)
                        break
                    continue
                for s in sugg:
                    key = (src, s.lower().strip())
                    if key in seen:
                        continue
                    seen.add(key)
                    rows.append({"date_captured": TODAY, "source": src, "seed": seed, "query": q,
                                 "suggestion": s.strip(), "cluster": cluster(s),
                                 "has_protein": "protein" in s.lower(), "grade": "E1",
                                 "strength": strength(src)})
                time.sleep(a.delay)

    path = os.path.join(a.out, "suggestions.csv")
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()) if rows else
                           ["date_captured", "source", "seed", "query", "suggestion", "cluster", "has_protein", "grade", "strength"])
        w.writeheader(); w.writerows(rows)

    summary = {}
    for r in rows:
        k = f"{r['source']}|{r['cluster']}|protein={r['has_protein']}"
        summary[k] = summary.get(k, 0) + 1
    with open(os.path.join(a.out, "summary.json"), "w") as f:
        json.dump({"date": TODAY, "total": len(rows), "errors": errors, "counts": summary}, f, indent=2)
    print(f"wrote {len(rows)} suggestions to {path}; source errors: {errors or 'none'}")

    if not a.no_trends:
        trends([s for s in a.seeds if "protein" in s][:10], a.out)


if __name__ == "__main__":
    main()
