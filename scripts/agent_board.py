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
Writes DIR/agents.json and DIR/gate_files.json (default DIR: current folder), plus DIR/meta.json with the time
they last changed. Unchanged output leaves all three files alone.
"""
import argparse, csv, json, os, re, subprocess
from datetime import date, datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# The human-readable output each agent writes; the board shows its latest version. A folder means its newest .md file.
REPORTS = {
    "demand-scout": "reports/01_listening.md", "keyword-finder": "reports/02_keywords.md", "post-drafter": "data/posts/drafts.md",
    "response-analyst": "reports/03_responses.md", "survey-analyst": "reports/04_survey.md", "demand-gate": "data/gate/decision.md",
    "pricing-analyst": "reports/05_pricing.md", "channel-analyst": "reports/06_channels.md", "cac-modeler": "reports/07_cac.md",
    "recipe-builder": "data/formulation/suggestions/",
}

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
EXTERNAL = {"name": "Protein mug cake weekly refresh", "slug": "cowork-weekly-refresh", "phase": "Outside this repo",
            "command": "Cowork schedule", "job": "Scheduled task in Claude's desktop app; it made the build kit on 26 Oct 2026",
            "model": "", "status": "Scheduled", "waiting_on": "", "output": "Cowork", "rows": None,
            "next_step": "Runs on its own schedule in Cowork", "description": "", "tools": "", "command_hint": "",
            "output_exists": False, "output_url": "", "output_note": "Lives in the Claude desktop app, not in this repo", "report": "",
            "instructions": "This task lives in the Claude desktop app, not in this repo, so nothing here runs it.\n\n"
                            "## Where to find it\n- Open the Claude desktop app, then Cowork, then Scheduled.\n"
                            "- From there you can see its runs, change its schedule, or pause it.\n\n"
                            "## What it did\n- Made the build kit (the starting code for the site and research app) on 26 Oct 2026."}


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


def agent_doc(name):
    """The agent file's frontmatter fields and its instructions (the markdown after the frontmatter)."""
    f = path(".claude", "agents", f"{name}.md")
    if not os.path.exists(f):
        return {}, ""
    text = open(f, encoding="utf-8").read()
    m = re.match(r"^---\n(.*?)\n---\n?(.*)$", text, re.S)
    if not m:
        return {}, text
    return dict(re.findall(r"^(\w+):\s*(.*)$", m.group(1), re.M)), m.group(2).strip()


def command_hint(cmd):
    """The argument hint from .claude/commands/<name>.md, e.g. '[replies]' for /demand."""
    f = path(".claude", "commands", cmd.lstrip("/").split()[0] + ".md")
    if not os.path.exists(f):
        return ""
    m = re.search(r'^argument-hint:\s*"?(.*?)"?\s*$', open(f, encoding="utf-8").read(), re.M)
    return m.group(1) if m else ""


def git(*a):
    try:
        return subprocess.run(["git", *a], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return ""


def output_link(output):
    """(exists, GitHub link, note) for an agent's main output. Ignored files stay local, so they get a note, not a link."""
    exists = os.path.exists(path(output))
    try:
        ignored = subprocess.run(["git", "check-ignore", "-q", output], cwd=ROOT).returncode == 0
    except OSError:
        ignored = False
    if ignored:
        return exists, "", "Stays on your computer: kept out of git so survey answers are never shared"
    if not exists:
        return False, "", "Not created yet: appears after the agent's first run"
    remote = re.sub(r"\.git$", "", git("remote", "get-url", "origin"))
    branch = git("rev-parse", "--abbrev-ref", "HEAD") or "main"
    if not remote.startswith("https://github.com/") or not git("ls-files", output.rstrip("/")):
        return True, "", "Created; commit and push it to see it on GitHub"
    kind = "tree" if output.endswith("/") else "blob"
    return True, f"{remote}/{kind}/{branch}/{output.rstrip('/')}", ""


def gate_status():
    f = path("data", "gate", "gate.json")
    return json.load(open(f, encoding="utf-8")).get("status") if os.path.exists(f) else None


def ran_before(out, name):
    """Whether the last board said this agent ran. Its report stays out of git, so a fresh checkout cannot tell."""
    f = os.path.join(out, "agents.json")
    try:
        return any(a.get("name") == name and a.get("status") == "Ran" for a in json.load(open(f, encoding="utf-8")))
    except (OSError, ValueError):
        return False


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
        "survey-analyst": ("Ran", "", "reports/04_survey.md", None) if os.path.exists(path("reports", "04_survey.md")) or ran_before(args.out, "survey-analyst") else
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
        meta, instructions = agent_doc(name)
        exists, url, note = output_link(output)
        agents.append({"order": order, "name": name, "slug": name, "phase": phase, "command": cmd, "job": job,
                       "model": meta.get("model", ""), "status": status, "waiting_on": wait,
                       "output": output, "rows": rows, "next_step": tmpl.format(cmd=cmd, wait=wait),
                       "description": meta.get("description", ""), "tools": meta.get("tools", ""),
                       "command_hint": command_hint(cmd) if cmd in ("/recipe", "/survey") else "",
                       "output_exists": exists, "output_url": url, "output_note": note,
                       "report": REPORTS.get(name, ""), "instructions": instructions})
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
    out = lambda name: os.path.join(args.out, name)
    new = {"agents.json": json.dumps(agents, ensure_ascii=False, indent=1), "gate_files.json": json.dumps(gate_files, ensure_ascii=False, indent=1)}
    old = {name: open(out(name), encoding="utf-8").read() if os.path.exists(out(name)) else None for name in new}
    # meta.json says when the statuses last changed; the board uses it to tell whether a run's copy is newer than the deployed one.
    if new != old or not os.path.exists(out("meta.json")):
        for name, text in new.items():
            with open(out(name), "w", encoding="utf-8") as f:
                f.write(text)
        with open(out("meta.json"), "w", encoding="utf-8") as f:
            json.dump({"generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}, f)
    for a in agents:
        print(f"{a['order']:>2} {a['name']:<32} {a['status']:<10} {a['next_step']}")


if __name__ == "__main__":
    main()
