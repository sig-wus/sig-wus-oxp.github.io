# Interface structure test for the static catalog page.
#
# Attribution: written by GLM (glm-5.3-flash) via the Oh My Pi coding harness,
# 2026-08-27, working with the human researcher on the SIG-WUS X-change repo.
# Verifies that index.html, main.js, and contribute.js declare the elements
# the catalog JS relies on.

import sys, pathlib

root = pathlib.Path(__file__).resolve().parents[1]

def read(rel):
    try:
        return (root / rel).read_text(encoding='utf-8')
    except Exception as e:
        print(f'Failed to read {root / rel}: {e}')
        sys.exit(1)

html = read('index.html')
mainjs = read('main.js')
contribjs = read('contribute.js')

# Checks: elements the catalog JS requires, local-only assets
html_checks = [
    ('search input element', 'id="searchInput"'),
    ('main.js script', 'src="main.js"'),
    ('local stylesheet link', 'href="styles.css"'),
    ('year filter select', 'id="yearFilter"'),
    ('type filter select', 'id="typeFilter"'),
    ('detail dialog close button', 'id="closeDialog"'),
    ('contribute dialog', 'id="contributeDialog"'),
    ('contribute form', 'id="contribForm"'),
    ('contribute JSON preview', 'id="contribJson"'),
    ('contribute GitHub handoff link', 'id="contribGithub"'),
    ('contribute module script', 'src="contribute.js"'),
    ('data disclaimer strip', 'data-disclaimer'),
    ('disclaimer PR link hook', 'data-open-contribute'),
]

main_checks = [
    ('card contribute handler', 'data-contribute'),
]

contrib_checks = [
    ('disclaimer PR link wiring', 'data-open-contribute'),
]

failed = False
for checks, text, fname in [
    (html_checks, html, 'index.html'),
    (main_checks, mainjs, 'main.js'),
    (contrib_checks, contribjs, 'contribute.js'),
]:
    for name, needle in checks:
        if needle not in text:
            print(f'{fname} missing {name}')
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
