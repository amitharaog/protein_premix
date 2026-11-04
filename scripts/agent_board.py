#!/usr/bin/env python3
"""Rows for the agent board: one per agent in PLAN with its status, plus the gate metrics counted from the repo's data
files. Standard library only. Survey numbers are not here: the board reads those live from the database.

PLAN is empty: on 4 Nov 2026 the founder removed every agent to restart the research process, so the board shows
none. To add one: write .claude/agents/<slug>.md and its command in .claude/commands/, then add a PLAN row, its main
output to OUTPUTS and its report to REPORTS. Its status is Ran once the output exists (with the row count for a CSV),
Ready before that, and Locked for an Economics agent until data/gate/gate.json says pass.

Usage: python3 scripts/agent_board.py [--out DIR] [--date YYYY-MM-DD]
Writes DIR/agents.json and DIR/gate_files.json (default DIR: current folder), plus DIR/meta.json with the time
they last changed. Unchanged output leaves all three files alone.
"""
import argparse, csv, json, os, re, subprocess
from datetime import date, datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PLAN = []      # (slug, phase, command, one-line job), in the order the work runs
OUTPUTS = {}   # slug -> the main file it writes; the board's status comes from it
REPORTS = {}   # slug -> the human-readable output the board shows (a folder means its newest .md file)
DAILY = {}     # slug -> next-step text for an agent the workflow also runs on a schedule


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


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default=".")
    ap.add_argument("--date", default=date.today().isoformat())
    args = ap.parse_args()

    unlocked = gate_status() == "pass"
    agents = []
    for order, (name, phase, cmd, job) in enumerate(PLAN, 1):
        output = OUTPUTS.get(name, "")
        rows = count(*output.split("/")) if output.endswith(".csv") else None
        status = ("Locked" if phase == "Economics" and not unlocked
                  else "Ran" if output and os.path.exists(path(output)) else "Ready")
        step = DAILY.get(name) or {"Ready": "Run {cmd}", "Locked": "Unlocks when the gate passes"}.get(status, "Re-run {cmd} when there is new data")
        meta, instructions = agent_doc(name)
        exists, url, note = output_link(output) if output else (False, "", "")
        agents.append({"order": order, "name": name, "slug": name, "phase": phase, "command": cmd, "job": job,
                       "model": meta.get("model", ""), "status": status, "waiting_on": "",
                       "output": output, "rows": rows, "next_step": step.format(cmd=cmd),
                       "description": meta.get("description", ""), "tools": meta.get("tools", ""),
                       "command_hint": command_hint(cmd), "output_exists": exists, "output_url": url, "output_note": note,
                       "report": REPORTS.get(name, ""), "instructions": instructions})

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
    if not agents:
        print("No agents in PLAN.")


if __name__ == "__main__":
    main()
