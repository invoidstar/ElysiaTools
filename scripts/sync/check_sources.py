#!/usr/bin/env python3
"""Compare official sources with the last successful observation; never infer dates."""
import argparse
import hashlib
import html
from html.parser import HTMLParser
import json
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MONITORED = {"official-cfp", "official-history", "classification", "publisher-metric"}
USER_AGENT = "ElysiaTools-SourceHealth/1.7 (+https://github.com/invoidstar/ElysiaTools)"

class ReadableHTML(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "svg", "noscript"}:
            self.skip += 1

    def handle_endtag(self, tag):
        if tag in {"script", "style", "svg", "noscript"} and self.skip:
            self.skip -= 1

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)

def fingerprint(body, content_type):
    if "html" in content_type:
        reader = ReadableHTML()
        reader.feed(body.decode("utf-8", errors="replace"))
        normalized = html.unescape(" ".join(reader.parts))
        body = re.sub(r"\s+", " ", normalized).strip().encode("utf-8")
    return hashlib.sha256(body).hexdigest()

def fetch(source):
    request = urllib.request.Request(source["url"], headers={
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/pdf,application/xhtml+xml,*/*;q=0.5",
    })
    try:
        with urllib.request.urlopen(request, timeout=18) as response:
            body = response.read(2_000_001)
            if len(body) > 2_000_000:
                return {"ok": False, "error": "Source exceeds 2 MB inspection limit"}
            return {"ok": True, "status": response.status,
                    "finalUrl": response.geturl(),
                    "fingerprint": fingerprint(body, response.headers.get("Content-Type", "")),
                    "bytesRead": len(body)}
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        return {"ok": False, "error": str(error)[:250]}

def inspect(sources, prior, get=fetch):
    previous = prior.get("sources", {})
    snapshots = dict(previous)
    rows = []
    for source in sources:
        if source.get("kind") not in MONITORED:
            continue
        observed = get(source)
        entry = {**observed, "id": source["id"], "url": source["url"],
                 "kind": source["kind"]}
        old = previous.get(source["id"])
        if not observed.get("ok"):
            entry["state"] = "unreachable"
        elif old and old.get("url") == source["url"]:
            entry["state"] = ("changed" if old.get("fingerprint") !=
                              observed["fingerprint"] else "unchanged")
            snapshots[source["id"]] = {
                "url": source["url"], "fingerprint": observed["fingerprint"]}
        else:
            entry["state"] = "baseline_created"
            snapshots[source["id"]] = {
                "url": source["url"], "fingerprint": observed["fingerprint"]}
        rows.append(entry)
    states = {kind: sum(r["state"] == kind for r in rows)
              for kind in ("changed", "unchanged", "unreachable", "baseline_created")}
    now = datetime.now(timezone.utc).isoformat()
    return ({"checkedAt": now,
             "policy": "Observation only; never overwrite academic dates.",
             "total": len(rows), "summary": states,
             "requiresReview": [r["id"] for r in rows if r["state"] == "changed"],
             "networkProblems": [r["id"] for r in rows if r["state"] == "unreachable"],
             "results": rows},
            {"version": 2, "updatedAt": now, "sources": snapshots})

def report_markdown(report):
    count = report["summary"]
    lines = ["## ElysiaTools official source health", "",
             f"Checked: {report['checkedAt']}", "",
             f"- Inspected: **{report['total']}** official references",
             f"- New baselines: **{count['baseline_created']}**",
             f"- Unchanged: **{count['unchanged']}**",
             f"- Page changes requiring review: **{count['changed']}**",
             f"- Transient failures: **{count['unreachable']}**", "",
             "A digest difference signals **manual review**, not a verified deadline update."]
    for state in ("changed", "unreachable"):
        rows = [r for r in report["results"] if r["state"] == state]
        if rows:
            lines += ["", "### " + ("Changed pages" if state == "changed"
                                    else "Failed requests")]
            for row in rows:
                note = row.get("error", "Content changed; compare official dates manually.")
                lines.append(f"- [{row['id']}]({row['url']}) — {note}")
    return "\n".join(lines) + "\n"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline", default=".cache/source-health/previous.json")
    parser.add_argument("--snapshot", default=".cache/source-health/current.json")
    parser.add_argument("--output", default="source-health-report.json")
    parser.add_argument("--markdown", default="source-health-report.md")
    parser.add_argument("--delay", type=float, default=0.35)
    args = parser.parse_args()
    sources = json.loads((ROOT / "data/sources.json").read_text(encoding="utf-8"))
    prior_path = Path(args.baseline)
    try:
        previous = json.loads(prior_path.read_text(encoding="utf-8")) if prior_path.exists() else {}
    except (json.JSONDecodeError, OSError):
        previous = {}
    def throttled(source):
        if throttled.count:
            time.sleep(max(0, args.delay))
        throttled.count += 1
        return fetch(source)
    throttled.count = 0
    result, snapshot = inspect(sources, previous, throttled)
    for path, value in ((args.output, json.dumps(result, ensure_ascii=False, indent=2)+"\n"),
                        (args.snapshot, json.dumps(snapshot, ensure_ascii=False, indent=2)+"\n"),
                        (args.markdown, report_markdown(result))):
        dest = Path(path)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(value, encoding="utf-8")
    for row in result["results"]:
        if row["state"] in ("changed", "unreachable"):
            print("::warning title=Academic source needs review::"+
                  row["id"]+" ("+row["state"]+")")
    print("Source health:", json.dumps(result["summary"]))

if __name__ == "__main__":
    main()
