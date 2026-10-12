#!/usr/bin/env python3
"""Add journal homepage evidence to a pinned, lossless journal-universe index.

Inputs: the full free OpenAlex quarterly source snapshot (S3 JSONL), optionally
the DOAJ public journal CSV. Strong verified ISSN and conservative title
matching; no guessed URLs, publisher-root substitutions, or refabricated data.
Only source-declared homepage URLs are retained. Unresolved entries remain
searchable with an explicit audit reason.
"""
import argparse
import csv
import gzip
import io
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

OPENALEX_MANIFEST='https://openalex.s3.amazonaws.com/data/jsonl/sources/manifest.json'
DOAJ_CSV='https://doaj.org/csv'
HEADERS={'User-Agent':'ElysiaTools/1.7 academic-site-metadata (GitHub invoidstar/ElysiaTools)',
         'Accept':'application/json,text/csv,*/*'}
BLACKLIST_HOSTS={'doi.org','dx.doi.org','openalex.org','api.openalex.org','crossref.org',
                 'doaj.org','scholar.google.com','google.com','scopus.com','scimagojr.com',
                 'webofscience.com','pubmed.ncbi.nlm.nih.gov','researchgate.net',
                 'wikipedia.org','wikipedia.com','arxiv.org'}
DIRECTORY_ROOTS={'elsevier.com','www.elsevier.com','springer.com','link.springer.com',
                 'wiley.com','onlinelibrary.wiley.com','tandfonline.com',
                 'academic.oup.com','journals.sagepub.com','nature.com',
                 'sciencedirect.com','www.sciencedirect.com','www.mdpi.com'}
def normalize(value):
    return re.sub(r'[^\w]', '', str(value or '').casefold(), flags=re.UNICODE)
def canonical_issn(value):
    s=re.sub(r'[^0-9X]','',str(value or '').upper())
    if not re.fullmatch(r'\d{7}[\dX]',s):
        return ''
    total=sum((10 if c=='X' else int(c))*(8-i) for i,c in enumerate(s))
    return s[:4]+'-'+s[4:] if total%11==0 else ''
def safe_site(raw):
    raw=str(raw or '').strip()
    if len(raw)>900 or not raw or re.search(r'[\x00-\x1f]',raw):
        return ''
    try:
        url=urllib.parse.urlsplit(raw)
        hostname=(url.hostname or '').lower()
        if url.scheme.lower() not in ('https','http') or not hostname or url.username or url.password:
            return ''
        if hostname in BLACKLIST_HOSTS or any(hostname.endswith('.'+h) for h in BLACKLIST_HOSTS):
            return ''
        if hostname in DIRECTORY_ROOTS and url.path.strip('/')=='':
            return ''
        if hostname.endswith('.invalid') or hostname in ('localhost','127.0.0.1'):
            return ''
        return raw
    except ValueError:
        return ''
def get(url,timeout=45,attempts=3):
    error=None
    for i in range(attempts):
        try:
            req=urllib.request.Request(url,headers=HEADERS)
            return urllib.request.urlopen(req,timeout=timeout)
        except (OSError,urllib.error.HTTPError) as e:
            error=e
            if i+1<attempts:
                time.sleep(2*(i+1))
    raise RuntimeError(f'Unable to fetch {url}: {error}')

