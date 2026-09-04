#!/usr/bin/env python3
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PLATFORMS_DIR = ROOT / "platforms"
INDEX_PATH = PLATFORMS_DIR / "index.json"


def load_json(path: Path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def dump_json(path: Path, data) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def platform_ids() -> list[str]:
    ids = load_json(INDEX_PATH)
    if not isinstance(ids, list) or not ids:
        raise SystemExit(f"{INDEX_PATH} must contain a non-empty list of ids")
    if not all(isinstance(platform_id, str) and platform_id for platform_id in ids):
        raise SystemExit(f"{INDEX_PATH} contains an invalid platform id")
    return ids


def platform_path(platform_id: str) -> Path:
    return PLATFORMS_DIR / platform_id / "index.json"


def iter_platform_entries():
    for platform_id in platform_ids():
        path = platform_path(platform_id)
        yield platform_id, path, load_json(path)
