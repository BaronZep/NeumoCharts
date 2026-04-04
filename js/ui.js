import { CSV_PLACEHOLDERS } from './constants.js';
import { parseCSV } from './csv.js';
import { renderHistogram, renderStacked, renderGrouped } from './chartBuilder.js';
import { downloadChart, copyChart } from './export.js';

/* ── state ───────────────────────────────────────────────────────────── */
let chartType = 'histogram';

/* ── toast ───────────────────────────────────────────────────────────── */
export function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

/* ── type selector ───────────────────────────────────────────────────── */
function updatePlaceholder(type) {
  const ta = document.getElementById('csvInput');
  // Only update placeholder; never overwrite user-typed content
  ta.placeholder = CSV_PLACEHOLDERS[type] ?? '';
}

export function setType(type, btn) {
  chartType = type;
  document.querySelectorAll('.type-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-checked', 'false');
  });
  btn.classList.add('active');
  btn.setAttribute('aria-checked', 'true');
  updatePlaceholder(type);
}

/* ── file import ─────────────────────────────────────────────────────── */
export function loadFile(e) {
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => { document.getElementById('csvInput').value = ev.target.result; };
  reader.readAsText(f);
  e.target.value = '';
}

/* ── generate ────────────────────────────────────────────────────────── */
export function generate() {
  const csvText = document.getElementById('csvInput').value.trim();
  if (!csvText) { showToast("Collez d'abord un CSV !"); return; }

  let parsed;
  try { parsed = parseCSV(csvText); }
  catch (e) { showToast(e.message); return; }

  const cfg = {
    title:  document.getElementById('cfgTitle').value.trim()  || 'Mon graphique',
    xTitle: document.getElementById('cfgXTitle').value.trim(),
    yTitle: document.getElementById('cfgYTitle').value.trim(),
  };

  let html;
  try {
    if      (chartType === 'histogram') html = renderHistogram(parsed, cfg);
    else if (chartType === 'stacked')   html = renderStacked(parsed, cfg);
    else                                html = renderGrouped(parsed, cfg);
  } catch (e) { showToast('Erreur : ' + e.message); return; }

  document.getElementById('previewArea').innerHTML = html;
  document.getElementById('copyBtn').disabled = false;
  document.getElementById('dlBtn').disabled   = false;
}

/* ── init ────────────────────────────────────────────────────────────── */
export function init() {
  // Bind type buttons
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => setType(btn.dataset.type, btn));
  });

  // Bind generate button
  document.getElementById('generateBtn').addEventListener('click', generate);

  // Bind export buttons
  document.getElementById('copyBtn').addEventListener('click', copyChart);
  document.getElementById('dlBtn').addEventListener('click', downloadChart);

  // Bind file import
  document.getElementById('fileInput').addEventListener('change', loadFile);
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
  });

  // Set initial placeholder
  updatePlaceholder(chartType);
}
