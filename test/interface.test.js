// Interface structure test for the static catalog page.
//
// Attribution: written by GLM (glm-5.3-flash) via the Oh My Pi coding harness,
// 2026-08-27, working with the human researcher on the SIG-WUS X-change repo.
// Verifies that index.html, main.js, and contribute.js declare the elements
// the catalog JS relies on.
const fs = require('fs');
const path = require('path');

function read(rel) {
  const p = path.resolve(__dirname, '..', rel);
  try {
    return fs.readFileSync(p, 'utf8');
  } catch (e) {
    console.error(`Cannot read ${rel}:`, e.message);
    process.exit(1);
  }
}

const html = read('index.html');
const mainjs = read('main.js');
const contribjs = read('contribute.js');

// Checks: elements the catalog JS requires, local-only assets
const htmlChecks = [
  ['search input element', 'id="searchInput"'],
  ['main.js script', 'src="main.js"'],
  ['local stylesheet link', 'href="styles.css"'],
  ['year filter select', 'id="yearFilter"'],
  ['type filter select', 'id="typeFilter"'],
  ['detail dialog close button', 'id="closeDialog"'],
  ['contribute dialog', 'id="contributeDialog"'],
  ['contribute form', 'id="contribForm"'],
  ['contribute JSON preview', 'id="contribJson"'],
  ['contribute GitHub handoff link', 'id="contribGithub"'],
  ['contribute module script', 'src="contribute.js"'],
  ['disclaimer stats cell', 'stat-disclaimer-cell'],
  ['disclaimer text', 'May contain inaccuracies'],
  ['results-bar contribute button', 'id="contributeBtn"'],
];

const mainChecks = [
  ['card contribute handler', 'data-contribute'],
];

const contribChecks = [
  ['disclaimer PR link wiring', 'data-open-contribute'],
];

let failed = false;
const run = (checks, text, file) => {
  for (const [name, needle] of checks) {
    if (!text.includes(needle)) {
      console.error(`${file} missing ${name}`);
      failed = true;
    }
  }
};
run(htmlChecks, html, 'index.html');
run(mainChecks, mainjs, 'main.js');
run(contribChecks, contribjs, 'contribute.js');

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
