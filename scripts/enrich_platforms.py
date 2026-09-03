#!/usr/bin/env python3
import re

from platform_registry import dump_json, iter_platform_entries


qty_pat = re.compile(r'\\qty\{([^}]+)\}\{\\?([a-zA-Z]+)\}')
qtyprod_pat = re.compile(r'\\qtyproduct\{([^}]+)\}\{\\?mm\}')
weight_pat = re.compile(r'\\weight~\\qty\{([^}]+)\}\{\\?gram\}')
fr_pat = re.compile(r'\\framerate~\\qty\{([^}]+)\}\{\\?Hz\}')
op_pat = re.compile(r'\\operation~\\qty\{([^}]+)\}\{\\?hour\}')

size_pat = re.compile(r'([0-9]+(?:\.[0-9]*)?)\s*(?:×|x)\s*([0-9]+(?:\.[0-9]*)?)\s*(?:×|x)\s*([0-9]+(?:\.[0-9]*)?)\s*mm', re.I)
power_pat = re.compile(r'Power:\s*([0-9]+(?:\.[0-9]*)?)\s*W', re.I)
framerate_pat = re.compile(r'Framerate:\s*([0-9]+(?:\.[0-9]*)?)\s*Hz', re.I)
weight_text_pat = re.compile(r'Weight:\s*([0-9]+(?:\.[0-9]*)?)\s*g', re.I)
operation_pat = re.compile(r'Operation:\s*([0-9]+(?:\.[0-9]*)?)\s*h', re.I)

def normalize_specifications(specs: str) -> str:
    specs = qty_pat.sub(lambda m: f"{m.group(1)} {m.group(2)}", specs)
    specs = qtyprod_pat.sub(lambda m: f"{m.group(1).replace(' ', '×')} mm", specs)
    specs = weight_pat.sub(lambda m: f"Weight: {m.group(1)} g", specs)
    specs = fr_pat.sub(lambda m: f"Framerate: {m.group(1)} Hz", specs)
    specs = op_pat.sub(lambda m: f"Operation: {m.group(1)} h", specs)
    specs = re.sub(r'\\[a-zA-Z]+~', '', specs)
    specs = re.sub(r'\\[a-zA-Z]+\{[^}]*\}', '', specs)
    return re.sub(r'\s+', ' ', specs).strip()


def main() -> int:
    updated = 0
    for platform_id, path, entry in iter_platform_entries():
        specs = entry.get('specifications')
        if not isinstance(specs, str):
            continue
        normalized = normalize_specifications(specs)
        changed = normalized != specs
        entry['specifications'] = normalized

        fr = framerate_pat.search(normalized)
        if fr:
            entry['framerate'] = f"{fr.group(1)} Hz"
            changed = True
        wt = weight_text_pat.search(normalized)
        if wt:
            entry['weight'] = f"{wt.group(1)} g"
            changed = True
        op = operation_pat.search(normalized)
        if op:
            entry['operation'] = f"{op.group(1)} h"
            changed = True
        sz = size_pat.search(normalized)
        if sz:
            entry['size'] = f"{sz.group(1)}×{sz.group(2)}×{sz.group(3)} mm"
            changed = True
        pw = power_pat.search(normalized)
        if pw:
            entry['power'] = f"{pw.group(1)} W"
            changed = True

        if not changed:
            continue
        dump_json(path, entry)
        updated += 1
        print(f'Enriched {platform_id}')

    print(f'Updated {updated} platform entries')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
