#!/usr/bin/env python3
"""Create one durable GitHub issue per confirmed changed official source.

Never overwrite previous unreviewed evidence; append a comment on repeated
changes. Reopening a previously closed issue requires a new *confirmed*
change, not a failed request or an initial cache baseline.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

TITLE_PREFIX="[Source review] "

def review_title(row):
    return TITLE_PREFIX+row["id"]

def review_body(row,checked_at):
    before=(row.get("previousFingerprint") or "unavailable")
    after=(row.get("fingerprint") or "unavailable")
    return (
        f"### Academic source change confirmed — {row['id']}\n\n"
        f"- Source type: \`{row['kind']}\`\n"
        f"- Official/reference page: {row['url']}\n"
        f"- Observed at (UTC): {checked_at}\n"
        f"- Previous fingerprint: \`{before}\`\n"
        f"- Latest fingerprint: \`{after}\`\n\n"
        "**Human review needed:** compare the official paper/abstract deadlines,"
        " time zones, tracks, accepted counts and provenance with the current"
        " structured record. A different page fingerprint is **not** proof"
        " that an academic fact changed. Do not auto-edit dates.\n"
    )

def make_plan(report, existing):
    by_title={item["title"]:item for item in existing}
    plan=[]
    for row in report.get("results",[]):
        if row.get("state")!="changed":
            continue
        title=review_title(row)
        current=by_title.get(title)
        action=("create" if not current else
                "comment" if current["state"]=="OPEN" else "reopen")
        plan.append({"action":action,"number":current.get("number") if current else None,
                     "title":title,"body":review_body(row,report["checkedAt"])})
    return plan

def gh(*args):
    return subprocess.check_output(["gh",*args],text=True)

def main():
    path=Path(sys.argv[1] if len(sys.argv)>1 else "source-health-report.json")
    report=json.loads(path.read_text(encoding="utf-8"))
    if not report.get("requiresReview"):
        print("No confirmed page changes; no GitHub issue write.")
        return
    repo=os.environ["GITHUB_REPOSITORY"]
    existing=json.loads(gh("issue","list","--repo",repo,"--state","all",
                           "--limit","300","--json","number,title,state"))
    for item in make_plan(report,existing):
        if item["action"]=="create":
            result=gh("issue","create","--repo",repo,
                      "--title",item["title"],"--body",item["body"])
            print("Created independent review issue:",result.strip())
        else:
            number=str(item["number"])
            if item["action"]=="reopen":
                gh("issue","reopen",number,"--repo",repo)
            gh("issue","comment",number,"--repo",repo,"--body",item["body"])
            print("Appended source evidence to issue #"+number)

if __name__=="__main__":
    main()
