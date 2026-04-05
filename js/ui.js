/**
 * ui.js
 * Wires DOM events to chart rendering logic.
 * Manages chart type selection, palette selection, CSV input (paste or file),
 * chart generation, canvas preview, and PNG export.
 */
import { CSV_PLACEHOLDERS, PALETTES, DEFAULT_PALETTE } from './constants.js';
import { parseCSV } from './csv.js';
import { renderBarresCanvas, renderStackedCanvas, renderGroupedCanvas, renderLineCanvas, canvasToDataURL } from './neumoCanvas.js';

let chartType    = 'barres';
let paletteKey   = DEFAULT_PALETTE;
let lastCanvas   = null;
let importedName = null; // basename of the last imported CSV file; null when data was typed manually
let _debounce    = null; // debounce timer for config field auto-regen

export function showToast(msg, success = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.toggle('toast--success', success);
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function updatePlaceholder(type) {
  document.getElementById('csvInput').placeholder = CSV_PLACEHOLDERS[type] ?? '';
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
  if (lastCanvas) generate();
}

export function setPalette(key) {
  paletteKey = PALETTES[key] ? key : DEFAULT_PALETTE;
}

/**
 * Read a CSV file from the file input, pre-fill the title field with its
 * basename, and load its content into the textarea.
 */
export function loadFile(e) {
  const f = e.target.files[0];
  if (!f) return;
  importedName = f.name.replace(/\.(csv|txt)$/i, '');
  document.getElementById('cfgTitle').value = importedName;
  const reader = new FileReader();
  reader.onload = ev => { document.getElementById('csvInput').value = ev.target.result; };
  reader.readAsText(f);
  e.target.value = '';
}

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
    colors:  PALETTES[paletteKey] || PALETTES[DEFAULT_PALETTE],
    palette: paletteKey,
  };

  let canvas;
  try {
    if      (chartType === 'barres')  canvas = renderBarresCanvas(parsed, cfg);
    else if (chartType === 'stacked') canvas = renderStackedCanvas(parsed, cfg);
    else if (chartType === 'line')    canvas = renderLineCanvas(parsed, cfg);
    else                              canvas = renderGroupedCanvas(parsed, cfg);
  } catch (e) { showToast('Erreur : ' + e.message); return; }

  lastCanvas = canvas;
  const area = document.getElementById('previewArea');
  area.innerHTML = '';
  area.appendChild(canvas);
  document.getElementById('dlBtn').disabled   = false;
  document.getElementById('copyBtn').disabled = false;
}

/**
 * Copy the last rendered chart to the system clipboard as a PNG image.
 * Requires a secure context (HTTPS) and browser support for ClipboardItem.
 */
export function copyPNG() {
  if (!lastCanvas) { showToast("Générez d'abord un graphique !"); return; }
  // Safari 17.4+ requires a Promise<Blob> passed directly to ClipboardItem
  // (synchronous pattern). Chrome/Firefox also support this form.
  const blobPromise = new Promise(resolve => lastCanvas.toBlob(resolve, 'image/png'));
  navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })])
    .then(() => showToast('Copié dans le presse-papier !', true))
    .catch(() => showToast('Copie non supportée sur ce navigateur.'));
}

/** Download the last rendered chart as a PNG named after the source CSV or 'manual'. */
export function downloadPNG() {
  if (!lastCanvas) { showToast('Générez d\'abord un graphique !'); return; }
  const a = document.createElement('a');
  a.download = (importedName || 'manual') + '.png';
  a.href = canvasToDataURL(lastCanvas);
  a.click();
}

export function init() {
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => setType(btn.dataset.type, btn));
  });
  document.getElementById('generateBtn').addEventListener('click', generate);
  document.getElementById('dlBtn').addEventListener('click', downloadPNG);
  document.getElementById('copyBtn').addEventListener('click', copyPNG);
  document.getElementById('fileInput').addEventListener('change', loadFile);
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
  });

  const paletteSelect = document.getElementById('cfgPalette');
  if (paletteSelect) {
    paletteSelect.value = DEFAULT_PALETTE;
    paletteSelect.addEventListener('change', e => {
      setPalette(e.target.value);
      if (lastCanvas) generate();
    });
  }

  // Titles — auto-regen with 300 ms debounce to avoid re-rendering on every keystroke
  ['cfgTitle', 'cfgXTitle', 'cfgYTitle'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      clearTimeout(_debounce);
      _debounce = setTimeout(() => { if (lastCanvas) generate(); }, 300);
    });
  });

  // Manual edits to the textarea clear the imported filename so the PNG is
  // saved as 'manual.png' rather than the stale file name.
  document.getElementById('csvInput').addEventListener('input', () => {
    importedName = null;
  });

  updatePlaceholder(chartType);
}