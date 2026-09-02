#!/usr/bin/env python3
"""Split data/platforms.json into platforms/<id>/ folders.

Each platform directory contains:
  index.json     — entry matching platforms/_schema.json
  assets/        — device image copied from assets/devices/
  licenses/      — IMAGE / HARDWARE / SOFTWARE notices derived from the entry

The shared schema is copied from data/schema.json into platforms/_schema.json
with the image path description updated for the per-platform layout.

Also writes platforms/index.json (ordered list of ids) so the static
page can discover entries without a directory listing.

Does not delete or rewrite data/platforms.json.
Re-running is idempotent.
"""
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "data" / "platforms.json"
SCHEMA_SRC = ROOT / "data" / "schema.json"
PLATFORMS_DIR = ROOT / "platforms"
SCHEMA_DEST = PLATFORMS_DIR / "_schema.json"
LEGACY_IMAGE_DIR = ROOT / "assets" / "devices"

DROPPED_FIELDS = ("image_url", "specifications")

IMAGE_DESC = (
    "Path to illustration/photo relative to this platform directory "
    "(typically assets/<filename>)."
)


def load_json(path: Path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def dump_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
        f.write("\n")


def ensure_schema() -> dict:
    schema = load_json(SCHEMA_SRC)
    image = schema.get("properties", {}).get("image")
    if isinstance(image, dict):
        image["description"] = IMAGE_DESC
    dump_json(SCHEMA_DEST, schema)
    return schema


def allowed_keys(schema):
    return set(schema.get("properties", {}))


def property_order(schema):
    return list(schema.get("properties", {}))


def slim_entry(platform, keys, order):
    extra = [k for k in platform if k not in keys]
    for name in extra:
        if name not in DROPPED_FIELDS:
            print(f"  warning: dropping unknown field {name!r}", file=sys.stderr)
    slim = {k: platform[k] for k in order if k in platform}
    return slim


def resolve_image_src(image, dest_dir):
    if not image:
        return None
    name = Path(image).name
    candidates = [
        ROOT / image,
        LEGACY_IMAGE_DIR / name,
        dest_dir / "assets" / name,
    ]
    for path in candidates:
        if path.is_file():
            return path
    return None


def copy_image(platform, dest_dir):
    image = platform.get("image")
    src = resolve_image_src(image, dest_dir)
    assets_dir = dest_dir / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)
    if src is None:
        if image:
            print(f"  warning: image not found: {image}", file=sys.stderr)
        return f"assets/{Path(image).name}" if image else None
    dest = assets_dir / src.name
    if src.resolve() != dest.resolve():
        shutil.copy2(src, dest)
    return f"assets/{dest.name}"


def write_notice(path, lines):
    path.parent.mkdir(parents=True, exist_ok=True)
    body = "\n".join(line for line in lines if line is not None)
    path.write_text(body.rstrip() + "\n", encoding="utf-8")


def write_licenses(platform, dest_dir):
    licenses = dest_dir / "licenses"
    licenses.mkdir(parents=True, exist_ok=True)

    attr = platform.get("image_attribution") or {}
    if attr:
        write_notice(licenses / "IMAGE.txt", [
            f"Credit: {attr.get('credit') or 'n/a'}",
            f"License: {attr.get('license') or 'n/a'}",
            f"Source: {attr.get('source_url') or 'n/a'}",
            f"Retrieved: {attr.get('retrieved') or 'n/a'}",
        ])

    hw = (platform.get("availability") or {}).get("hw") or {}
    if hw.get("license") or hw.get("reference"):
        write_notice(licenses / "HARDWARE.txt", [
            f"License: {hw.get('license') or 'n/a'}",
            f"Reference: {hw.get('reference') or 'n/a'}",
            f"Notes: {hw.get('notes') or 'n/a'}",
        ])

    sw = (platform.get("availability") or {}).get("sw") or {}
    if sw.get("license") or sw.get("reference"):
        write_notice(licenses / "SOFTWARE.txt", [
            f"License: {sw.get('license') or 'n/a'}",
            f"Reference: {sw.get('reference') or 'n/a'}",
            f"Notes: {sw.get('notes') or 'n/a'}",
        ])


def validate(entry, schema, slug):
    try:
        import jsonschema
    except ImportError:
        missing = [k for k in schema.get("required", []) if k not in entry]
        if missing:
            raise SystemExit(f"{slug}: missing required fields {missing}")
        extra = [k for k in entry if k not in schema.get("properties", {})]
        if extra:
            raise SystemExit(f"{slug}: extra fields {extra}")
        return
    jsonschema.validate(entry, schema)


def migrate():
    platforms = load_json(SOURCE)
    if not isinstance(platforms, list):
        raise SystemExit(f"{SOURCE} is not a JSON array")

    schema = ensure_schema()
    keys = allowed_keys(schema)
    order = property_order(schema)
    PLATFORMS_DIR.mkdir(parents=True, exist_ok=True)

    seen = set()
    slugs = []
    for platform in platforms:
        slug = platform.get("id")
        if not slug or not isinstance(slug, str):
            raise SystemExit("platform entry missing string id")
        if slug in seen:
            raise SystemExit(f"duplicate platform id: {slug}")
        seen.add(slug)
        slugs.append(slug)

        dest_dir = PLATFORMS_DIR / slug
        dest_dir.mkdir(parents=True, exist_ok=True)

        rel_image = copy_image(platform, dest_dir)
        entry = slim_entry(platform, keys, order)
        if rel_image:
            entry["image"] = rel_image

        validate(entry, schema, slug)
        dump_json(dest_dir / "index.json", entry)
        write_licenses(platform, dest_dir)
        print(f"  {slug}")

    dump_json(PLATFORMS_DIR / "index.json", slugs)
    print(f"Migrated {len(slugs)} platforms → {PLATFORMS_DIR.relative_to(ROOT)}/")
    return 0


if __name__ == "__main__":
    sys.exit(migrate())
