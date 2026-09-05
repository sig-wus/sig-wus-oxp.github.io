# Image and Content Attribution

The SIG-WUS X-change catalog aggregates hardware-platform data for wearable-ultrasound research.
Every entry has structured `image_attribution` and links to canonical sources. This file
summarises the credits for the device imagery.

## Device images

| Platform | File | Credit | Source URL | License | Retrieved |
|---|---|---|---|---|---|
| SENS-U (TENA SmartCare) | `sense-u-hero.jpg` | TENA (Essity) / Novioscan | https://bladdersensor.tena.com/ | Vendor product photo (used with attribution) | 2026-08 |
| WMAUS | `wmaus.svg` | Original illustration created for this catalog | — | CC0 / public domain | 2026-08 |
| WULPUS | `wulpus_main.png` | ETH Zürich — IIS / BSSE (Vostrikov et al.) | https://github.com/pulp-bio/wulpus/blob/main/docs/images/wulpus_main.png | CERN-OHL-S 2.0 (HW) / CC-BY-4.0 (docs) | 2026-08 |
| PuLsE | `pulse.svg` | Original illustration created for this catalog | — | CC0 / public domain | 2026-08 |
| MoUsE | `mouse.svg` | Original illustration created for this catalog | — | CC0 / public domain | 2026-08 |
| OEM USB Probe | `oem-probe.jpg` | Vermon SA | https://vermon.com/oem-usb-probe/ | Vendor product photo (used with attribution) | 2026-08 |
| USoP | `usop.svg` | Original illustration created for this catalog | — | CC0 / public domain | 2026-08 |
| TinyProbe | `tinyprobe_title.png` | ETH Zürich — IIS (Vostrikov et al.) | https://github.com/pulp-bio/TinyProbe/blob/main/docs/images/tinyprobe_title.png | CERN-OHL-S 2.0 (HW) / CC-BY-4.0 (docs) | 2026-08 |
| FloPatch | `flopatch.jpg` | Flosonics Medical | https://flosonicsmedical.com/flopatch/ | Vendor product photo (used with attribution) | 2026-08 |
| Yin Prosthetic Wristband | `yin-prosthetic.svg` | Original illustration created for this catalog | — | CC0 / public domain | 2026-08 |
| Bashatah TDS Band | `bashatah-tds.svg` | Original illustration created for this catalog | — | CC0 / public domain | 2026-08 |
| Wang Pre-Voiding Alarm | `wang-prevoiding.svg` | Original illustration created for this catalog | — | CC0 / public domain | 2026-08 |

## Catalog source

The platform list, technical specifications, and review-paper cross-references are derived
from:

> D. Weik, R. Nauber, E. Kaiser, N. Kirsch, R. Kunz, L. Schierling, C. Leitner, L. Benini,
> H.-C. Liu, Q. Zhou, J. Hampe, G. Fettweis, M. Herzog, C. Kupsch.
> *Current Trends in Ultrasound Wearables: Spotlight on System Architecture*.
> **IEEE Reviews in Biomedical Engineering**, 2026.
> DOI: [10.1109/RBME.2026.3664011](https://doi.org/10.1109/RBME.2026.3664011)

Every `paper` field in `platforms/<id>/index.json` resolves to the DOI or canonical URL of the
publication that first described the platform (verified against the review paper's
`literature.bib`).

## Vendor marks

- **TENA SmartCare Bladder Sensor** is a trademark of Essity AB.
- **FloPatch** is a trademark of Flosonics Medical.
- **Vermon OEM USB Probe** is a product of Vermon SA.
- **IEEE** logo (`assets/ieee-logo.svg`) is a trademark of the Institute of Electrical
  and Electronics Engineers. The logo geometry is public domain (textlogo, per Wikimedia
  Commons); the mark is used to identify the review paper's publisher.
- **WMAUS, WULPUS, PuLsE, MoUsE, USoP, TinyProbe** are research platforms named in
  peer-reviewed publications.

Mention of these products is for catalog completeness and constitutes nominative fair use.

## Original work in this catalog

- SVG illustrations for WMAUS, PuLsE, MoUsE, USoP, Yin Wristband, Bashatah TDS Band,
  and Wang Pre-Voiding Alarm are original works produced for this catalog.
- All other content (HTML, CSS, JavaScript, JSON catalog structure) is original.

## Attribution changes

To request changes to an attribution entry, open an issue or pull request and edit the
`image_attribution` object in the relevant `platforms/<id>/index.json` file.