def read_openalex():
    with get(OPENALEX_MANIFEST) as response:
        manifest=json.load(response)
    files=manifest.get('files') or []
    if len(files)<1:
        raise RuntimeError('OpenAlex sources manifest has no files')
    if len(files)>400:
        raise RuntimeError('Refusing unusually large OpenAlex sources manifest')
    index={}
    records=0
    websites=0
    for file in files:
        key=file.get('url','')
        if key.startswith('s3://openalex/'):
            url='https://openalex.s3.amazonaws.com/'+key[len('s3://openalex/'):]
        elif key.startswith('https://openalex.s3.amazonaws.com/'):
            url=key
        else:
            raise RuntimeError('Unexpected OpenAlex manifest item: '+str(key))
        if not url.endswith('.gz') or '/sources/' not in url:
            raise RuntimeError('Not an OpenAlex sources archive: '+url)
        with get(url,timeout=90) as response:
            with gzip.GzipFile(fileobj=response,mode='rb') as decompressed:
                for raw in decompressed:
                    records+=1
                    try: record=json.loads(raw)
                    except ValueError: continue
                    if record.get('type')!='journal':
                        continue
                    homepage=safe_site(record.get('homepage_url'))
                    if not homepage:
                        continue
                    ids=[canonical_issn(x) for x in (record.get('issn') or [])]
                    issn_l=canonical_issn(record.get('issn_l'))
                    if issn_l: ids.append(issn_l)
                    ids=sorted(set(x for x in ids if x))
                    titles=[record.get('display_name') or '']+(record.get('alternate_titles') or [])
                    titles=sorted(set(normalize(x) for x in titles if x))
                    if not ids and not titles:
                        continue
                    rid=str(record.get('id') or '')
                    if not re.fullmatch(r'https://openalex.org/S\d+',rid):
                        continue
                    item={'url':homepage,'issns':ids,'names':titles,'ref':rid,'source':'openalex'}
                    index[rid]=item
                    websites+=1
    if records<150000 or websites<12000:
        raise RuntimeError(f'Snapshot appears incomplete: {records} sources / {websites} websites')
    return list(index.values()), {'snapshotDate':manifest.get('date'), 'records':records,
            'journalHomepages':websites,'files':len(files),'sourceUrl':OPENALEX_MANIFEST}

def read_doaj():
    items=[]
    downloaded=0
    try:
        with get(DOAJ_CSV,timeout=120,attempts=2) as response:
            text=io.TextIOWrapper(response,encoding='utf-8-sig',errors='replace',newline='')
            reader=csv.DictReader(text)
            required={'Journal title','Journal URL','Journal ISSN (print version)',
                      'Journal EISSN (online version)'}
            columns=set(reader.fieldnames or [])
            if not required.issubset(columns):
                raise RuntimeError('DOAJ download has unexpected header '+str(list(columns)[:8]))
            for row in reader:
                downloaded+=1
                url=safe_site(row.get('Journal URL'))
                if not url:continue
                ids=[canonical_issn(row.get('Journal ISSN (print version)')),
                     canonical_issn(row.get('Journal EISSN (online version)'))]
                ids=sorted(set(x for x in ids if x))
                title=normalize(row.get('Journal title'))
                if not ids and not title:continue
                ref=str(row.get('URL in DOAJ') or '')
                if ref and not ref.startswith('https://doaj.org/'):ref=''
                items.append({'url':url,'issns':ids,'names':[title] if title else [],
                              'ref':ref,'source':'doaj'})
        if downloaded<10000:raise RuntimeError('DOAJ CSV rows unexpectedly low: '+str(downloaded))
        return items,{'downloaded':downloaded,'homepages':len(items),'url':DOAJ_CSV}
    except (OSError,urllib.error.HTTPError,UnicodeError,RuntimeError) as exc:
        # DOAJ is an auxiliary source. The mandatory OpenAlex public snapshot
        # still supports a full-source crosswalk if DOAJ blocks CI.
        print('WARNING: DOAJ CSV unavailable; using OpenAlex snapshot only: '+str(exc),flush=True)
        return [],{'downloaded':0,'homepages':0,'error':str(exc),'url':DOAJ_CSV}

def make_index(records):
    by_issn=defaultdict(list)
    by_title=defaultdict(list)
    for record in records:
        for issn in record['issns']:
            by_issn[issn].append(record)
        for title in record['names']:
            if title:by_title[title].append(record)
    return by_issn,by_title

