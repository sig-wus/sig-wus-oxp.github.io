# Contributing to SIG-WUS X-change Platform

We welcome contributions. The catalog is intentionally small and curated; every entry
must be traceable to a primary source.

## Provenance and attribution

The platform list, technical specifications, and reference structure originate from:

> D. Weik, R. Nauber, E. Kaiser, N. Kirsch, R. Kunz, L. Schierling, C. Leitner, L. Benini,
> H.-C. Liu, Q. Zhou, J. Hampe, G. Fettweis, M. Herzog, C. Kupsch.
> *Current Trends in Ultrasound Wearables: Spotlight on System Architecture*.
> **IEEE Reviews in Biomedical Engineering**, 2026.
> DOI: [10.1109/RBME.2026.3664011](https://doi.org/10.1109/RBME.2026.3664011)

When you add or update an entry, **cite the primary publication that first described the
platform** in the `paper` field (prefer a DOI URL), and ensure the `reference` field
matches the BibTeX key in the source paper.

## Prerequisites
- Fork the repository.
- Clone your fork locally.
- Have Python 3 and the `uv` tool available (for optional schema validation).

## Adding a new platform

1. Create a new folder `platforms/<id>/` and add `platforms/<id>/index.json`
   conforming to `platforms/_schema.json`. The required fields are: `id`,
   `platform`, `manufacturer`, `category`, `transducer`, `tx`, `rx`, `specs`,
   `application`, `access`, `availability`.
2. Cite the primary source:
   - `paper` — DOI URL of the publication (e.g. `https://doi.org/10.1109/...`).
   - `reference` — BibTeX key matching the source paper.
   - `github` / `website` — only if an official source exists; do not invent URLs.
3. Specify source availability honestly under `availability`:
   - `hw` — `open_source` boolean + `schematics` / `gerber` / `bom` enums
     (`open` | `partial` | `closed` | `planned`), license, reference URL, notes.
   - `sw` — same pattern with `firmware` / `host_software` enums.
   - `purchase` — `available` boolean, channel, URL, prices (USD/EUR), notes.
     Mark `price_usd` / `price_eur` as `null` if not published; never guess.
4. **Image attribution is mandatory.** Add an `image_attribution` object:
   ```json
   "image_attribution": {
     "credit": "Author / lab / vendor or 'Original illustration created for this catalog'",
     "source_url": "https://...",
     "license": "CC0 | CC-BY-4.0 | CERN-OHL-S | vendor all-rights-reserved | ...",
     "retrieved": "YYYY-MM"
   }
   ```
   Use `source_url: null` for original illustrations you create yourself. Place the
   image under `platforms/<id>/assets/<filename>` and reference it from the
   `image` field as `assets/<filename>`.
5. Add `licenses/IMAGE.txt` under the same platform folder. Add
   `licenses/HARDWARE.txt` and `licenses/SOFTWARE.txt` when the entry includes
   corresponding source-license information.
6. Append the new id to `platforms/index.json`.
7. Validate the entry locally (see below) and open a Pull Request against `main`.

### Creator verification badge

To mark an entry as **verified by its creators**, set `"verified_at": "YYYY-MM"`
(date of the last verification) in `platforms/<id>/index.json`. The catalog then
shows a green **✓ Verified** badge on the card and in the detail dialog. Omit the
field or set it to `null` for unverified entries.

## Updating an existing entry
- Edit `platforms/<id>/index.json`.
- If you replace the image, update the platform-local `assets/` file and
  `image_attribution` to match.
- Run validation, commit, and submit a PR.

## Image attribution policy

| Image source | Required `credit` | Required `license` |
|---|---|---|
| Vendor product photo (Flosonics, Vermon, TENA) | Vendor name | "Vendor product photo (used with attribution)" + source URL |
| Open-source documentation repo (WULPUS, TinyProbe) | Lab / authors | Their published license (e.g. CC-BY-4.0, CERN-OHL-S) + repo URL |
| Open-access journal figure (Lin et al. Nature Biotech, etc.) | Authors | License of the article (often CC-BY-4.0) + DOI URL |
| Original SVG/illustration you draw | "Original illustration created for this catalog" | "CC0 / public domain" + `source_url: null` |

**Never** use an image without a clear source and license. If in doubt, draw a
new SVG illustration and mark it CC0.

## Code style
- HTML: semantic markup, classes for styling only.
- CSS: custom design system in `styles.css` (no Tailwind CDN dependency).
- JavaScript: ES2022, no transpilation.
- JSON: 2-space indentation, UTF-8.

## Review process
- Schema validation runs on every PR.
- Reviewers check that each entry matches its primary source (DOI must resolve to
  the correct paper) and that image attribution is complete.
- Once approved, the PR is merged and the site is redeployed via GitHub Pages.

## Extending the schema

To add a new field to platform entries:

1. Edit `platforms/_schema.json` to declare the new property with type and description.
2. Add the property to existing entries in `platforms/<id>/index.json`.
3. If the UI should filter or display the field, update `main.js`.
4. Run the validation script and the headless smoke test (see below).

## Validation

```bash
# JSON schema validation (uses uv for one-off Python deps)
uv run --with jsonschema -- python -c "
import json, jsonschema, pathlib
root = pathlib.Path('.')
schema = json.load(open(root / 'platforms' / '_schema.json'))
ids = json.load(open(root / 'platforms' / 'index.json'))
for platform_id in ids:
    path = root / 'platforms' / platform_id / 'index.json'
    entry = json.load(open(path))
    jsonschema.validate(entry, schema=schema)
print(f'Schema OK for {len(ids)} platform entries')
"
```

## Headless smoke test

The catalog renders client-side, so a quick visual check after editing:

```bash
# Start the dev server
python3 -m http.server 8000 --bind 127.0.0.1 --directory .

# In another shell, screenshot the page
chromium --headless --no-sandbox --hide-scrollbars \
  --user-data-dir=/tmp/chrome-test \
  --window-size=1280,2400 \
  --screenshot=/tmp/check.png \
  --virtual-time-budget=8000 \
  "http://127.0.0.1:8000/"
```

The catalog should show 3 cards with the default open-HW+SW filters (12 with all
filters cleared), the five-cell stats strip, and the new entry's
detail dialog should display the correct image attribution.

## Attribution changes

To amend an attribution entry (wrong credit, broken source URL, etc.), edit the
`image_attribution` object in the relevant `platforms/<id>/index.json` and
submit a PR with the corrected field. Update `ATTRIBUTION.md` in the same change.
