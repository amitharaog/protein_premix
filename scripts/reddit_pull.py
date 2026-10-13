#!/usr/bin/env python3
"""Read-only Reddit puller. Never posts.

Auth: set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET (create a 'script' app at
https://www.reddit.com/prefs/apps) for reliable access. Without them it tries the public
JSON endpoints, which Reddit often rate-limits or blocks.

Usage:
  python3 scripts/reddit_pull.py search --queries "protein brownie" "protein cake" --out data/signals/reddit_raw.jsonl
  python3 scripts/reddit_pull.py thread https://www.reddit.com/r/x/comments/abc/title/ --out data/responses/reddit_replies.jsonl
"""
import argparse, base64, datetime, json, os, sys, time, urllib.error, urllib.parse, urllib.request

UA = os.environ.get("REDDIT_USER_AGENT", "python:protein-premix-research:v0.1 (read-only market research)")
TODAY = datetime.date.today().isoformat()
HERE = os.path.dirname(os.path.abspath(__file__))
_token = None


def token():
    global _token
    if _token is not None:
        return _token
    cid, sec = os.environ.get("REDDIT_CLIENT_ID"), os.environ.get("REDDIT_CLIENT_SECRET")
    if not (cid and sec):
        _token = ""
        return _token
    req = urllib.request.Request(
        "https://www.reddit.com/api/v1/access_token",
        data=b"grant_type=client_credentials",
        headers={"User-Agent": UA, "Authorization": "Basic " + base64.b64encode(f"{cid}:{sec}".encode()).decode()})
    with urllib.request.urlopen(req, timeout=15) as r:
        _token = json.loads(r.read())["access_token"]
    return _token


def get(path, params):
    t = token()
    base = "https://oauth.reddit.com" if t else "https://www.reddit.com"
    if not t and not path.endswith(".json"):
        path += ".json"
    url = base + path + "?" + urllib.parse.urlencode({**params, "raw_json": 1})
    headers = {"User-Agent": UA}
    if t:
        headers["Authorization"] = f"bearer {t}"
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=20) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(5 * (attempt + 1)); continue
            if e.code in (403, 404):
                print(f"[skip] {e.code} {path}", file=sys.stderr); return None
            raise
    return None


def post_row(d, query, scope):
    return {"date_captured": TODAY, "kind": "post", "query": query, "scope": scope,
            "subreddit": d.get("subreddit"), "url": "https://www.reddit.com" + d.get("permalink", ""),
            "title": d.get("title"), "text": (d.get("selftext") or "")[:2000],
            "score": d.get("score"), "num_comments": d.get("num_comments"),
            "created_utc": datetime.datetime.fromtimestamp(d.get("created_utc", 0), datetime.timezone.utc).date().isoformat()}


def search(queries, subs, limit, out):
    seen, n = set(), 0
    with open(out, "a") as f:
        for q in queries:
            scopes = [(f"/r/{s}/search", {"restrict_sr": 1}, s) for s in subs] + [("/search", {}, "all")]
            for path, extra, scope in scopes:
                data = get(path, {"q": q, "sort": "relevance", "t": "all", "limit": limit, **extra})
                time.sleep(1.1)
                if not data:
                    continue
                for c in data.get("data", {}).get("children", []):
                    d = c.get("data", {})
                    if d.get("id") in seen:
                        continue
                    seen.add(d.get("id"))
                    f.write(json.dumps(post_row(d, q, scope), ensure_ascii=False) + "\n"); n += 1
    print(f"appended {n} posts to {out}")


def walk(children, out_rows, url, depth=0):
    for c in children:
        if c.get("kind") != "t1":
            continue
        d = c["data"]
        out_rows.append({"date_captured": TODAY, "kind": "comment", "thread_url": url, "depth": depth,
                         "author": d.get("author"), "text": (d.get("body") or "")[:2000], "score": d.get("score"),
                         "created_utc": datetime.datetime.fromtimestamp(d.get("created_utc", 0), datetime.timezone.utc).date().isoformat()})
        rep = d.get("replies")
        if isinstance(rep, dict):
            walk(rep.get("data", {}).get("children", []), out_rows, url, depth + 1)


def thread(url, out):
    p = urllib.parse.urlparse(url).path.rstrip("/")
    data = get(p, {"limit": 500, "sort": "top"})
    if not data:
        print("could not fetch thread", file=sys.stderr); return
    rows = []
    op = data[0]["data"]["children"][0]["data"]
    rows.append(post_row(op, "", op.get("subreddit")))
    walk(data[1]["data"]["children"], rows, url)
    with open(out, "a") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"appended {len(rows)} rows (1 post, {len(rows) - 1} comments) to {out}")


def main():
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest="cmd", required=True)
    s = sp.add_parser("search")
    s.add_argument("--queries", nargs="+", required=True)
    s.add_argument("--subs-file", default=os.path.join(HERE, "subreddits.txt"))
    s.add_argument("--limit", type=int, default=25)
    s.add_argument("--out", default="data/signals/reddit_raw.jsonl")
    t = sp.add_parser("thread")
    t.add_argument("url")
    t.add_argument("--out", default="data/responses/reddit_replies.jsonl")
    a = ap.parse_args()
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    if not token():
        print("[info] no REDDIT_CLIENT_ID/SECRET set; using public JSON (may be blocked)", file=sys.stderr)
    if a.cmd == "search":
        subs = [l.split("#")[0].strip() for l in open(a.subs_file) if l.split("#")[0].strip()]
        search(a.queries, subs, a.limit, a.out)
    else:
        thread(a.url, a.out)


if __name__ == "__main__":
    main()