def select_homepage(row,by_issn,by_title):
    title=normalize(row[1])
    names=set(normalize(x) for x in [row[1],*(row[7] or [])] if x)
    ids=set(canonical_issn(x) for x in
        [row[2],row[3],*(row[11] or [])])
    ids.discard('')
    candidates={}
    for identifier in ids:
        for record in by_issn.get(identifier,[]):
            candidates[record['ref'] or (record['source']+'|'+record['url'])]=record
    method='issn' if candidates else 'title'
    if not candidates:
        # Text matching is inherently ambiguous when an ISSN is present, so
        # do not silently override missing/ambiguous valid ISSN evidence.
        if ids:return None,'not-in-source'
        for name in names:
            for record in by_title.get(name,[]):
                candidates[record['ref'] or (record['source']+'|'+record['url'])]=record
    if not candidates:return None,'not-in-source'
    found=list(candidates.values())
    exact=[record for record in found if names.intersection(record['names'])]
    if len(exact)==1:
        selected=exact[0]
    elif len(found)==1 and method=='issn':
        selected=found[0]
    else:
        # If the same journal is in multiple source records, keep a URL only
        # when the sources point to exactly the same declared website.
        urls=set(r['url'] for r in (exact or found))
        if len(urls)!=1:return None,'ambiguous'
        selected=(exact or found)[0]
    return selected,method

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--index',default='public/data/journal-universe.json')
    p.add_argument('--audit',default='public/data/journal-websites-audit.json')
    p.add_argument('--coverage',default='public/data/journal-coverage.json')
    p.add_argument('--baseline',default='data/journals.json')
    p.add_argument('--cache',default='.cache/journal-websites/openalex-sites.json')
    args=p.parse_args()
    universe=json.loads(Path(args.index).read_text(encoding='utf-8'))
    if universe.get('version')!=2 or len(universe['entries'])<20000:
        raise RuntimeError('Unexpected annual journal index')
    cached=Path(args.cache)
    if cached.exists():
        info=json.loads(cached.read_text(encoding='utf-8'))
        openalex=info['records']
        oa_stats=info['sourceInfo']
    else:
        openalex,oa_stats=read_openalex()
        cached.parent.mkdir(parents=True,exist_ok=True)
        cached.write_text(json.dumps({'records':openalex,'sourceInfo':oa_stats},
                         ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    doaj,doaj_stats=read_doaj()
    ao_by_issn,ao_by_title=make_index(openalex)
    dj_by_issn,dj_by_title=make_index(doaj)
    baseline=json.loads(Path(args.baseline).read_text(encoding='utf-8'))
    curated={r['id']:safe_site(r.get('website')) for r in baseline if r.get('website')}
    stats={'indexed':len(universe['entries']),'curated':0,'doaj':0,'openalex':0,
           'unresolved':0,'ambiguous':0,'notInSources':0,'byISSN':0,'byTitle':0}
    missing=[]
    for row in universe['entries']:
        if len(row)!=17:
            raise RuntimeError('Index schema changed unexpectedly for '+row[0]+': '+str(len(row)))
        curated_url=curated.get(row[0])
        if curated_url:
            row.extend([curated_url,'curated','', 'curated'])
            stats['curated']+=1
            continue
        chosen,method=select_homepage(row,dj_by_issn,dj_by_title)
        if not chosen:
            chosen,method=select_homepage(row,ao_by_issn,ao_by_title)
        if chosen:
            row.extend([chosen['url'],chosen['source'],chosen['ref'],method])
            stats[chosen['source']]+=1
            stats['byISSN' if method=='issn' else 'byTitle']+=1
        else:
            row.extend(['','','',''])
            stats['unresolved']+=1
            stats['ambiguous' if method=='ambiguous' else 'notInSources']+=1
            missing.append({'id':row[0],'name':row[1],'reason':method})
    stats['withHomepage']=stats['indexed']-stats['unresolved']
    if stats['withHomepage']<12000:
        raise RuntimeError('Homepage coverage unexpectedly low '+str(stats))
    universe['homepageIndexVersion']=1
    Path(args.index).write_text(json.dumps(universe,ensure_ascii=False,
                              separators=(',',':')),encoding='utf-8')
    summary=json.loads(Path(args.coverage).read_text(encoding='utf-8'))
    summary['homepageCoverage']=stats
    summary['homepageDataSources']={'openalex':oa_stats,'doaj':doaj_stats}
    Path(args.coverage).write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',
                                   encoding='utf-8')
    Path(args.audit).write_text(json.dumps({
        'sources':summary['homepageDataSources'],'coverage':stats,
        'unresolvedJournals':missing,
    },ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Journal homepage enrichment:',json.dumps(stats,ensure_ascii=False),flush=True)

if __name__=='__main__':
    main()
