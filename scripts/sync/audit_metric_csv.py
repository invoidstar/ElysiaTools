#!/usr/bin/env python3
"""Audit the three ShowJCR reference CSVs without exporting licensed metrics.

The audit deliberately publishes only aggregate match counts. The raw records
and derived per-journal JCR/CAS/XinRui rankings are neither copied nor emitted
to ElysiaTools public GitHub Pages.

Usage:
python3 scripts/sync/audit_metric_csv.py \
  --cas ~/Downloads/FQBJCR2025-UTF8.csv \
  --xinrui ~/Downloads/XR2026-UTF8.csv \
  --jcr ~/Downloads/JCR2025-UTF8.csv
"""
import argparse
import csv
import json
import re
import sys
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CSV_SPECS = {
    "cas2025": ("cas", "大类分区", "2025"),
    "xinrui2026": ("xinrui", "大类新锐分区", "2026"),
    "jcr2025": ("jcr", "IF Quartile(2025)_1", "2025"),
}


def normalize_title(title: str) -> str:
    normalized = unicodedata.normalize("NFKC", str(title or "")).upper()
    return re.sub(r"[^A-Z0-9]", "", normalized)


def identifiers(record):
    values = []
    for key in ("ISSN", "EISSN", "issn", "eissn", "issnL", "ISSN-L"):
        raw = record.get(key) or ""
        for value in re.split(r"[/;,|\s]+", str(raw)):
            value = value.upper().strip()
            if re.fullmatch(r"\d{4}-\d{3}[\dX]", value):
                values.append(value)
    return list(dict.fromkeys(values))


def build_identity_index(journals):
    by_title, by_issn = {}, {}
    conflicts = set()
    for item in journals:
        for alias in [item["name"], *(item.get("aliases") or [])]:
            key = normalize_title(alias)
            if key in by_title and by_title[key] != item["id"]:
                conflicts.add(key)
            elif key:
                by_title[key] = item["id"]
        for value in identifiers(item):
            if value in by_issn and by_issn[value] != item["id"]:
                # Conflict: refuse to use an ambiguous ISSN at all.
                by_issn[value] = None
            elif value not in by_issn:
                by_issn[value] = item["id"]
    for key in conflicts:
        by_title.pop(key, None)
    return by_title, by_issn


def has_indicator(row, kind):
    if kind == "cas":
        return bool(re.match(r"^\s*[1-4]\s*(?:\[|区|區)", row.get("大类分区") or ""))
    if kind == "xinrui":
        return bool(re.match(r"^\s*[1-4]\s*(?:\[|区|區)", row.get("大类新锐分区") or ""))
    return any(
        re.fullmatch(r"Q[1-4]", (value or "").strip(), re.IGNORECASE)
        for key, value in row.items() if key.startswith("IF Quartile(2025)_")
    )


def audit(path: Path, kind: str, by_title, by_issn):
    matches, counts, unknown, ambiguous = set(), Counter(), 0, 0
    with path.open("r", encoding="utf-8-sig", newline="") as stream:
        rows = csv.DictReader(stream)
        if not rows.fieldnames or "Journal" not in rows.fieldnames:
            raise ValueError(f"Missing Journal header: {path}")
        for row in rows:
            counts["rows"] += 1
            joined = set(by_issn.get(x) for x in identifiers(row))
            joined.discard(None)
            if len(joined) > 1:
                ambiguous += 1
                continue
            matched = next(iter(joined), None)
            if not matched:
                matched = by_title.get(normalize_title(row.get("Journal")))
            if not matched:
                unknown += 1
                continue
            counts["matchedRows"] += 1
            if has_indicator(row, kind):
                matches.add(matched)
                counts["validIndicatorRows"] += 1
    return {
        "source": path.name,
        "rows": counts["rows"],
        "matchedJournalIdentities": len(matches),
        "validIndicatorRows": counts["validIndicatorRows"],
        "ambiguousRows": ambiguous,
        "unmatchedRows": unknown,
        "warning": "Counts only. No third-party rating values have been exported.",
    }


def main():
    parser = argparse.ArgumentParser()
    for flag in ("cas", "xinrui", "jcr"):
        parser.add_argument("--" + flag, type=Path, required=True)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    journals = json.loads((ROOT / "data/journals.json").read_text(encoding="utf-8"))
    by_title, by_issn = build_identity_index(journals)
    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "catalogSize": len(journals),
        "status": "source-matching-audit-only",
        "sources": {
            "cas2025": audit(args.cas, "cas", by_title, by_issn),
            "xinrui2026": audit(args.xinrui, "xinrui", by_title, by_issn),
            "jcr2025": audit(args.jcr, "jcr", by_title, by_issn),
        },
        "distribution": "No licensed bulk source data or per-journal metric values are written.",
    }
    result = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.report:
        args.report.write_text(result, encoding="utf-8")
    else:
        sys.stdout.write(result)


if __name__ == "__main__":
    main()
