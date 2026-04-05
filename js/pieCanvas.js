/**
 * pieCanvas.js
 * Standalone neumorphic pie chart renderer.
 * Canvas dimensions and layout mirror neumoCanvas.js / calcLayout() exactly.
 */

const BG    = '#F0F0F3';
const SD    = '#d1d5d9';
const SL    = '#ffffff';
const TC    = '#6c757d';
const SCALE = 2;
const FONT  = 'DM Sans';

// ── Layout constants — identical to neumoCanvas.js ───────────────────────────
const PAD   = 48;
const GAP   = 14;
const ZPPAD = 18;
const SPAD  = 48;
const RAIL_H = 300;

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function neumoRaised(ctx, x, y, w, h, rad) {
  ctx.save();
  ctx.fillStyle = BG;
  ctx.shadowColor = SD; ctx.shadowBlur = 24; ctx.shadowOffsetX = 10; ctx.shadowOffsetY = 10;
  roundedRect(ctx, x, y, w, h, rad); ctx.fill();
  ctx.shadowColor = SL; ctx.shadowBlur = 18; ctx.shadowOffsetX = -8; ctx.shadowOffsetY = -8;
  roundedRect(ctx, x, y, w, h, rad); ctx.fill();
  ctx.restore();
}

function neumoInset(ctx, x, y, w, h, rad) {
  ctx.save();
  ctx.fillStyle = BG;
  ctx.shadowColor = SD; ctx.shadowBlur = 12; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 5;
  roundedRect(ctx, x, y, w, h, rad); ctx.fill();
  ctx.shadowColor = SL; ctx.shadowBlur = 12; ctx.shadowOffsetX = -5; ctx.shadowOffsetY = -5;
  roundedRect(ctx, x, y, w, h, rad); ctx.fill();
  ctx.restore();
}

export function renderPieCanvas({ headers, rows }, cfg) {
  const items = rows
    .map(r => ({ label: String(r[headers[0]] ?? ''), value: Number(r[headers[1]]) }))
    .filter(d => d.label && Number.isFinite(d.value) && d.value > 0);

  if (items.length < 2) throw new Error('Le camembert nécessite au moins deux valeurs positives.');
  const total = items.reduce((s, d) => s + d.value, 0);
  if (total <= 0) throw new Error('Le total doit être strictement positif.');

  // ── Dimensions — same formula as calcLayout() in neumoCanvas.js ──────────
  const titleH  = 24;
  const xRowH   = 22;
  const legendH = 44;
  const zoneH   = RAIL_H + ZPPAD * 2 + xRowH;          // 358 — identical to bar charts
  const totalH  = PAD + GAP + titleH + GAP + zoneH + legendH + PAD + Math.round(SPAD * 1.5);

  // Width: pie needs a square zone — use a fixed wide W like other charts
  const W = 980;
  const H = totalH;

  const canvas = document.createElement('canvas');
  canvas.width  = W * SCALE;
  canvas.height = H * SCALE;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  ctx.save();
  ctx.translate(SPAD, SPAD);
  const iW = W - 2 * SPAD;
  const iH = H - 2 * SPAD;

  // 1. Outer raised card
  neumoRaised(ctx, 5, 5, iW - 10, iH - 10, 22);

  // 2. Title
  ctx.save();
  ctx.font = `700 ${titleH}px "${FONT}", sans-serif`;
  ctx.fillStyle = TC;
  ctx.textBaseline = 'middle';
  ctx.fillText(cfg.title || 'Mon graphique', PAD, PAD + titleH / 2);
  ctx.restore();

  // 3. Inner inset zone — zX/zY identical to buildCanvas()
  const zX    = PAD;
  const zY    = PAD + GAP + titleH + GAP;   // 100
  const zoneW = iW - PAD * 2;              // 788

  neumoInset(ctx, zX, zY, zoneW, zoneH, 18);

  // 4. Pie — centered in zone
  const r  = Math.max(40, Math.min(zoneW / 2, zoneH / 2) - (cfg.pieShowLabels ? 52 : 16));
  const cx = zX + zoneW / 2;
  const cy = zY + zoneH / 2;

  const gap = 0.018;
  let angle = -Math.PI / 2;

  items.forEach((d, i) => {
    const frac  = d.value / total;
    const sweep = frac * Math.PI * 2;
    const start = angle + gap / 2;
    const end   = angle + sweep - gap / 2;
    const mid   = (start + end) / 2;
    const color = cfg.colors[i % cfg.colors.length];

    ctx.save();
    ctx.translate(Math.cos(mid) * 3, Math.sin(mid) * 3);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle     = color;
    ctx.shadowColor   = SD;
    ctx.shadowBlur    = 14;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    ctx.fill();
    ctx.strokeStyle = BG;
    ctx.lineWidth   = 4;
    ctx.shadowColor = 'transparent';
    ctx.stroke();
    ctx.restore();

    if (cfg.pieShowLabels) {
      const lx1 = cx + Math.cos(mid) * (r + 6);
      const ly1 = cy + Math.sin(mid) * (r + 6);
      const lx2 = cx + Math.cos(mid) * (r + 24);
      const ly2 = cy + Math.sin(mid) * (r + 24);
      const right = Math.cos(mid) >= 0;
      const lx3   = lx2 + (right ? 18 : -18);

      ctx.save();
      ctx.strokeStyle  = TC; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(lx1, ly1); ctx.lineTo(lx2, ly2); ctx.lineTo(lx3, ly2);
      ctx.stroke();
      ctx.globalAlpha  = 1;
      ctx.fillStyle    = TC;
      ctx.font         = `700 12px "${FONT}", sans-serif`;
      ctx.textAlign    = right ? 'left' : 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${d.value} (${Math.round(frac * 100)}%)`, lx3 + (right ? 4 : -4), ly2);
      ctx.restore();
    }

    angle += sweep;
  });

  // 5. Legend — same position as drawLegend() in neumoCanvas
  const legendY = zY + zoneH + 30;
  const DOT = 10, DGAP = 5, IGAP = 16;

  ctx.save();
  ctx.font = `500 13px "${FONT}", sans-serif`;
  ctx.textBaseline = 'middle';
  const legendItems = items.map((d, i) => ({
    label: d.label,
    color: cfg.colors[i % cfg.colors.length],
    w: ctx.measureText(d.label).width + DOT + DGAP,
  }));
  const totalLegendW = legendItems.reduce((a, b) => a + b.w, 0) + (legendItems.length - 1) * IGAP;
  let lx = zX + (zoneW - totalLegendW) / 2;

  legendItems.forEach(it => {
    ctx.save();
    ctx.fillStyle = it.color;
    ctx.shadowColor = SD; ctx.shadowBlur = 2; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1;
    roundedRect(ctx, lx, legendY - DOT / 2, DOT, DOT, 3);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = TC;
    ctx.fillText(it.label, lx + DOT + DGAP, legendY);
    lx += it.w + IGAP;
  });
  ctx.restore();

  ctx.restore();
  return canvas;
}
