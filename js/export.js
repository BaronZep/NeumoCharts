import { showToast } from './ui.js';

async function getCanvas() {
  const el = document.querySelector('.chart-wrap');
  if (!el) return null;

  await document.fonts.ready;

  const rect = el.getBoundingClientRect();
  const W = Math.ceil(rect.width)  * 2;  // scale x2
  const H = Math.ceil(rect.height) * 2;

  // 1. Sérialise le HTML du graphique + tous les styles de la page
  const styles = [...document.styleSheets]
    .flatMap(s => { try { return [...s.cssRules]; } catch { return []; } })
    .map(r => r.cssText)
    .join('\n');

  const html = `
    <html><head>
      <style>${styles}</style>
    </head><body style="margin:0;padding:0;background:transparent">
      <div style="display:inline-block;transform-origin:top left;transform:scale(2)">
        ${el.outerHTML}
      </div>
    </body></html>`;

  // 2. Encode en SVG foreignObject
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <foreignObject width="${W/2}" height="${H/2}">
        ${html}
      </foreignObject>
    </svg>`;

  // 3. Dessine sur canvas
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url  = URL.createObjectURL(blob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export async function downloadChart() {
  const btn = document.getElementById('dlBtn');
  const orig = btn.innerHTML;
  btn.textContent = '…';
  try {
    const canvas = await getCanvas();
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = 'neumo-chart.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  } catch (e) {
    showToast('Erreur export : ' + e.message);
  } finally {
    btn.innerHTML = orig;
  }
}

export async function copyChart() {
  const btn = document.getElementById('copyBtn');
  try {
    const canvas = await getCanvas();
    if (!canvas) return;
    canvas.toBlob(async blob => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        btn.textContent = '✓ Copié !';
        setTimeout(() => { btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copier`; }, 2000);
      } catch { showToast('Copie non supportée — utilisez Télécharger'); }
    });
  } catch (e) {
    showToast('Erreur export : ' + e.message);
  }
}