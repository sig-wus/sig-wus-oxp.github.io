# SIG-WUS X-change Platform

## Overview
The **SIG-WUS X-change platform** (sig-wus.org) makes wearable-ultrasound hardware platforms
discoverable. All known platforms are stored in a machine-readable JSON catalog and exposed
via a client-side parametric search, filters, and a detail dialog.

## Goals
1. **Discoverability** — list every wearable-ultrasound system with its technical specifications,
   illustrated with a real device photo or custom illustration.
2. **Easy deployment** — the site is a static HTML/CSS/JS bundle that can be served directly
   from GitHub Pages.
3. **Open contribution** — anyone can add or update a platform entry by editing
   its own `platforms/<id>/index.json` file and submitting a pull request.

## Repository layout
```
.
├── index.html            # Catalog page (site root = served root)
├── styles.css
├── main.js
├── vendor/               # Locally-vendored dependencies (Fuse.js)
├── platforms/
│   ├── index.json        # Ordered list of platform ids
│   ├── _schema.json      # JSON schema for a single platform entry
│   └── <id>/
│       ├── index.json    # Platform metadata
│       ├── assets/       # Platform-local illustrations / photos
│       └── licenses/     # Image / hardware / software notices
└── assets/
    ├── logo.svg
    ├── preview.png
    └── screenshot.webp
```

## Quick start (local development)
```bash
# Serve the repository root (the site root) with Python's built-in HTTP server
python3 -m http.server 8000 --bind 127.0.0.1 --directory .
# Open http://127.0.0.1:8000 in a browser to view the UI
```

The page loads the platform ids from `platforms/index.json` (a generated
artifact — CI regenerates it from the `platforms/<id>/` folders, see
`scripts/gen_registry.py`), then each `platforms/<id>/index.json`, and finds
Fuse.js under `vendor/`.

## Adding new platforms
See **[CONTRIBUTING.md](CONTRIBUTING.md) for the workflow. Each entry follows the JSON schema
in `platforms/_schema.json` and stores its metadata, media, and notices inside
`platforms/<id>/`.

## Deployment
**GitHub Pages.** The repository root is the published site; `.nojekyll` disables
Jekyll processing. Pages is configured to deploy from the root of the `main`
branch — commit site files in place, no build or mirror step.

## Verification

### Local testing
Serve the site with the Quick-start command above, then open http://127.0.0.1:8000.

* Search works on the client side (Fuse.js, fuzzy).
* Filter chips and select boxes narrow the catalog.
* Sort dropdown orders by name, year, power, or weight. Open HW + SW filters are pre-selected.
* Clicking a card opens a detail dialog with the full hardware and signal-chain spec.
* Empty / nonsense query shows the *No matches* panel with a reset link.

### Automated checks
Run the headless smoke test (Playwright-style) to verify rendering, search, filters,
and the detail dialog. 

## License
This project is licensed under the Apache License 2.0 — see the `LICENSE` file.

Device illustrations in `platforms/<id>/assets/` are either:
* Original SVGs created for this project, or
* Photos sourced from open repositories of the device authors (WULPUS, TinyProbe, PuLsE),
  or
* Vendor product photos (Vermon OEM USB Probe, Flosonics FloPatch) used with attribution.

See each entry's `paper`, `github`, and `website` fields for the canonical source.
