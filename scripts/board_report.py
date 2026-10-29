#!/usr/bin/env python3
"""The research-agents workflow's side of the agent board (mugcake.vercel.app/board). Standard library only.

Steps, in workflow order:
  started    tell the board the run started; get back what to run, and write the prompt files for Claude Code
  survey     pull the live survey from the board and run survey_analyze.py (for /survey and /gate)
  collect    gather the reports the run wrote or changed, before the workflow tidies the checkout
  finished   send the board the agents' closing message, the reports, the cost and the agent statuses

The board knows the workflow by its GitHub OIDC token (audience muggoozz-agent-board), so the repo holds no board
secret. For a local test, set BOARD_AUTH to the BOARD_KEY instead. This repo is public and so are its Actions logs:
nothing here prints survey answers, reports, recipe ingredients or the agents' messages.

Env: RUN_ID, BOARD_URL, RUNNER_TEMP (scratch files), and from GitHub: GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID.
"""
import hashlib, json, os, re, subprocess, sys, time, urllib.error, urllib.request

from agent_board import REPORTS, ROOT

AUDIENCE = "muggoozz-agent-board"
COMMANDS = ("/demand", "/demand replies", "/survey", "/gate", "/economics", "/recipe")
PRIVATE = ("/survey", "/recipe")      # their output stays on the board, never in the repo
NEEDS_SURVEY = ("/survey", "/gate")
MAX_REPORT = 190_000                   # characters per report; the board takes up to 200k
TMP = os.environ.get("RUNNER_TEMP") or os.path.join(ROOT, ".board-run")

SYSTEM = ("You are running unattended in GitHub Actions because the founder pressed Run on the agent board. "
          "Nobody can answer questions until the run ends: where a step says to ask the user, take the documented default, "
          "or write MISSING and say what would fill it, then carry on. Follow CLAUDE.md. Agents draft; never post, comment, "
          "message or email anywhere. Do not commit or push: the workflow saves the files after you finish. "
          "Your final message is shown on the board as the run's result, so make it the reply the command asks for: "
          "short and plain, no em dashes.")
EXTRA = {
    "/survey": ("This is a /survey run. data/survey/responses.csv was pulled from the live survey when the run started, and "
                "scripts/survey_analyze.py has already run on it: summary.json, tables.md and coded_survey.csv are in data/survey/. "
                "Bash and web tools are off for privacy, so tell survey-analyst to read those files instead of running the script. "
                "history.csv starts fresh on every board run, so there is no earlier run to compare with; say so. "
                "Survey answers stay private: they go only into reports/04_survey.md, which is kept out of git."),
    "/gate": ("This is a /gate run. data/survey/coded_survey.csv was made from the live survey at the start of the run with comment "
              "text removed for privacy, so survey rows are counts only. data/gate/decision.md and gate.json are saved to a public "
              "repo: cite survey numbers, never survey wording."),
    "/recipe": "This is a /recipe run for the founder. Its output stays on the private board and is not saved to the repo.",
}


def tmp(name):
    os.makedirs(TMP, exist_ok=True)
    return os.path.join(TMP, name)


def read(name, default=""):
    p = tmp(name)
    return open(p, encoding="utf-8").read() if os.path.exists(p) else default


def write(name, text):
    with open(tmp(name), "w", encoding="utf-8") as f:
        f.write(text)


def board_url():
    url = (os.environ.get("BOARD_URL") or "https://mugcake.vercel.app").rstrip("/")
    if not re.match(r"^(https://[\w.-]+|http://localhost(:\d+)?)$", url):
        sys.exit("BOARD_URL must be an https origin.")
    return url


def run_id():
    rid = os.environ.get("RUN_ID", "")
    if not re.fullmatch(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", rid):
        sys.exit("RUN_ID is not a run id from the board.")
    return rid


def bearer():
    if os.environ.get("BOARD_AUTH"):
        return os.environ["BOARD_AUTH"]
    url, token = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_URL"), os.environ.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN")
    if not url or not token:
        sys.exit("No GitHub OIDC token: the workflow needs `permissions: id-token: write`.")
    req = urllib.request.Request(f"{url}&audience={AUDIENCE}", headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)["value"]


def call(method, path, body=None):
    """The board's answer as bytes. Retries network trouble and 5xx; a 4xx stops the step with its status only."""
    for attempt in range(4):
        req = urllib.request.Request(board_url() + path, method=method,
                                     data=None if body is None else json.dumps(body).encode("utf-8"),
                                     headers={"Authorization": f"Bearer {bearer()}", "Content-Type": "application/json",
                                              "User-Agent": "research-agents-workflow"})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code < 500 or attempt == 3:
                sys.exit(f"The board answered {e.code} to {method} {path}.")
        except urllib.error.URLError as e:
            if attempt == 3:
                sys.exit(f"Could not reach the board: {e.reason}")
        time.sleep(2 ** (attempt + 1))


