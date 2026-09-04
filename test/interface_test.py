# Interface structure test for the static catalog page.
#
# Attribution: written by GLM (glm-5.3-flash) via the Oh My Pi coding harness,
# 2026-08-27, working with the human researcher on the SIG-WUS X-change repo.
# Verifies that index.html declares the elements the catalog JS relies on.

import sys, pathlib

index_path = pathlib.Path(__file__).resolve().parents[1] / 'index.html'

try:
    html = index_path.read_text(encoding='utf-8')
except Exception as e:
    print(f'Failed to read {index_path}: {e}')
    sys.exit(1)

# Checks: elements the catalog JS requires, local-only assets
checks = [
    ('search input element', 'id="searchInput"'),
    ('main.js script', 'src="main.js"'),
    ('local stylesheet link', 'href="styles.css"'),
    ('year filter select', 'id="yearFilter"'),
    ('type filter select', 'id="typeFilter"'),
    ('detail dialog close button', 'id="closeDialog"'),
    ('contribute button', 'id="contributeBtn"'),
    ('contribute dialog', 'id="contributeDialog"'),
    ('contribute form', 'id="contribForm"'),
    ('contribute JSON preview', 'id="contribJson"'),
    ('contribute GitHub handoff link', 'id="contribGithub"'),
    ('contribute module script', 'src="contribute.js"'),
]

failed = False
for name, needle in checks:
    if needle not in html:
        print(f'Missing {name}')
        failed = True

# No external resource dependencies (scripts, styles, iframes, imports)
external = [
    line.strip() for line in html.splitlines()
    if ('src="http' in line or 'href="http' in line)
    and 'rel="noopener' not in line  # outbound hyperlinks are fine
]
if external:
    print('External resource dependencies found:')
    for line in external:
        print(f'  {line}')
    failed = True

if failed:
    sys.exit(1)
else:
    print('Interface basic structure OK')
    sys.exit(0)
