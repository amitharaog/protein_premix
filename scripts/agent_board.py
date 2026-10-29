#!/usr/bin/env python3
"""Rows for the agent board: one per agent with its status, plus the gate metrics counted from the repo's data files.
Standard library only. Survey numbers are not here: the board reads those live from the database.

Status comes from what exists on disk, so re-running this after an agent runs moves its row:
  Ran       its main output exists (with the row count where it is a CSV)
  Ready     it can run now
  Waiting   it needs another step first (said in waiting_on)
  Locked    economics, until data/gate/gate.json says pass
  On call   founder-only, runs when asked

Usage: python3 scripts/agent_board.py [--out DIR] [--date YYYY-MM-DD]
Writes DIR/agents.json and DIR/gate_files.json (default DIR: current folder).
"""
import argparse, csv, json, os, re
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Pipeline order, phase, command and a one-line job. The agent files hold the full instructions.
PLAN = [
    ("demand-scout", "Demand", "/demand", "Finds what people in India already say about protein desserts, unprompted"),
    ("keyword-finder", "Demand", "/demand", "Checks whether people search for protein baking on Google, YouTube and Amazon.in"),
    ("post-drafter", "Demand", "/demand", "Drafts discovery posts that ask about the problem; you post them by hand"),
    ("response-analyst", "Demand", "/demand replies", "Codes replies to your posts and separates behaviour from polite interest"),
    ("survey-analyst", "Demand", "/survey", "Reads the website survey answers and writes feedback with next steps"),
    ("demand-gate", "Gate", "/gate", "Scores all demand evidence against the thresholds: pass, fail or insufficient"),
    ("pricing-analyst", "Economics", "/economics", "Tests the price hypotheses against shelf prices and a price survey"),
    ("channel-analyst", "Economics", "/economics", "Scores sales channels for Bengaluru and prepares the CAC inputs"),
    ("cac-modeler", "Economics", "/economics", "Models CAC, margin, payback and LTV per channel with ranges"),
    ("recipe-builder", "Founder kitchen", "/recipe", "Finds recipes for the ingredients you have, with grams per serving and batch"),
]
EXTERNAL = {"name": "Protein mug cake weekly refresh", "phase": "Outside this repo", "command": "Cowork schedule",
            "job": "Scheduled task in Claude's desktop app; it made the build kit on 26 Oct 2026",
            "model": "", "status": "Scheduled", "waiting_on": "", "output": "Cowork", "rows": None,
            "next_step": "Runs on its own schedule in Cowork"}


def path(*p):
    return os.path.join(ROOT, *p)