def digest(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest() if os.path.isfile(p) else None


def snapshot():
    """A fingerprint of every report path; a folder maps each .md file in it."""
    snap = {}
    for rel in REPORTS.values():
        p = os.path.join(ROOT, rel)
        if rel.endswith("/"):
            snap[rel] = {n: digest(os.path.join(p, n)) for n in sorted(os.listdir(p)) if n.endswith(".md")} if os.path.isdir(p) else {}
        else:
            snap[rel] = digest(p)
    return snap


def text_of(p):
    t = open(p, encoding="utf-8", errors="replace").read()
    return t if len(t) <= MAX_REPORT else t[:MAX_REPORT] + "\n\n(cut here: the full file is longer)"


def output(**kv):
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as f:
            f.writelines(f"{k}={v}\n" for k, v in kv.items())


def started():
    server, repo, gh_run = (os.environ.get(k, "") for k in ("GITHUB_SERVER_URL", "GITHUB_REPOSITORY", "GITHUB_RUN_ID"))
    run_url = f"{server or 'https://github.com'}/{repo}/actions/runs/{gh_run}"
    answer = json.loads(call("POST", "/api/board/runs", {"event": "started", "run_id": run_id(), "run_url": run_url}))
    command, args = answer.get("command"), answer.get("args") or ""
    if command not in COMMANDS:
        sys.exit("The board asked for a command this workflow does not run.")
    # The prompt is the command itself, as if typed in Claude Code; only /recipe carries text (the founder's ingredients).
    prompt = "/recipe " + (re.sub(r"\s+", " ", args).strip()[:300] or "pantry") if command == "/recipe" else command
    write("command", command)
    write("prompt", prompt)
    write("system", SYSTEM + (" " + EXTRA[command] if command in EXTRA else ""))
    write("disallowed", "Bash,WebFetch,WebSearch" if command == "/survey" else "")
    write("mode", "private" if command in PRIVATE else "commit")
    write("before.json", json.dumps(snapshot()))
    output(command=command, needs_survey=str(command in NEEDS_SURVEY).lower())
    print(f"The board asked for {command}.")


def survey():
    command = read("command")
    os.makedirs(os.path.join(ROOT, "data", "survey"), exist_ok=True)
    csv_path = os.path.join(ROOT, "data", "survey", "responses.csv")
    with open(csv_path, "wb") as f:
        f.write(call("GET", "/api/sheet/responses"))
    cmd = [sys.executable, os.path.join(ROOT, "scripts", "survey_analyze.py"), csv_path, "--out", os.path.join(ROOT, "data", "survey")]
    if command != "/survey":
        cmd.append("--no-text")
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL)
    if command != "/survey":
        os.remove(csv_path)  # /gate needs the coded counts only; the answers themselves leave the runner
    print("Survey answers pulled and counted.")


def collect():
    before, after, reports = json.loads(read("before.json", "{}")), snapshot(), {}
    for rel, now in after.items():
        if isinstance(now, dict):
            changed = [n for n, h in now.items() if (before.get(rel) or {}).get(n) != h]
            if changed:
                parts = [f"## {n}\n\n" + text_of(os.path.join(ROOT, rel, n)) for n in changed]
                reports[rel] = "\n\n".join(parts)[:MAX_REPORT]
        elif now and now != before.get(rel):
            reports[rel] = text_of(os.path.join(ROOT, rel))
    write("reports.json", json.dumps(reports, ensure_ascii=False))
    print(f"{len(reports)} report(s) to send back.")


def finished():
    outcome, saved = os.environ.get("CLAUDE_OUTCOME", ""), os.environ.get("SAVE_OUTCOME", "")
    try:
        result = json.loads(read("claude.json") or "null") or {}
    except json.JSONDecodeError:
        result = {}
    ok = outcome == "success" and bool(result) and not result.get("is_error")
    error = None
    if read("agent_error").strip() == "no_key":
        error = ("No Claude key in GitHub. Add a repository secret named ANTHROPIC_API_KEY (or CLAUDE_CODE_OAUTH_TOKEN): "
                 "the board's Setup box has the steps.")
    elif not result:
        tail = read("claude.err")[-600:].strip()
        error = "Claude Code did not finish" + (f": {tail}" if tail else ". Open the GitHub log for the step that failed.")
    elif result.get("is_error"):
        error = f"Claude Code stopped early ({result.get('subtype', 'error')}). Open the GitHub log for details."
    elif outcome != "success":
        error = "The run stopped before the end. Open the GitHub log for the step that failed."
    if ok and saved not in ("success", "skipped"):
        ok, error = False, ("The agents finished, but saving their files to the repo failed, perhaps because something else "
                            "was pushed at the same time. Their reports are below; run it again to save the files.")

    body = {"event": "finished", "run_id": run_id(), "ok": ok}
    if result.get("result"):
        body["summary"] = str(result["result"])[:19_000]
    if isinstance(result.get("total_cost_usd"), (int, float)):
        body["cost_usd"] = round(float(result["total_cost_usd"]), 4)
    if error:
        body["error"] = error[:1900]
    reports = json.loads(read("reports.json", "{}"))
    if reports:
        body["reports"] = reports
    if read("commit_url").strip():
        body["commit_url"] = read("commit_url").strip()
    out = os.path.join(ROOT, "app", "src", "content", "agent-board")
    if saved == "success" and os.path.exists(os.path.join(out, "meta.json")):
        load = lambda n: json.load(open(os.path.join(out, n), encoding="utf-8"))
        body["board"] = {"agents": load("agents.json"), "gate_files": load("gate_files.json"), "generated_at": load("meta.json")["generated_at"]}
    call("POST", "/api/board/runs", body)
    print("Reported back to the board: " + ("done." if ok else "failed."))


if __name__ == "__main__":
    steps = {"started": started, "survey": survey, "collect": collect, "finished": finished}
    if len(sys.argv) != 2 or sys.argv[1] not in steps:
        sys.exit("usage: board_report.py started|survey|collect|finished")
    steps[sys.argv[1]]()
