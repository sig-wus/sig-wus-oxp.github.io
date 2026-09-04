// contribute.js — in-page contribute form for the SIG-WUS X-change catalog.
//
// Attribution: written by GLM (glm-5.3-flash) via the Oh My Pi coding harness,
// 2026-09-04, working with Dr. Richard Nauber on the SIG-WUS X-change repo.
//
// Builds platforms/<id>/index.json from a form, validates it against
// platforms/_schema.json with a dependency-free mini validator, and hands the
// result to GitHub's web editor:
//   new file: /new/<branch>?filename=platforms/<id>/index.json&value=<json>
//   edit:     /edit/<branch>/platforms/<id>/index.json
// For read-only visitors GitHub auto-forks and continues into its PR flow.
// No API tokens, no backend, no external JS.

const REPO = 'sig-wus/sig-wus-oxp.github.io';
const BRANCH = 'main';
const SCHEMA_URL = 'platforms/_schema.json';
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

const els = {};

let schema = null;        // fetched _schema.json (null until loaded)
let schemaFailed = false; // fetch failed once -> stop retrying, degrade gracefully
let mode = 'new';         // 'new' | 'edit'
let currentId = '';       // entry id when editing an existing entry

export function openContributor(entry) {
  mode = entry ? 'edit' : 'new';
  currentId = entry ? entry.id : '';
  els.mode.textContent = mode === 'edit' ? 'Improve existing entry' : 'New entry';
  els.title.textContent = mode === 'edit'
    ? `Improve “${entry.platform || entry.id}”`
    : 'Contribute a platform';
  els.form.reset();
  if (entry) {
    const pre = structuredClone(entry);
    // Schema wants a platform-relative path; the loaded entry has it resolved.
    if (typeof pre.image === 'string') pre.image = pre.image.replace(new RegExp(`^platforms/${pre.id}/`), '');
    prefill(pre);
  }
  els.idInput.readOnly = mode === 'edit';
  els.indexStep.hidden = mode === 'edit';
  ensureSchema();
  rebuild();
  els.dialog.showModal();
}

// -- form <-> object --------------------------------------------------------

function objectFromForm() {
  const out = {};
  for (const input of els.form.querySelectorAll('[data-path]')) {
    const path = input.dataset.path.split('.');
    const type = input.dataset.type || 'str';
    let value;
    if (type === 'bool') {
      value = input.checked;
    } else if (type === 'int') {
      const n = Number.parseInt(input.value, 10);
      if (!Number.isNaN(n)) value = n;
    } else if (type === 'float') {
      if (input.value.trim() !== '') {
        const n = Number(input.value);
        value = Number.isNaN(n) ? null : n; // price fields: invalid input -> null, validator/preview shows it
      } else {
        value = null;
      }
    } else {
      const s = input.value.trim();
      if (s === '') {
        if (type === 'str-null') value = null;
        else continue; // plain string: omit
      } else {
        value = s;
      }
    }
    let node = out;
    for (let i = 0; i < path.length - 1; i++) {
      if (typeof node[path[i]] !== 'object' || node[path[i]] === null) node[path[i]] = {};
      node = node[path[i]];
    }
    node[path[path.length - 1]] = value;
  }
  return out;
}

function prefill(obj) {
  for (const input of els.form.querySelectorAll('[data-path]')) {
    let v = obj;
    for (const k of input.dataset.path.split('.')) v = v?.[k];
    if (input.type === 'checkbox') input.checked = v === true;
    else input.value = v === null || v === undefined ? '' : String(v);
  }
}

// -- mini JSON-Schema validator (subset: type/required/enum/min/max/         --
//    additionalProperties:false/format:uri — everything _schema.json uses) —

function validateNode(value, schemaNode, label, errors) {
  const types = Array.isArray(schemaNode.type) ? schemaNode.type : schemaNode.type ? [schemaNode.type] : [];
  if (types.length > 0) {
    const ok = types.some((t) => {
      switch (t) {
        case 'object': return value !== null && typeof value === 'object' && !Array.isArray(value);
        case 'array': return Array.isArray(value);
        case 'string': return typeof value === 'string';
        case 'integer': return Number.isInteger(value);
        case 'number': return typeof value === 'number' && Number.isFinite(value);
        case 'boolean': return typeof value === 'boolean';
        case 'null': return value === null;
        default: return true;
      }
    });
    if (!ok) {
      errors.push(`${label || 'entry'}: expected ${types.join(' or ')}, got ${jsonType(value)}`);
      return;
    }
  }
  if (schemaNode.enum && !schemaNode.enum.includes(value)) {
    errors.push(`${label}: must be one of ${schemaNode.enum.join(' | ')}`);
  }
  if (typeof value === 'number') {
    if (schemaNode.minimum !== undefined && value < schemaNode.minimum) errors.push(`${label}: minimum is ${schemaNode.minimum}`);
    if (schemaNode.maximum !== undefined && value > schemaNode.maximum) errors.push(`${label}: maximum is ${schemaNode.maximum}`);
  }
  if (typeof value === 'string' && schemaNode.format === 'uri' && !/^https?:\/\/\S+/.test(value)) {
    errors.push(`${label}: must be an http(s) URL`);
  }
  if (typeof value === 'string' && schemaNode.format === 'date' && !/^\d{4}-\d{2}$|^\d{4}-\d{2}-\d{2}$/.test(value)) {
    errors.push(`${label}: must be YYYY-MM (or YYYY-MM-DD)`);
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schemaNode.required || []) {
      if (!(key in value)) errors.push(`${label ? label + '.' : ''}${key}: required`);
    }
    const props = schemaNode.properties || {};
    if (schemaNode.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in props)) errors.push(`${label}: unknown property "${key}"`);
      }
    }
    for (const [key, child] of Object.entries(value)) {
      if (props[key]) validateNode(child, props[key], label ? `${label}.${key}` : key, errors);
    }
  }
}

