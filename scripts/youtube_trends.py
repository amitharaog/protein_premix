#!/usr/bin/env python3
"""Today's YouTube numbers for protein dessert search terms, from the official YouTube Data API v3. Standard library only.

For each search term in --terms (a file, one term per line, # for notes): videos published in the last --days days that YouTube shows for
India, ordered by views, then each video's views, likes, comments and views per day since it went up. Videos found by
several terms are listed once, with every term that found them.

  --trends   also Google Trends interest for the first five terms (India, last 90 days, web and YouTube search).
             Needs pytrends; Google often rate-limits it, which only means that file is left out.

Needs YOUTUBE_API_KEY (Google Cloud, YouTube Data API v3; free quota 10,000 units a day; each term costs about 101).
Without it, or when YouTube refuses, the output says MISSING and why, and the agent works from web search instead.
The key is never printed.

Writes to --out (default data/trends/; created if missing):
  youtube_today.json   {"date", "missing"?, "terms", "videos": [...], "per_term": {...}, "quota_used"}
  interest.csv         date,keyword,property,interest   (with --trends, when Google answers)

Usage: python3 scripts/youtube_trends.py --terms FILE [--out data/trends/] [--days 7] [--per-term 25] [--trends]
"""
import argparse, csv, json, os, sys, time, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = "https://www.googleapis.com/youtube/v3"
UA = "muggoozz-research"


def terms_from(path):
    with open(path, encoding="utf-8") as f:
        return [t for t in (line.split("#")[0].strip() for line in f) if t]


def get(endpoint, params, key):
    url = f"{API}/{endpoint}?" + urllib.parse.urlencode({**params, "key": key})
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def why(err):
    """YouTube's reason for an HTTP error, without the request URL (which holds the key)."""
    try:
        body = json.load(err)
        e = body.get("error", {})
        reason = (e.get("errors") or [{}])[0].get("reason", "")
        return f"YouTube answered {err.code}: {reason or e.get('message', 'error')}"
    except Exception:
        return f"YouTube answered {err.code}"


def youtube(terms, key, days, per_term):
    now = datetime.now(timezone.utc)
    after = (now - timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")
    found, per_term_out, quota = {}, {}, 0
    for t in terms:
        data = get("search", {"part": "snippet", "type": "video", "q": t, "regionCode": "IN", "relevanceLanguage": "en",
                              "publishedAfter": after, "order": "viewCount", "maxResults": per_term}, key)
        quota += 100
        ids = [i["id"]["videoId"] for i in data.get("items", []) if i.get("id", {}).get("videoId")]
        per_term_out[t] = {"found": len(ids), "video_ids": ids}
        for vid in ids:
            found.setdefault(vid, []).append(t)
        time.sleep(0.3)

    videos, ids = [], list(found)
    for i in range(0, len(ids), 50):
        data = get("videos", {"part": "snippet,statistics", "id": ",".join(ids[i:i + 50])}, key)
        quota += 1
        for v in data.get("items", []):
            s, st = v.get("snippet", {}), v.get("statistics", {})
            published = s.get("publishedAt", "")
            age_days = max((now - datetime.fromisoformat(published.replace("Z", "+00:00"))).total_seconds() / 86400, 1) if published else None
            views = int(st["viewCount"]) if "viewCount" in st else None
            videos.append({
                "id": v["id"], "url": f"https://www.youtube.com/watch?v={v['id']}", "title": s.get("title", ""),
                "channel": s.get("channelTitle", ""), "channel_id": s.get("channelId", ""), "published": published,
                "views": views, "likes": int(st["likeCount"]) if "likeCount" in st else None,
                "comments": int(st["commentCount"]) if "commentCount" in st else None,
                "views_per_day": round(views / age_days) if views is not None and age_days else None,
                "terms": found[v["id"]],
            })
    videos.sort(key=lambda v: v["views_per_day"] or 0, reverse=True)
    for t, d in per_term_out.items():
        d["views"] = sum(v["views"] or 0 for v in videos if t in v["terms"])
        del d["video_ids"]
    return videos, per_term_out, quota


def google_trends(terms, out):
    try:
        from pytrends.request import TrendReq
    except ImportError:
        print("[trends] pytrends not installed; interest.csv left out", file=sys.stderr)
        return
    rows = []
    try:
        py = TrendReq(hl="en-IN", tz=330)
        for prop, label in (("", "web"), ("youtube", "youtube")):
            py.build_payload(terms[:5], timeframe="today 3-m", geo="IN", gprop=prop)
            df = py.interest_over_time()
            for ts, r in df.iterrows():
                rows += [{"date": ts.date().isoformat(), "keyword": k, "property": label, "interest": int(r[k])} for k in terms[:5]]
            time.sleep(3)
    except Exception as e:  # Google rate-limits Trends often, above all from cloud machines
        print(f"[trends] Google Trends did not answer: {e.__class__.__name__}", file=sys.stderr)
        return
    if rows:
        with open(os.path.join(out, "interest.csv"), "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=["date", "keyword", "property", "interest"])
            w.writeheader()
            w.writerows(rows)
        print(f"[trends] {len(rows)} interest rows")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default=os.path.join(ROOT, "data", "trends"))
    ap.add_argument("--terms", default=None, help="file of search terms, one per line (default: <out>/queries.txt)")
    ap.add_argument("--days", type=int, default=7)
    ap.add_argument("--per-term", type=int, default=25)
    ap.add_argument("--trends", action="store_true")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    terms_file = a.terms or os.path.join(a.out, "queries.txt")
    if not os.path.exists(terms_file):
        sys.exit(f"No search terms: {terms_file} does not exist. Pass --terms FILE, one term per line.")
    terms = terms_from(terms_file)
    result = {"date": datetime.now(timezone(timedelta(hours=5, minutes=30))).date().isoformat(), "terms": terms,
              "window_days": a.days, "videos": [], "per_term": {}, "quota_used": 0}

    key = os.environ.get("YOUTUBE_API_KEY", "").strip()
    if not key:
        result["missing"] = "YOUTUBE_API_KEY is not set, so there are no YouTube numbers today"
    else:
        try:
            result["videos"], result["per_term"], result["quota_used"] = youtube(terms, key, a.days, a.per_term)
        except urllib.error.HTTPError as e:
            result["missing"] = why(e)
        except (urllib.error.URLError, TimeoutError) as e:
            result["missing"] = f"Could not reach YouTube: {getattr(e, 'reason', e)}"
    with open(os.path.join(a.out, "youtube_today.json"), "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=1)
    print(f"[youtube] {len(result['videos'])} videos from {len(terms)} terms" + (f"; MISSING: {result['missing']}" if "missing" in result else ""))

    if a.trends:
        google_trends(terms, a.out)


if __name__ == "__main__":
    main()
