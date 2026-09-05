#!/usr/bin/env python3
"""Regenerate platforms/index.json from the platforms/<id>/ directory tree.

Attribution: written by GLM (glm-5.3-flash) via the Oh My Pi coding harness,
2026-09-05, working with Dr. Richard Nauber on the SIG-WUS X-change repo.

The registry file is an ARTIFACT: contributors add a platform by creating
`platforms/<id>/index.json` only — this script enumerates the directories and
writes the id list. CI (see .github/workflows/registry.yml) runs it on every
push/PR so a forgotten registry update can no longer hide a platform.

Usage:
  python3 scripts/gen_registry.py            # rewrite platforms/index.json
  python3 scripts/gen_registry.py --check    # exit 1 if it would change

Ordering: stable and deterministic — sorted by id (alphabetically).
"""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLATFORMS_DIR = ROOT / "platforms"
INDEX_PATH = PLATFORMS_DIR / "index.json"
ID_PATTERN_OK = set("abcdefghijklmnopqrstuvwxyz0123456789-")


def discover_platform_dirs():
    """Return sorted ids of every directory containing an index.json."""
    entries = []
    for path in sorted(PLATFORMS_DIR.iterdir()):
        if not path.is_dir() or path.name.startswith("_"):
            continue
        if not (path / "index.json").is_file():
            continue
        pid = path.name
        bad = set(pid) - ID_PATTERN_OK
        if bad or pid != pid.lower() or pid.startswith("-") or pid.endswith("-"):
            raise SystemExit(
                f"Invalid platform id '{pid}': lowercase a-z, 0-9 and hyphens only"
            )
        entries.append(pid)
    return entries


def current_index():
    if INDEX_PATH.is_file():
        try:
            data = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
            if isinstance(data, list):
                return data
        except (json.JSONDecodeError, OSError):
            pass
    return []


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="only verify, don't write")
    args = parser.parse_args()

    if not PLATFORMS_DIR.is_dir():
        raise SystemExit(f"{PLATFORMS_DIR} does not exist")

    discovered = discover_platform_dirs()
    if not discovered:
        raise SystemExit("No platform directories found")

    known = current_index()
    # Preserve the existing registry order for ids that still exist; append
    # newly discovered ids in sorted order; drop removed ones.
    kept = [pid for pid in known if pid in discovered]
    added = sorted(set(discovered) - set(kept))
    merged = kept + added

    # Orphan check: ids in the file but with no directory would 404 in the UI.
    orphans = [pid for pid in known if pid not in discovered]
    if orphans:
        raise SystemExit(
            "platforms/index.json lists ids without a directory: " + ", ".join(orphans)
        )

    if args.check:
        if merged != known:
            missing = sorted(set(discovered) - set(known))
            msg = ["platforms/index.json is out of date."]
            if missing:
                msg.append(f"Platforms missing from the registry: {', '.join(missing)}")
            else:
                msg.append("Run: python3 scripts/gen_registry.py")
            raise SystemExit(" ".join(msg))
        print(f"platforms/index.json is up to date ({len(discovered)} platforms)")
        return

    INDEX_PATH.write_text(json.dumps(merged, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {INDEX_PATH.relative_to(ROOT)} with {len(merged)} platforms")
    if added:
        print(f"  newly registered: {', '.join(added)}")

if __name__ == "__main__":
    main()
