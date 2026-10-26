#!/usr/bin/env python3
"""Conservative source monitoring: two successful observations confirm a change.

An outage, HTTP 429, dynamic one-off page mutation or expired cache never
silently changes an academic date. Verified changes create GitHub review
issues; the original submission data always stays under human control.
"""
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
MONITORED = {"official-cfp", "official-history", "publisher-history",
             "classification", "publisher-metric"}
USER_AGENT = "ElysiaTools-SourceHealth/1.8 (+https://github.com/invoidstar/ElysiaTools)"

class ReadableHTML(HTMLParser):
    def __init__(self):
        super().__init__()
        self.suppressed = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "svg", "noscript"}:
            self.suppressed += 1

    def handle_endtag(self, tag):
        if tag in {"script", "style", "svg", "noscript"} and self.suppressed:
            self.suppressed -= 1

    def handle_data(self, data):
        if not self.suppressed:
            self.parts.append(data)

def fingerprint(body, content_type):
    if "html" in (content_type or "").lower():
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
            content_type = response.headers.get("Content-Type", "")
            # Official fact sheets and program reports are often PDFs >2 MB.
            # Stream a bounded PDF body rather than treating these as broken links.
            is_pdf = ("pdf" in content_type.lower() or
                      source["url"].split("?", 1)[0].lower().endswith(".pdf"))
            max_bytes = 24 * 1024 * 1024 if is_pdf else 2_000_000
            body = response.read(max_bytes + 1)
            if len(body) > max_bytes:
                label = "24 MiB PDF" if is_pdf else "2 MB HTML/other"
                return {"ok": False, "error": "Source exceeds "+label+" inspection limit; manual review"}
            return {"ok": True, "status": response.status,
                    "finalUrl": response.geturl(),
                    "fingerprint": fingerprint(body,content_type),
                    "bytesRead": len(body)}
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        return {"ok": False, "error": str(error)[:250]}

def inspect(sources, prior, get=fetch):
    previous=prior.get("sources",{})
    snapshots=dict(previous)
    rows=[]
    for source in sources:
        if source.get("kind") not in MONITORED:
            continue
        observed=get(source)
        entry={**observed,"id":source["id"],"url":source["url"],"kind":source["kind"]}
        old=previous.get(source["id"])
        new=observed.get("fingerprint")
        if not observed.get("ok") or not new:
            entry["state"]="unreachable"
        elif not old or old.get("url")!=source["url"]:
            entry["state"]="baseline_created"
            snapshots[source["id"]]={"url":source["url"],"fingerprint":new}
        elif new==old.get("fingerprint"):
            entry["state"]="unchanged"
            snapshots[source["id"]]={"url":source["url"],"fingerprint":new}
        elif new==old.get("candidate"):
            entry["state"]="changed"
            entry["previousFingerprint"]=old.get("fingerprint")
            snapshots[source["id"]]={"url":source["url"],"fingerprint":new}
        else:
            entry["state"]="pending_confirmation"
            entry["previousFingerprint"]=old.get("fingerprint")
            snapshots[source["id"]]={"url":source["url"],
                                     "fingerprint":old.get("fingerprint"),
                                     "candidate":new}
        rows.append(entry)
    kinds=("changed","unchanged","unreachable","baseline_created","pending_confirmation")
    counts={state:sum(row["state"]==state for row in rows) for state in kinds}
    now=datetime.now(timezone.utc).isoformat()
    report={"checkedAt":now,
            "policy":"Two successful observations confirm a changed page; no automatic deadline edits.",
            "total":len(rows),"summary":counts,
            "requiresReview":[r["id"] for r in rows if r["state"]=="changed"],
            "candidates":[r["id"] for r in rows if r["state"]=="pending_confirmation"],
            "networkProblems":[r["id"] for r in rows if r["state"]=="unreachable"],
            "results":rows}
    snapshot={"version":3,"updatedAt":now,"sources":snapshots}
    return report,snapshot

def report_markdown(report):
    counts=report["summary"]
    lines=["## ElysiaTools academic source monitor","",
           f"Checked: {report['checkedAt']}","",
           f"- Curated sources scanned: **{report['total']}**",
           f"- New baselines: **{counts['baseline_created']}**",
           f"- Unchanged: **{counts['unchanged']}**",
           f"- Candidate content changes (one observation): **{counts['pending_confirmation']}**",
           f"- Confirmed changed pages needing review: **{counts['changed']}**",
           f"- HTTP/network/size failures: **{counts['unreachable']}**","",
           "A confirmed content change still **does not prove a date or acceptance rate changed**."]
    for state,label in (("changed","Confirmed changes"),("pending_confirmation","Unconfirmed changes"),
                        ("unreachable","Request failures")):
        matching=[r for r in report["results"] if r["state"]==state]
        if matching:
            lines+=["","### "+label]
            for r in matching:
                lines.append(f"- [{r['id']}]({r['url']}) — {r.get('error',state)}")
    return "\n".join(lines)+"\n"

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--baseline",default=".cache/source-health/previous.json")
    parser.add_argument("--snapshot",default=".cache/source-health/current.json")
    parser.add_argument("--output",default="source-health-report.json")
    parser.add_argument("--markdown",default="source-health-report.md")
    parser.add_argument("--delay",type=float,default=0.35)
    args=parser.parse_args()
    sources=json.loads((ROOT/"data/sources.json").read_text(encoding="utf-8"))
    try:
        prior=json.loads(Path(args.baseline).read_text(encoding="utf-8"))
    except (OSError,json.JSONDecodeError):
        prior={}
    def throttled(source):
        if throttled.count:
            time.sleep(max(0,args.delay))
        throttled.count+=1
        return fetch(source)
    throttled.count=0
    report,snapshot=inspect(sources,prior,throttled)
    for name,obj,is_json in (
        (args.output,report,True),(args.snapshot,snapshot,True),
        (args.markdown,report_markdown(report),False)
    ):
        target=Path(name)
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_text((json.dumps(obj,ensure_ascii=False,indent=2)+"\n")
                          if is_json else obj,encoding="utf-8")
    for row in report["results"]:
        if row["state"] in ("changed","unreachable"):
            print("::warning title=Academic source review::"+row["id"]+
                  " ("+row["state"]+")")
    print("Source monitor:",json.dumps(report["summary"]))

if __name__=="__main__":
    main()