function jsonType(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

// -- GitHub handoff ---------------------------------------------------------

function newFileUrl(id, json) {
  const filename = `platforms/${id}/index.json`;
  return `https://github.com/${REPO}/new/${BRANCH}?filename=${filename}&value=${encodeURIComponent(json)}`;
}

function editFileUrl(id) {
  return `https://github.com/${REPO}/edit/${BRANCH}/platforms/${id}/index.json`;
}

const INDEX_EDIT_URL = `https://github.com/${REPO}/edit/${BRANCH}/platforms/index.json`;

// -- live rebuild + validation ----------------------------------------------

function rebuild() {
  const obj = objectFromForm();
  const json = JSON.stringify(obj, null, 2) + '\n';
  els.json.value = json;

  const errors = [];
  if (schema) {
    validateNode(obj, schema, '', errors);
  } else if (schemaFailed) {
    errors.push('Schema could not be loaded — validation skipped (maintainers validate on the PR).');
  } else {
    errors.push('Loading schema…');
  }
  if (!obj.id) {
    errors.unshift('id: required');
  } else if (!ID_PATTERN.test(obj.id)) {
    errors.unshift('id: lowercase letters, digits and hyphens only (it becomes the folder name)');
  }

  const id = obj.id || currentId || '<id>';
  els.github.textContent = mode === 'edit' ? '2 · Open this file on GitHub ↗' : '2 · Create the file on GitHub ↗';
  els.imageStep.hidden = !obj.image;

  if (errors.length === 0) {
    els.status.textContent = mode === 'edit'
      ? '✓ Valid entry. Copy the JSON, then open the file on GitHub, select all and paste over it.'
      : '✓ Valid entry. Copy the JSON, then open GitHub — the file content is pre-filled there.';
    els.status.className = 'contrib-status ok';
    setGithubHref(mode === 'edit' ? editFileUrl(obj.id) : newFileUrl(obj.id, json));
    els.copy.disabled = false;
  } else {
    els.status.textContent = `⚠ ${errors.slice(0, 3).join(' · ')}${errors.length > 3 ? ` · +${errors.length - 3} more` : ''}`;
    els.status.className = 'contrib-status err';
    setGithubHref(null);
    els.copy.disabled = false; // copying an invalid draft is still useful
  }
}

function setGithubHref(url) {
  if (url) {
    els.github.href = url;
    els.github.classList.remove('is-disabled');
  } else {
    els.github.removeAttribute('href');
    els.github.classList.add('is-disabled');
  }
}

async function ensureSchema() {
  if (schema || schemaFailed) { rebuild(); return; }
  try {
    const resp = await fetch(SCHEMA_URL, { cache: 'no-cache' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    schema = await resp.json();
  } catch {
    schemaFailed = true;
  }
  rebuild();
}

// -- wiring -------------------------------------------------------------------

function init() {
  for (const [key, id] of Object.entries({
    dialog: 'contributeDialog', form: 'contribForm', json: 'contribJson', status: 'contribStatus',
    copy: 'contribCopy', github: 'contribGithub', indexStep: 'contribIndexStep', imageStep: 'contribImageStep',
    mode: 'contribMode', title: 'contribTitle', close: 'contribClose', open: 'contributeBtn',
    idInput: 'cf_id',
  })) {
    els[key] = document.getElementById(id);
    if (!els[key]) return; // markup missing -> stay inert, catalog keeps working
  }

  els.open.addEventListener('click', () => openContributor(null));
  els.close.addEventListener('click', () => els.dialog.close());
  els.form.addEventListener('input', rebuild);
  els.form.addEventListener('change', rebuild);
  els.copy.addEventListener('click', async () => {
    els.json.focus();
    els.json.select();
    try {
      await navigator.clipboard.writeText(els.json.value);
    } catch {
      document.execCommand('copy'); // legacy fallback; textarea is already selected
    }
    els.copy.textContent = '✓ Copied';
    setTimeout(() => { els.copy.textContent = '1 · Copy JSON'; }, 1500);
  });
  els.github.addEventListener('click', (e) => {
    if (!els.github.hasAttribute('href')) e.preventDefault();
  });

  els.indexStep.href = INDEX_EDIT_URL;
  rebuild();
}

init();
