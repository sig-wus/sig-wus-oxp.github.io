#!/usr/bin/env python3
import json
import sys
import urllib.parse
import urllib.request

from platform_registry import dump_json, iter_platform_entries


GITHUB_API = 'https://api.github.com/search/repositories?q='


def search_repository_url(platform_name: str):
    query = urllib.parse.quote(platform_name + ' in:name')
    url = GITHUB_API + query + '&per_page=1'
    with urllib.request.urlopen(url) as resp:
        data = json.load(resp)
    items = data.get('items') or []
    if not items:
        return None
    return items[0].get('html_url')


def main() -> int:
    updated = 0
    for platform_id, path, entry in iter_platform_entries():
        if entry.get('github'):
            continue
        try:
            github_url = search_repository_url(entry['platform'])
        except Exception as exc:
            sys.stderr.write(f'GitHub search failed for {entry["platform"]}: {exc}\n')
            continue
        if not github_url:
            continue
        entry['github'] = github_url
        dump_json(path, entry)
        updated += 1
        print(f'Added github link for {platform_id}')
    print(f'Updated {updated} platform entries')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
