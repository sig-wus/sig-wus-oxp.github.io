# Data Schema For SIG-WUS Platform Catalog

Each platform entry lives in `platforms/<id>/index.json` and must conform to
`platforms/_schema.json`.

The registry list in `platforms/index.json` contains the ordered platform ids
that the client loads at runtime.

## Core Files

| File | Purpose |
|---|---|
| `platforms/index.json` | Ordered list of platform ids. |
| `platforms/_schema.json` | JSON schema for a single platform entry. |
| `platforms/<id>/index.json` | Canonical metadata for one platform. |

## Entry Model

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique slug used in `platforms/index.json` and folder names. |
| `platform` | string | Human-readable platform name, for example `WMAUS`. |
| `manufacturer` | string | Primary organization or institution behind the platform. |
| `affiliation` | string or null | Lab, group, or sub-organization within the manufacturer. |
| `reference` | string | BibTeX key for the primary publication. |
| `category` | string | Platform class such as `Pulse-echo imaging`. |
| `year` | integer | Publication or release year used in the timeline. |
| `transducer` | object | Channel count and transducer configuration. |
| `depth` | string | Imaging or sensing depth, or `n/a`. |
| `resolution` | string | Resolution, or `n/a`. |
| `tx` | object | Transmit-path parameters such as voltage and frequency. |
| `rx` | object | Receive-path parameters such as topology and sample rate. |
| `controller` | string | Sequencer and compute device summary. |
| `data_link` | string | Wired or wireless data link description. |
| `specs` | object | Structured performance data such as frame rate, power, and weight. |
| `application` | string | Typical application areas. |
| `description` | string | Free-form summary shown in the catalog. |
| `access` | string | Availability model: `open-source`, `commercial`, `research`, or `partial`. |
| `access_detail` | string | Clarifies the access model, license, or channel. |
| `paper` | string | DOI URL or canonical source URL. |
| `github` | string or null | Official GitHub repository, if one exists. |
| `website` | string or null | Official website, if one exists. |
| `verified_at` | string or null | `YYYY-MM` when the entry was last verified by its creators; shows the "Verified" badge. |
| `image` | string | Platform-local asset path, typically `assets/<filename>`. |
| `image_attribution` | object | Required attribution block for the platform image. |
| `availability` | object | Structured hardware, software, and purchase availability. |

Use `platforms/_schema.json` for exact field requirements, enums, and validation.
