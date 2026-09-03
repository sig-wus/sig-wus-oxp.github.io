#!/usr/bin/env python3
import re

from platform_registry import dump_json, iter_platform_entries


def clean_data_link(value: str) -> str:
    value = value.replace('\\,', ',')
    value = value.replace('\\', '')
    value = value.replace('{', '').replace('}', '')
    value = value.replace(',,', ',')
    value = re.sub(r',\s*,+', ',', value)
    return value.strip(', ')


def main() -> int:
    cleaned = 0
    for platform_id, path, entry in iter_platform_entries():
        data_link = entry.get('data_link')
        if not isinstance(data_link, str):
            continue
        fixed = clean_data_link(data_link)
        if fixed == data_link:
            continue
        entry['data_link'] = fixed
        dump_json(path, entry)
        cleaned += 1
        print(f'Cleaned {platform_id}')
    print(f'Updated {cleaned} platform entries')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
