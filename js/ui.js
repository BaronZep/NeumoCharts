import { CSV_PLACEHOLDERS, PALETTES, DEFAULT_PALETTE } from './constants.js';
import { parseCSV } from './csv.js';
import { renderHistogramCanvas, renderStackedCanvas, renderGroupedCanvas, renderLineCanvas, canvasToDataURL } from './neumoCanvas.js';

let chartType   = 'histogram';
let paletteKey  = DEFAULT_PALETTE;
let lastCanvas  = null;
let importedName = null; // nom du fichier CSV importé (sans extension), null si saisie manuelle

export function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
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
}

export function setPalette(key) {
  paletteKey = PALETTES[key] ? key : DEFAULT_PALETTE;
}

export function loadFile(e) {
  const f = e.target.files[0];
  if (!f) return;
  // Stocker le nom sans extension
  importedName = f.name.replace(/\.csv$/i, '').replace(/\.txt$/i, '');
  // Pré-remplir le titre avec le nom du fichier
  const titleInput = document.getElementById('cfgTitle');
  titleInput.value = importedName;
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
    colors: PALETTES[paletteKey] || PALETTES[DEFAULT_PALETTE],
    palette: paletteKey,
  };

  let canvas;
  try {
    if      (chartType === 'histogram') canvas = renderHistogramCanvas(parsed, cfg);
    else if (chartType === 'stacked')   canvas = renderStackedCanvas(parsed, cfg);
    else if (chartType === 'line')      canvas = renderLineCanvas(parsed, cfg);
    else                                canvas = renderGroupedCanvas(parsed, cfg);
  } catch (e) { showToast('Erreur : ' + e.message); return; }

  lastCanvas = canvas;
  const area = document.getElementById('previewArea');
  area.innerHTML = '';
  area.appendChild(canvas);
  document.getElementById('dlBtn').disabled = false;
}

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
  document.getElementById('fileInput').addEventListener('change', loadFile);
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
  });
  const paletteSelect = document.getElementById('cfgPalette');
  if (paletteSelect) {
    paletteSelect.value = DEFAULT_PALETTE;
    paletteSelect.addEventListener('change', e => setPalette(e.target.value));
  }
  // Si l'utilisateur édite le CSV à la main, on repasse en mode "manual"
  document.getElementById('csvInput').addEventListener('input', () => {
    importedName = null;
  });
  updatePlaceholder(chartType);
}
