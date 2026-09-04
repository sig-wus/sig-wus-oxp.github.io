#!/usr/bin/env python3
import re

from platform_registry import dump_json, iter_platform_entries


qty_pat = re.compile(r'\\qty\{([^}]+)\}\{\\?([a-zA-Z]+)\}')
qtyprod_pat = re.compile(r'\\qtyproduct\{([^}]+)\}\{\\?mm\}')
weight_pat = re.compile(r'\\weight~\\qty\{([^}]+)\}\{\\?gram\}')
fr_pat = re.compile(r'\\framerate~\\qty\{([^}]+)\}\{\\?Hz\}')
op_pat = re.compile(r'\\operation~\\qty\{([^}]+)\}\{\\?hour\}')

def clean_text(s: str) -> str:
    r"""Remove LaTeX markup from a string.

    Handles the specific patterns used in the catalog, such as
    \qty{value}{unit}, \qtyproduct{value}{mm}, weight, framerate, and operation
    macros, as well as generic LaTeX commands, math delimiters, citations,
    and non‑breaking spaces.
    """
    # Quantity patterns
    s = qty_pat.sub(lambda m: f"{m.group(1)} {m.group(2)}", s)
    s = qtyprod_pat.sub(lambda m: f"{m.group(1).replace(' ', '×')} mm", s)
    s = weight_pat.sub(lambda m: f"Weight: {m.group(1)} g", s)
    s = fr_pat.sub(lambda m: f"Framerate: {m.group(1)} Hz", s)
    s = op_pat.sub(lambda m: f"Operation: {m.group(1)} h", s)

    # Approximate symbol within math mode
    s = re.sub(r'\$\\approx\$', '≈', s)
    # Remove citations
    s = re.sub(r'\\cite\{[^}]*\}', '', s)
    # Remove generic LaTeX commands (with optional argument)
    s = re.sub(r'\\[a-zA-Z]+(?:\{[^}]*\})?', '', s)
    # Collapse whitespace
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def clean_value(value):
    if isinstance(value, str):
        return clean_text(value)
    if isinstance(value, list):
        return [clean_value(item) for item in value]
    if isinstance(value, dict):
        return {key: clean_value(item) for key, item in value.items()}
    return value


def main() -> int:
    cleaned = 0
    for platform_id, path, entry in iter_platform_entries():
        updated = clean_value(entry)
        if updated == entry:
            continue
        dump_json(path, updated)
        cleaned += 1
        print(f'Cleaned {platform_id}')
    print(f'Updated {cleaned} platform entries')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