def csv_rows(*p):
    f = path(*p)
    if not os.path.exists(f):
        return None
    with open(f, newline="", encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


def count(*p):
    rows = csv_rows(*p)
    return None if rows is None else len(rows)


def frontmatter(name):
    f = path(".claude", "agents", f"{name}.md")
    if not os.path.exists(f):
        return {}
    text = open(f, encoding="utf-8").read()
    m = re.match(r"^---\n(.*?)\n---", text, re.S)
    return dict(re.findall(r"^(\w+):\s*(.*)$", m.group(1), re.M)) if m else {}


def gate_status():
    f = path("data", "gate", "gate.json")
    return json.load(open(f, encoding="utf-8")).get("status") if os.path.exists(f) else None


def any_files(*p):
    d = path(*p)
    return os.path.isdir(d) and any(not n.startswith(".") for n in os.listdir(d))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default=".")
    ap.add_argument("--date", default=date.today().isoformat())
    args = ap.parse_args()

    signals, keywords, coded = count("data", "signals", "signals.csv"), count("data", "keywords", "suggestions.csv"), count("data", "responses", "coded.csv")
    posted = csv_rows("data", "posts", "posted.csv") or []
    live_posts = sum(1 for r in posted if (r.get("url") or "").startswith("http"))
    drafts = os.path.exists(path("data", "posts", "drafts.md"))
    gate = gate_status()
    unlocked = gate == "pass"
    evidence = any((signals, keywords, coded, count("data", "survey", "coded_survey.csv")))

    state = {
        "demand-scout": ("Ran", "", "data/signals/signals.csv", signals) if signals else ("Ready", "", "data/signals/signals.csv", None),
        "keyword-finder": ("Ran", "", "data/keywords/suggestions.csv", keywords) if keywords else ("Ready", "", "data/keywords/suggestions.csv", None),
        "post-drafter": ("Ran", "", "data/posts/drafts.md", None) if drafts else
                        ("Ready", "", "data/posts/drafts.md", None) if signals and keywords else
                        ("Waiting", "demand-scout and keyword-finder", "data/posts/drafts.md", None),
        "response-analyst": ("Ran", "", "data/responses/coded.csv", coded) if coded else
                            ("Ready", "", "data/responses/coded.csv", None) if live_posts else
                            ("Waiting", "posts you publish, listed in data/posts/posted.csv", "data/responses/coded.csv", None),
        "survey-analyst": ("Ran", "", "reports/04_survey.md", None) if os.path.exists(path("reports", "04_survey.md")) else
                          ("Ready", "", "reports/04_survey.md", None),
        "demand-gate": (f"Ran: {gate}", "", "data/gate/gate.json", None) if gate else
                       ("Ready", "", "data/gate/gate.json", None) if evidence else
                       ("Waiting", "evidence from the demand agents or the survey", "data/gate/gate.json", None),
        "pricing-analyst": ("Locked", "the demand gate to pass", "data/economics/competitors.csv", None) if not unlocked else
                           ("Ran", "", "data/economics/competitors.csv", count("data", "economics", "competitors.csv")) if count("data", "economics", "competitors.csv") else
                           ("Ready", "", "data/economics/competitors.csv", None),
        "channel-analyst": ("Locked", "the demand gate to pass", "data/economics/channels.csv", None) if not unlocked else
                           ("Ran", "", "data/economics/channels.csv", count("data", "economics", "channels.csv")) if count("data", "economics", "channels.csv") else
                           ("Ready", "", "data/economics/channels.csv", None),
        "cac-modeler": ("Locked", "the demand gate to pass", "reports/07_cac.md", None) if not unlocked else
                       ("Ran", "", "reports/07_cac.md", None) if os.path.exists(path("reports", "07_cac.md")) else
                       ("Ready", "", "reports/07_cac.md", None) if os.path.exists(path("data", "economics", "cac_inputs.json")) else
                       ("Waiting", "channel-analyst's cac_inputs.json", "reports/07_cac.md", None),
        "recipe-builder": ("Ran", "", "data/formulation/suggestions/", None) if any_files("data", "formulation", "suggestions") else
                          ("On call", "", "data/formulation/suggestions/", None),
    }
    next_step = {"Ready": "Run {cmd}", "Waiting": "After {wait}", "Locked": "Unlocks when /gate passes", "On call": "Run {cmd} with your ingredients"}

    agents = []
    for order, (name, phase, cmd, job) in enumerate(PLAN, 1):
        status, wait, output, rows = state[name]
        tmpl = next_step.get(status.split(":")[0], "Re-run {cmd} when there is new data")
        agents.append({"order": order, "name": name, "phase": phase, "command": cmd, "job": job,
                       "model": frontmatter(name).get("model", ""), "status": status, "waiting_on": wait,
                       "output": output, "rows": rows, "next_step": tmpl.format(cmd=cmd, wait=wait)})
    agents.append({"order": len(PLAN) + 1, **EXTERNAL})

    crit = json.load(open(path("data", "gate", "criteria.json"), encoding="utf-8"))["metrics"]
    coded_rows = csv_rows("data", "responses", "coded.csv") or []
    sig_rows = csv_rows("data", "signals", "signals.csv")
    kw_rows = csv_rows("data", "keywords", "suggestions.csv")
    yes = lambda r, k: (r.get(k) or "").strip().lower() in ("yes", "true")
    files = {
        "unprompted_problem_signals": None if sig_rows is None else sum(
            1 for r in sig_rows if (r.get("grade") in ("E1", "E2")) and int(float(r.get("intent_level") or 0)) >= 2),
        "india_share_of_signals": None,  # judged per row by /gate from the source, not a column
        "buy_intent_keywords": None if kw_rows is None else len({(r.get("suggestion") or "").lower() for r in kw_rows
                                                                if r.get("cluster") == "buy" and yes(r, "has_protein")
                                                                and r.get("source") in ("google_in", "amazon_in")}),
        "replies_total": len(coded_rows),
        "e1_actions": sum(1 for r in coded_rows if r.get("grade") == "E1"),
        "behaviour_count": sum(1 for r in coded_rows if yes(r, "past_behaviour") or r.get("grade") == "E1"),
        "interest_count": sum(1 for r in coded_rows if yes(r, "stated_interest")),
    }
    labels = {"unprompted_problem_signals": "Unprompted problem signals", "india_share_of_signals": "Share of signals from India",
              "buy_intent_keywords": "Buy-intent keywords", "replies_total": "Replies and survey responses",
              "behaviour_to_interest_ratio": "Behaviour to interest ratio", "e1_actions": "E1 actions (waitlist, where-to-buy asks)"}
    gate_files = []
    for i, (key, m) in enumerate(crit.items(), 1):
        gate_files.append({"order": i, "metric": key, "label": labels.get(key, key), "threshold": m["threshold"],
                           "from_files": files.get(key), "adds_survey": "survey" in m["source"], "source": m["source"],
                           "behaviour_count": files["behaviour_count"] if key == "behaviour_to_interest_ratio" else None,
                           "interest_count": files["interest_count"] if key == "behaviour_to_interest_ratio" else None,
                           "captured": args.date})

    os.makedirs(args.out, exist_ok=True)
    for name, data in (("agents.json", agents), ("gate_files.json", gate_files)):
        with open(os.path.join(args.out, name), "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
    for a in agents:
        print(f"{a['order']:>2} {a['name']:<32} {a['status']:<10} {a['next_step']}")


if __name__ == "__main__":
    main()
