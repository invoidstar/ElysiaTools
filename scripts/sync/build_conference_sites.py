#!/usr/bin/env python3
"""Build a source-linked conference homepage crosswalk from pinned ccfddl YAML.

Never synthesize URLs or replace an event's verified edition website. The
contributor-maintained ccfddl links are marked as such in the UI and audit.
"""
import argparse
import json
import re
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlparse

import yaml

CCFDDL_SHA = '7ceb4f4f9545c041d66467b456cd9a4a9166251f'
CCFDDL_SOURCE = f'https://github.com/ccfddl/ccf-deadlines/tree/{CCFDDL_SHA}/conference'

def normalize(value):
    return re.sub(r'[^a-z0-9]', '', (value or '').lower())

def url_valid(value):
    if not isinstance(value, str):
        return False
    try:
        parsed = urlparse(value.strip())
        return parsed.scheme in ('https', 'http') and bool(parsed.hostname) \
            and not parsed.username and not parsed.password \
            and len(value) < 850 and not parsed.hostname.endswith('.invalid')
    except ValueError:
        return False

def read_confs(directory):
    records = []
    for file in sorted(Path(directory).glob('conference/**/*.yml')):
        if file.name == 'types.yml':
            continue
        try:
            contents = yaml.safe_load(file.read_text(encoding='utf-8'))
        except (yaml.YAMLError, UnicodeError) as exc:
            raise RuntimeError(f'Unable to read {file}: {exc}') from exc
        items = contents if isinstance(contents, list) else [contents]
        for group in items:
            if not isinstance(group, dict) or not group.get('title'):
                continue
            years = {}
            for annual in group.get('confs') or []:
                if not isinstance(annual, dict):
                    continue
                year = annual.get('year')
                link = str(annual.get('link') or '').strip()
                if isinstance(year, int) and 1990 <= year <= 2032 and url_valid(link):
                    # Keep first source-declared link for a given calendar year.
                    years.setdefault(str(year), link)
            records.append({
                'name': str(group['title']).strip(),
                'dblp': str(group.get('dblp') or '').strip(),
                'years': years,
                'file': str(file.relative_to(directory)).replace('\\', '/'),
            })
    return records

def dblp_slug(url):
    matched = re.search(r'/db/conf/([^/?#]+)/?', url or '', re.I)
    return matched.group(1).lower() if matched else ''

def build(conferences, editions, sources):
    by_title = defaultdict(list)
    by_dblp = defaultdict(list)
    for record in sources:
        by_title[normalize(record['name'])].append(record)
        if record['dblp']:
            by_dblp[record['dblp'].lower()].append(record)
    editions_by_id = defaultdict(list)
    for edition in editions:
        editions_by_id[edition['conferenceId']].append(edition)

    profiles = []
    issues = []
    coverage = defaultdict(int)
    coverage['total'] = len(conferences)
    year_total = 0
    for conf in conferences:
        acronym = normalize(conf.get('acronym'))
        slug = dblp_slug(conf.get('indexUrl'))
        candidates = by_title.get(acronym, [])
        method = 'acronym'
        if len(candidates) != 1 and slug:
            candidates = by_dblp.get(slug, [])
            method = 'dblp'
        record = candidates[0] if len(candidates) == 1 else None
        if len(candidates) > 1:
            issues.append({'id':conf['id'], 'reason':'ambiguous-upstream-identity'})
            coverage['ambiguous'] += 1
        yearly = {}
        if record:
            for year, site in record['years'].items():
                yearly[year] = {'url':site,'source':'ccfddl',
                                'reference':CCFDDL_SOURCE + '/' + record['file'].split('/', 1)[-1]}
            coverage['matchedSeries'] += 1
        # Prefer explicitly curated annual information in local editions.
        for edition in editions_by_id[conf['id']]:
            if url_valid(edition.get('website')):
                yearly[str(edition['year'])] = {
                    'url':edition['website'], 'source':'curated-edition',
                    'reference':edition.get('websiteSourceId') or edition.get('sourceId') or ''
                }
        if yearly:
            coverage['seriesWithYearSites'] += 1
            year_total += len(yearly)
        curated = conf.get('website') if url_valid(conf.get('website')) else None
        # Do NOT infer or construct a conference-series official homepage by
        # stripping year digits from edition sites.
        if curated:
            coverage['curatedSite'] += 1
        if record and record['years']:
            coverage['hasCommunityYearSites'] += 1
        if not yearly and not curated:
            coverage['unresolved'] += 1
            issues.append({'id':conf['id'], 'reason':'no-sourced-webpage',
                           'name':conf['acronym']})
        profiles.append({
            'id':conf['id'],
            'website':curated,
            'years':[{'year':int(year),**info} for year, info in
                     sorted(yearly.items(), key=lambda x:int(x[0]), reverse=True)],
            'source':'ccfddl' if record else None,
            'match':method if record else None,
        })
    coverage['yearLinks'] = year_total
    coverage['withAnyLink'] = coverage['total'] - coverage['unresolved']
    return profiles, dict(coverage), issues

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--upstream-dir', required=True)
    p.add_argument('--conferences', default='data/conferences.json')
    p.add_argument('--editions', default='data/editions.json')
    p.add_argument('--output', default='public/data/conference-websites.json')
    p.add_argument('--audit', default='public/data/conference-websites-audit.json')
    args = p.parse_args()
    source = read_confs(args.upstream_dir)
    if len(source) < 250:
        raise RuntimeError('Incomplete ccfddl source directory: '+str(len(source)))
    conf = json.loads(Path(args.conferences).read_text(encoding='utf-8'))
    editions = json.loads(Path(args.editions).read_text(encoding='utf-8'))
    profiles, coverage, issues = build(conf, editions, source)
    if coverage['matchedSeries'] < 190 or coverage['yearLinks'] < 600:
        raise RuntimeError('Suspiciously small conference website index: '+str(coverage))
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    Path(args.output).write_text(json.dumps({
        'version':1, 'revision':CCFDDL_SHA,'records':profiles,
    }, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    Path(args.audit).write_text(json.dumps({
        'source':CCFDDL_SOURCE, 'sourceFiles':len(source),
        'coverage':coverage, 'unresolvedAndAmbiguous':issues,
    }, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print('Conference website index:',json.dumps(coverage,ensure_ascii=False))

if __name__ == '__main__':
    main()
