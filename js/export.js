import { showToast } from './ui.js';

/**
 * Capture the .chart-wrap element to a canvas via html2canvas.
 * @returns {Promise<HTMLCanvasElement|null>}
 */
async function getCanvas() {
  const el = document.querySelector('.chart-wrap');
  if (!el) return null;

  // Force le navigateur à avoir la font prête
  await document.fonts.ready;

  return html2canvas(el, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    onclone: (clonedDoc) => {
      // Copie toutes les @font-face dans le document cloné
      const style = clonedDoc.createElement('style');
      style.textContent = [...document.styleSheets]
        .flatMap(s => { try { return [...s.cssRules]; } catch { return []; } })
        .filter(r => r instanceof CSSFontFaceRule)
        .map(r => r.cssText)
        .join('\n');
      clonedDoc.head.appendChild(style);
    }
  });
}

export async function downloadChart() {
  const btn = document.getElementById('dlBtn');
  const origHTML = btn.innerHTML;
  btn.textContent = '…';
  const canvas = await getCanvas();
  if (!canvas) return;
  const a = document.createElement('a');
  a.download = 'neumo-chart.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
  btn.innerHTML = origHTML;
}

export async function copyChart() {
  const btn = document.getElementById('copyBtn');
  const canvas = await getCanvas();
  if (!canvas) return;
  canvas.toBlob(async blob => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      btn.textContent = '✓ Copié !';
      setTimeout(() => {
        btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <rect x="9" y="9" width="13" height="13" rx="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>Copier`;
      }, 2000);
    } catch {
      showToast('Copie non supportée — utilisez Télécharger');
    }
  });
}
