// Interface structure test for the static catalog page.
//
// Attribution: written by GLM (glm-5.3-flash) via the Oh My Pi coding harness,
// 2026-08-27, working with the human researcher on the SIG-WUS X-change repo.
// Verifies that index.html declares the elements the catalog JS relies on.
const fs = require('fs');
const path = require('path');

// Resolve index.html path relative to this test file
const indexPath = path.resolve(__dirname, '..', 'index.html');
let html;
try {
  html = fs.readFileSync(indexPath, 'utf8');
} catch (e) {
  console.error('Cannot read index.html:', e.message);
  process.exit(1);
}

// Checks: elements the catalog JS requires, local-only assets
const checks = [
  ['search input element', 'id="searchInput"'],
  ['main.js script', 'src="main.js"'],
  ['local stylesheet link', 'href="styles.css"'],
  ['year filter select', 'id="yearFilter"'],
  ['type filter select', 'id="typeFilter"'],
  ['detail dialog close button', 'id="closeDialog"'],
  ['contribute button', 'id="contributeBtn"'],
  ['contribute dialog', 'id="contributeDialog"'],
  ['contribute form', 'id="contribForm"'],
  ['contribute JSON preview', 'id="contribJson"'],
  ['contribute GitHub handoff link', 'id="contribGithub"'],
  ['contribute module script', 'src="contribute.js"'],
];

let failed = false;
for (const [name, needle] of checks) {
  if (!html.includes(needle)) {
    console.error(`Missing ${name}`);
    failed = true;
  }
}

// No external resource dependencies (scripts, styles, iframes, imports)
const external = html
  .split('\n')
  .map((l) => l.trim())
  .filter(
    (l) =>
      (l.includes('src="http') || l.includes('href="http')) &&
      !l.includes('rel="noopener'), // outbound hyperlinks are fine
  );
if (external.length > 0) {
  console.error('External resource dependencies found:');
  for (const line of external) console.error(`  ${line}`);
  failed = true;
}

if (failed) process.exit(1);
console.log('Interface basic structure OK');
process.exit(0);
