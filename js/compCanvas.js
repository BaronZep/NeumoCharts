/**
 * compCanvas.js
 * Neumorphic "Comparaison" chart renderer.
 *
 * Layout:
 *   - Outer raised card (same as all other charts)
 *   - Title top-left (same position as all other charts)
 *   - One raised tile per series, centred inside the card (NO extra inset zone)
 *   - Each tile: series label top + donut arc + value in the centre
 */

const BG    = '#F0F0F3';
const SD    = '#d1d5d9';
const SL    = '#ffffff';
const TC    = '#6c757d';
const SCALE = 2;
const FONT  = 'DM Sans';

// ── Layout constants — mirror neumoCanvas.js ─────────────────────────────────
const PAD  = 48;
const GAP  = 14;
const SPAD = 48;

// ── Tile dimensions ──────────────────────────────────────────────────────────
const TILE_W   = 200;
const TILE_H   = 230;
const TILE_GAP = 28;
const DONUT_R  = 66;
const DONUT_T  = 25;

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function neumoRaised(ctx, x, y, w, h, rad, blurA, blurB, off) {
  const bA = blurA ?? 24, bB = blurB ?? 18, o = off ?? 10;
  ctx.save();
  ctx.fillStyle = BG;
  ctx.shadowColor = SD; ctx.shadowBlur = bA; ctx.shadowOffsetX = o;  ctx.shadowOffsetY = o;
  roundedRect(ctx, x, y, w, h, rad); ctx.fill();
  ctx.shadowColor = SL; ctx.shadowBlur = bB; ctx.shadowOffsetX = -o * 0.8; ctx.shadowOffsetY = -o * 0.8;
  roundedRect(ctx, x, y, w, h, rad); ctx.fill();
  ctx.restore();
}

function drawDonut(ctx, cx, cy, value, maxVal, color) {
  const r = DONUT_R;
  const t = DONUT_T;
  const progress = maxVal > 0 ? Math.min(value / maxVal, 1) : 0;
  const startAngle = -Math.PI / 2;
  const endAngle   = startAngle + progress * Math.PI * 2;

  // Inset track ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.arc(cx, cy, r - t, Math.PI * 2, 0, true);
  ctx.closePath();
  ctx.fillStyle = BG;
  ctx.shadowColor = SD; ctx.shadowBlur = 6; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 3;
  ctx.fill();
  ctx.shadowColor = SL; ctx.shadowBlur = 6; ctx.shadowOffsetX = -3; ctx.shadowOffsetY = -3;
  ctx.fill();
  ctx.restore();

  // Coloured arc
  if (progress > 0.01) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - t / 2, startAngle, endAngle);
    ctx.strokeStyle   = color;
    ctx.lineWidth     = t;
    ctx.lineCap       = 'round';
    ctx.shadowColor   = color;
    ctx.shadowBlur    = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.stroke();
    ctx.restore();
  }

  // Value in the centre
  ctx.save();
  ctx.fillStyle    = TC;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  const fs = String(value).length >= 5 ? 18 : String(value).length >= 4 ? 22 : 26;
  ctx.font = `800 ${fs}px "${FONT}", sans-serif`;
  ctx.fillText(String(value), cx, cy);
  ctx.restore();
}

export function renderCompCanvas({ headers, rows }, cfg) {
  const items = rows
    .map(r => ({ label: String(r[headers[0]] ?? ''), value: Number(r[headers[1]]) }))
    .filter(d => d.label && Number.isFinite(d.value));

  if (items.length < 1) throw new Error('Comparaison : au moins une série requise.');

  const maxVal = (cfg.compMax && cfg.compMax > 0)
    ? cfg.compMax
    : Math.max(...items.map(d => d.value));
  const n      = items.length;

  // ── Canvas dimensions (same formula as neumoCanvas calcLayout) ────────────
  const titleH = 24;

  // Width: based on tiles row, min 500px
  const tilesRowW = n * TILE_W + (n - 1) * TILE_GAP;
  const innerW    = Math.max(tilesRowW, 400);
  const totalW    = PAD * 2 + innerW + SPAD * 2;

  // Height: title + tiles row + paddings, same formula as calcLayout
  const contentH = TILE_H + PAD;
  const totalH   = PAD + GAP + titleH + GAP + contentH + PAD + Math.round(SPAD * 1.5);

  const W = totalW;
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

  // 2. Title — identical position to buildCanvas()
  ctx.save();
  ctx.font         = `700 ${titleH}px "${FONT}", sans-serif`;
  ctx.fillStyle    = TC;
  ctx.textBaseline = 'middle';
  ctx.fillText(cfg.title || 'Comparaison', PAD, PAD + titleH / 2);
  ctx.restore();

  // 3. Tiles — centred horizontally, vertically below title
  const tilesY    = PAD + GAP + titleH + GAP + (contentH - TILE_H) / 2;
  const tilesX    = PAD + (innerW - tilesRowW) / 2;

  items.forEach((d, i) => {
    const tx    = tilesX + i * (TILE_W + TILE_GAP);
    const color = cfg.colors[i % cfg.colors.length];

    // Tile raised card
    neumoRaised(ctx, tx, tilesY, TILE_W, TILE_H, 18, 14, 12, 7);

    // Series label
    ctx.save();
    ctx.font         = `700 16px "${FONT}", sans-serif`;
    ctx.fillStyle    = TC;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(d.label.toUpperCase(), tx + TILE_W / 2, tilesY + 18);
    ctx.restore();

    // Donut
    const cx = tx + TILE_W / 2;
    const cy = tilesY + 22 + (TILE_H - 22) / 2 + 4;
    drawDonut(ctx, cx, cy, d.value, maxVal, color);
  });

  ctx.restore();
  return canvas;
}
