# SIG-WUS X-change Platform — Agent Notes

## Goal
The SIG-WUS X-change platform (sig-wus.org) makes the different hardware platforms for
wearable ultrasound discoverable. It is a self-contained static catalog that can be
embedded into the main SIG-WUS site or hosted on GitHub Pages.

## Style
The page follows the style of https://github.com/sig-wus/sig-wus.github.io.

## Catalog data
The platform list, technical specifications, and reference structure originate from the
IEEE RBME 2026 review paper by Weik et al.:

> D. Weik, R. Nauber, E. Kaiser, N. Kirsch, R. Kunz, L. Schierling, C. Leitner, L. Benini,
> H.-C. Liu, Q. Zhou, J. Hampe, G. Fettweis, M. Herzog, C. Kupsch.
> *Current Trends in Ultrasound Wearables: Spotlight on System Architecture*.
> **IEEE Reviews in Biomedical Engineering**, 2026.
> DOI: [10.1109/RBME.2026.3664011](https://doi.org/10.1109/RBME.2026.3664011)

Technical specifications (channel counts, voltages, frequencies, weights, etc.) are
factual data extracted from each primary publication cited in each
`platforms/<id>/index.json` file's `paper` field. Every DOI has been cross-verified against the review paper's
`literature.bib` and resolves correctly in real browsers.

## Attribution policy

**Image attribution is mandatory** for every entry. See `CONTRIBUTING.md` for the
required `image_attribution` schema (`credit`, `source_url`, `license`, `retrieved`).

- **Vendor product photos** (SENS-U/TENA, OEM USB Probe): credit the vendor,
  note "Vendor product photo (used with attribution)", link to the canonical source URL.
- **Paper figures** (WMAUS, PuLsE, MoUsE, USoP, Bashatah, Wang, FloPatch): credit the
  authors and the source paper — CC BY where the paper is open access (TNSRE 2022,
  arXiv, MDPI, Sci Rep), publisher author-copy attribution for USoP, and freely
  accessible NIH author-manuscript figures via PubMed Central for Bashatah/Wang.
- **Open-source documentation** (WULPUS, TinyProbe): credit the authors/lab, link to
  the GitHub repo, note the published license (CC-BY-4.0 for documentation).
- **SIG-WUS placeholder** (Yin): original graphic, CC0 — the JBHI 2022 paper is
  closed access with no lawful open figure; replace when one becomes available.

A consolidated list of every image credit, source URL, and license is maintained in
the top-level `ATTRIBUTION.md` file.

## Layout
The site is now a self-contained catalog component (header / footer / about section
removed in commit `92d6540` so it can be embedded into the parent SIG-WUS page).

## Dev server
```bash
python3 -m http.server 8000 --bind 127.0.0.1 --directory .
```

Then visit http://127.0.0.1:8000/.

## Deployment
The repository root is the GitHub Pages artifact (`main` branch, root, with
`.nojekyll` disabling Jekyll). Edit site files in place and commit — there is
no build or mirror step.

## Headless-browser testing (REQUIRED)

**Any change to the catalog page must be tested in a headless browser before commit.**
This is a client-side rendered page — there is no build step, and a JS bug means
broken UI for users.

### Quick smoke test (recommended for every change)

```bash
# 1. Start the dev server in one shell
python3 -m http.server 8000 --bind 127.0.0.1 --directory src

# 2. Dump the rendered DOM to verify the page works
chromium --headless --disable-gpu --no-sandbox --hide-scrollbars \
  "http://127.0.0.1:8000/?cb=$(date +%s)" 2>/dev/null > /tmp/rendered.html

# 3. Sanity checks
grep -c '<article class="card"' /tmp/rendered.html  # expect 3 (default open-HW+SW filters; 12 with all filters cleared)
grep -c 'stat-cite-tag' /tmp/rendered.html           # expect 1
grep -c 'tl-point' /tmp/rendered.html                # expect >0 timeline points
```

### Visual regression (recommended for UI changes)

```bash
chromium --headless --disable-gpu --no-sandbox --hide-scrollbars \
  "http://127.0.0.1:8000/?v=$(date +%s)"
```

### Programmatic interaction test (for filter / dialog changes)

Use the `browser` tool (Chromium via CDP) or Playwright/Puppeteer. The procedure
used for the 2026-08-27 fix round (stylesheet corruption, year filter, timeline
click-to-filter, featured gating):

1. **Serve fresh.** `python3 -m http.server <port> --bind 127.0.0.1 --directory .`.
   Chromium caches aggressively per origin: when re-verifying after an edit, use an
   unused port or disable cache first (`Network.setCacheDisabled` via CDP) —
   otherwise you silently re-test the old stylesheet.
2. **Load with `waitUntil: networkidle0`**, then assert **computed styles**, not
   CSS text (`getComputedStyle(el).maxWidth`, offsetWidth, background-image).
   Rationale: a CSS parse error silently drops rules (one missing `}` turned
   whole blocks into dead nested rules while the page kept rendering).
3. **Structural assertions:** every `<select>` populated (no empty-option pills),
   `#resultCount` before/after each filter, badge presence per card, timeline
   point count.
4. **Interaction pass:** click through every changed path — filter pills, year
   timeline points (incl. toggle-off), Reset (must restore the full count and
   re-render), both dialogs (open, Escape, close button, backdrop click).
5. **Runtime errors:** capture `page.on('pageerror')`; flag images with
   `img.complete && img.naturalWidth === 0`.
6. **Self-containment audit:** collect every `page.on('request')` URL and assert
   all origins are same-origin or `data:`. The page must never load scripts,
   styles, fonts, or iframes from external hosts (outbound `<a>` links are fine).
7. **CSS sanity:** brace-balance check on `styles.css`
   (`python3 -c` one-liner counting `{`/`}`) and a grep for
   `@import|url(http|src="http` as an external-ref guard.
8. **Visual proof:** element screenshots of the touched regions (stats strip,
   filter bar, dialogs) before/after — pixel evidence, not assumptions.
9. **Ship:** run `python3 test/interface_test.py`, then commit.
