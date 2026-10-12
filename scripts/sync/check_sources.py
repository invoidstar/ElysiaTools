#!/usr/bin/env python3
"""Conservative, low-frequency source health check; never auto-edits academic dates.

The digest helps human reviewers notice potential CFP page changes. An error or changed
HTML is not proof that a conference deadline moved, and no new time is inferred.
"""
import argparse
import hashlib
import json
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def check(source):
    url = source["url"]
    request = urllib.request.Request(url, headers={
        "User-Agent": "ElysiaTools-SourceHealth/1.0 (+https://github.com/invoidstar/ElysiaTools)",
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.5",
    })
    try:
        with urllib.request.urlopen(request, timeout=18) as response:
            body = response.read(2_000_000)
            return {
                "id": source["id"], "url": url, "status": response.status,
                "finalUrl": response.geturl(), "digestSHA256": hashlib.sha256(body).hexdigest(),
                "bytesRead": len(body), "ok": 200 <= response.status < 400,
            }
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        return {"id": source["id"], "url": url, "ok": False, "error": str(error)[:400]}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="source-health-report.json")
    args = parser.parse_args()
    sources = json.loads((ROOT / "data" / "sources.json").read_text(encoding="utf-8"))
    monitored = [s for s in sources if s["kind"] in ("official-cfp", "classification")]
    results = []
    for index, source in enumerate(monitored):
        if index: time.sleep(0.35)
        item = check(source)
        print(("[OK]" if item["ok"] else "[REVIEW]") + " " + item["id"] + " " + str(item.get("status", item.get("error"))))
        results.append(item)
    report = {
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "policy": "Observation only. Deadline edits need official verification and PR review.",
        "total": len(results),
        "requiresReview": [r["id"] for r in results if not r["ok"]],
        "results": results,
    }
    Path(args.output).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if report["requiresReview"]:
        print("Some sources need manual review. Bot blocking and rate limiting are possible.")

if __name__ == "__main__":
    main()
