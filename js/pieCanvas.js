/**
 * pieCanvas.js
 * Neumorphic pie-chart renderer.
 *
 * All shared constants and helpers are imported from canvasCore.js.
 */
import {
  BG, SD, TC, RAIL_H,
  SCALE, FONT, PAD, GAP, ZPPAD, SPAD, FS_LEGEND,
  roundRect, neumoRaised,
} from './canvasCore.js';

export function renderPieCanvas({ headers, rows }, cfg) {
  const items = rows
    .map(r => ({ label: String(r[headers[0]] ?? ''), value: Number(r[headers[1]]) }))
    .filter(d => d.label && Number.isFinite(d.value) && d.value > 0);

  if (items.length < 2) throw new Error('Le camembert nécessite au moins deux valeurs positives.');
  const total = items.reduce((s, d) => s + d.value, 0);
  if (total <= 0) throw new Error('Le total doit être strictement positif.');

  // Dimensions — same formula as calcLayout() in canvasCore.js
  const titleH  = 24, xRowH = 22, legendH = 44;
  const zoneH   = RAIL_H + ZPPAD * 2 + xRowH;
  const totalH  = PAD + GAP + titleH + GAP + zoneH + legendH + PAD + Math.round(SPAD * 1.5);
  const W = 980, H = totalH;

  const canvas = document.createElement('canvas');
  canvas.width  = W * SCALE; canvas.height = H * SCALE;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // Canvas background is intentionally transparent.
  ctx.save();
  ctx.translate(SPAD, SPAD);
  const iW = W - 2 * SPAD, iH = H - 2 * SPAD;

  // 1. Outer raised card
  neumoRaised(ctx, 5, 5, iW - 10, iH - 10, 22);

  // 2. Title
  ctx.save();
  ctx.font = `700 ${titleH}px "${FONT}", sans-serif`;
  ctx.fillStyle = TC; ctx.textBaseline = 'middle';
  ctx.fillText(cfg.title || 'Mon graphique', PAD, PAD + titleH / 2);
  ctx.restore();

  // 3. Inner inset zone — identical position to buildCanvas()
  const zX = PAD, zY = PAD + GAP + titleH + GAP, zoneW = iW - PAD * 2;
  neumoRaised(ctx, zX, zY, zoneW, zoneH, 18, 8, 8, 18);

  // 4. Pie — centred in zone
  const r  = Math.max(40, Math.min(zoneW / 2, zoneH / 2) - (cfg.pieShowLabels ? 52 : 16));
  const cx = zX + zoneW / 2, cy = zY + zoneH / 2;
  const gap = 0.018;
  let angle = -Math.PI / 2;

  items.forEach((d, i) => {
    const frac  = d.value / total;
    const sweep = frac * Math.PI * 2;
    const start = angle + gap / 2, end = angle + sweep - gap / 2;
    const mid   = (start + end) / 2;
    const color = cfg.colors[i % cfg.colors.length];

    ctx.save();
    ctx.translate(Math.cos(mid) * 3, Math.sin(mid) * 3);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, start, end); ctx.closePath();
    ctx.fillStyle   = color;
    ctx.shadowColor = SD; ctx.shadowBlur = 14; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 5;
    ctx.fill();
    ctx.strokeStyle = BG; ctx.lineWidth = 4; ctx.shadowColor = 'transparent';
    ctx.stroke();
    ctx.restore();

    if (cfg.pieShowLabels) {
      const lx1 = cx + Math.cos(mid) * (r + 6),  ly1 = cy + Math.sin(mid) * (r + 6);
      const lx2 = cx + Math.cos(mid) * (r + 24), ly2 = cy + Math.sin(mid) * (r + 24);
      const right = Math.cos(mid) >= 0, lx3 = lx2 + (right ? 18 : -18);
      ctx.save();
      ctx.strokeStyle = TC; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.moveTo(lx1, ly1); ctx.lineTo(lx2, ly2); ctx.lineTo(lx3, ly2); ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = TC;
      ctx.font = `700 12px "${FONT}", sans-serif`;
      ctx.textAlign = right ? 'left' : 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(`${d.value} (${Math.round(frac * 100)}%)`, lx3 + (right ? 4 : -4), ly2);
      ctx.restore();
    }
    angle += sweep;
  });

  // 5. Legend — same position as drawLegend() in canvasCore
  const legendY = zY + zoneH + 30, DOT = 10, DGAP = 5, IGAP = 16;
  ctx.save();
  ctx.font = `500 ${FS_LEGEND}px "${FONT}", sans-serif`; ctx.textBaseline = 'middle';
  const legendItems = items.map((d, i) => ({
    label: d.label, color: cfg.colors[i % cfg.colors.length],
    w: ctx.measureText(d.label).width + DOT + DGAP,
  }));
  const totalLegendW = legendItems.reduce((a, b) => a + b.w, 0) + (legendItems.length - 1) * IGAP;
  let lx = zX + (zoneW - totalLegendW) / 2;
  legendItems.forEach(it => {
    ctx.save();
    ctx.fillStyle = it.color;
    ctx.shadowColor = SD; ctx.shadowBlur = 2; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1;
    roundRect(ctx, lx, legendY - DOT / 2, DOT, DOT, 3); ctx.fill();
    ctx.restore();
    ctx.fillStyle = TC;
    ctx.fillText(it.label, lx + DOT + DGAP, legendY);
    lx += it.w + IGAP;
  });
  ctx.restore();

  ctx.restore();
  return canvas;
}
