# Image and Content Attribution

The SIG-WUS X-change catalog aggregates hardware-platform data for wearable-ultrasound research.
Every entry has structured `image_attribution` and links to canonical sources. This file
summarises the credits for the device imagery.

## Device images

| Platform | File | Credit | Source URL | License | Retrieved |
|---|---|---|---|---|---|
| SENS-U (TENA SmartCare) | `sense-u-hero.jpg` | TENA (Essity) / Novioscan | https://bladdersensor.tena.com/ | Vendor product photo (used with attribution) | 2026-08 |
| WMAUS | `wmaus_tnsre2022_fig3.jpg` | Yang et al., IEEE TNSRE 2022 — Fig. 3 (same armband; open companion paper) | https://doi.org/10.1109/TNSRE.2022.3197875 | CC BY 4.0 | 2026-09 |
| WULPUS | `wulpus_main.png` | ETH Zürich — IIS / BSSE (Vostrikov et al.) | https://github.com/pulp-bio/wulpus/blob/main/docs/images/wulpus_main.png | CERN-OHL-S 2.0 (HW) / CC-BY-4.0 (docs) | 2026-08 |
| PuLsE | `pulse_fig3a.jpg` | Giordano et al., IEEE IoT-J 2025 (arXiv:2410.16219) — Fig. 3(a) | https://arxiv.org/abs/2410.16219 | CC BY 4.0 (arXiv version) | 2026-09 |
| MoUsE | `mouse_fig1d.jpg` | Fournelle et al., Sensors 2021 (MDPI) — Figure 1(d) | https://doi.org/10.3390/s21196481 | CC BY 4.0 | 2026-09 |
| OEM USB Probe | `oem-probe.jpg` | Vermon SA | https://vermon.com/oem-usb-probe/ | Vendor product photo (used with attribution) | 2026-08 |
| USoP | `usop_fig1a.jpg` | Lin et al., Nature Biotechnology 2023 — Fig. 1(a), author-hosted copy | https://doi.org/10.1038/s41587-023-01800-0 | © Springer Nature (author copy, attribution) | 2026-09 |
| TinyProbe | `tinyprobe_title.png` | ETH Zürich — IIS (Vostrikov et al.) | https://github.com/pulp-bio/TinyProbe/blob/main/docs/images/tinyprobe_title.png | CERN-OHL-S 2.0 (HW) / CC-BY-4.0 (docs) | 2026-08 |
| FloPatch | `flopatch_fig3e.jpg` | Kenny et al., Scientific Reports 2021 — Figure 3(e) | https://doi.org/10.1038/s41598-021-87116-y | CC BY 4.0 | 2026-09 |
| Yin Prosthetic Wristband | `yin-prosthetic.svg` | SIG-WUS placeholder — original graphic created for this catalog | — | CC0 / public domain | 2026-09 |
| Bashatah TDS Band | `bashatah_fig2.jpg` | Bashatah et al., IEEE TBME 2024 — Figure 2 (NIH manuscript, PMC11639583) | https://pmc.ncbi.nlm.nih.gov/articles/PMC11639583/ | Author manuscript (published © IEEE) | 2026-09 |
| Wang Pre-Voiding Alarm | `wang_fig2_fpc.jpg` | Wang, Dai & Liu, IEEE JTEHM 2024 — Figure 2 (PMC11505974) | https://doi.org/10.1109/JTEHM.2024.3457593 | Author manuscript (published © IEEE) | 2026-09 |

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
- **IEEE** and the **IEEE Reviews in Biomedical Engineering** journal wordmark
  (`assets/ieee-rbme-logo.png`, sourced from the IEEE EMBS RBME page) are trademarks of the
  Institute of Electrical and Electronics Engineers; used to identify the review paper's
  publisher and journal.
- **WMAUS, WULPUS, PuLsE, MoUsE, USoP, TinyProbe** are research platforms named in
  peer-reviewed publications.

Mention of these products is for catalog completeness and constitutes nominative fair use.

## Original work in this catalog

- Only the SIG-WUS placeholder graphic for Yin Prosthetic Wristband is an original
  work produced for this catalog (CC0): its primary paper (Yin et al., IEEE JBHI 2022)
  is closed access and no lawful open figure is available. Replace it when one is.

## Attribution changes

To request changes to an attribution entry, open an issue or pull request and edit the
`image_attribution` object in the relevant `platforms/<id>/index.json` file.
