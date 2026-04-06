/**
 * canvasCore.js
 * Shared constants, theme runtime, primitives, and layout helpers.
 */
import {
  BG, SD, SL, TC,
  DARK_BG, DARK_SD, DARK_SL, DARK_TC,
  RAIL_H, Y_TICKS, Y_AX_W, Y_TTL_W, GRP_GAP,
} from './constants.js';

export { BG, SD, SL, TC, RAIL_H, Y_TICKS, Y_AX_W, Y_TTL_W, GRP_GAP };

export const RT = { BG, SD, SL, TC, dark: false };
export function setRenderTheme(isDark = false) {
  RT.dark = !!isDark;
  RT.BG = RT.dark ? DARK_BG : BG;
  RT.SD = RT.dark ? DARK_SD : SD;
  RT.SL = RT.dark ? DARK_SL : SL;
  RT.TC = RT.dark ? DARK_TC : TC;
}

export const SCALE = 2;
export const FONT  = 'DM Sans';
export const PAD   = 48;
export const GAP   = 14;
export const ZPPAD = 18;
export const SPAD  = 48;

export const FS_TITLE  = 25;
export const FS_XLABEL = 12;
export const FS_XTITLE = 16;
export const FS_YTITLE = 16;
export const FS_YAXIS  = 11;
export const FS_LEGEND = 13;

export function hex2rgba(hex, a = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function roundRect(ctx, x, y, w, h, r) {
  if (w <= 0 || h <= 0) return;
  const [tl, tr, br, bl] = typeof r === 'number' ? [r, r, r, r] : r;
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y); ctx.arcTo(x + w, y, x + w, y + tr, tr);
  ctx.lineTo(x + w, y + h - br); ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
  ctx.lineTo(x + bl, y + h); ctx.arcTo(x, y + h, x, y + h - bl, bl);
  ctx.lineTo(x, y + tl); ctx.arcTo(x, y, x + tl, y, tl);
  ctx.closePath();
}

export function neumoRaised(ctx, x, y, w, h, r, ox = 10, oy = 10, blur = 24, bg = RT.BG) {
  ctx.save();
  ctx.shadowColor = RT.SD; ctx.shadowOffsetX = ox;  ctx.shadowOffsetY = oy;  ctx.shadowBlur = blur;
  roundRect(ctx, x, y, w, h, r); ctx.fillStyle = bg; ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.shadowColor = RT.SL; ctx.shadowOffsetX = -ox; ctx.shadowOffsetY = -oy; ctx.shadowBlur = blur;
  roundRect(ctx, x, y, w, h, r); ctx.fillStyle = bg; ctx.fill();
  ctx.restore();
  roundRect(ctx, x, y, w, h, r); ctx.fillStyle = bg; ctx.fill();
}

export function neumoInset(ctx, x, y, w, h, r) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = RT.BG; ctx.fill();

  const D = 14;
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();

  let g;
  g = ctx.createLinearGradient(x, y, x, y + D);
  g.addColorStop(0, hex2rgba(RT.SD, 0.9)); g.addColorStop(1, hex2rgba(RT.SD, 0));
  ctx.fillStyle = g; ctx.fillRect(x, y, w, D);

  g = ctx.createLinearGradient(x, y, x + D, y);
  g.addColorStop(0, hex2rgba(RT.SD, 0.9)); g.addColorStop(1, hex2rgba(RT.SD, 0));
  ctx.fillStyle = g; ctx.fillRect(x, y, D, h);

  g = ctx.createLinearGradient(x, y + h - D, x, y + h);
  g.addColorStop(0, hex2rgba(RT.SL, 0)); g.addColorStop(1, hex2rgba(RT.SL, 0.80));
  ctx.fillStyle = g; ctx.fillRect(x, y + h - D, w, D);

  g = ctx.createLinearGradient(x + w - D, y, x + w, y);
  g.addColorStop(0, hex2rgba(RT.SL, 0)); g.addColorStop(1, hex2rgba(RT.SL, 0.80));
  ctx.fillStyle = g; ctx.fillRect(x + w - D, y, D, h);

  ctx.restore();
}

export function drawBar(ctx, x, y, w, h, color, r) {
  if (w <= 0 || h <= 0) return;
  ctx.save();
  ctx.shadowColor = RT.SD; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2; ctx.shadowBlur = 4;
  roundRect(ctx, x, y, w, h, r); ctx.fillStyle = color; ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.shadowColor = hex2rgba(RT.SL, 0.8); ctx.shadowOffsetX = -1; ctx.shadowOffsetY = -1; ctx.shadowBlur = 3;
  roundRect(ctx, x, y, w, h, r); ctx.fillStyle = color; ctx.fill();
  ctx.restore();
  roundRect(ctx, x, y, w, h, r); ctx.fillStyle = color; ctx.fill();
}

export function drawGrid(ctx, x, y, w, opacity) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = RT.TC; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
  ctx.restore();
}

export function drawYAxis(ctx, ticks, axMin, span, ox, oy, barsW) {
  for (const tv of ticks) {
    if (Math.abs(tv) < 0.001) continue;
    const pct = Math.max(0, Math.min(1, (tv - axMin) / span));
    const yy  = oy + RAIL_H - pct * RAIL_H;
    drawGrid(ctx, ox, yy, barsW, 0.2);
    ctx.save();
    ctx.font = `600 ${FS_YAXIS}px "${FONT}",sans-serif`;
    ctx.fillStyle = RT.TC; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(tv), ox - 4, yy);
    ctx.restore();
  }
}

export function drawXLabels(ctx, labels, CELL_W, ox, oy) {
  const y = oy + RAIL_H + 14;
  labels.forEach((lbl, i) => {
    ctx.save();
    ctx.font = `800 ${FS_XLABEL}px "${FONT}",sans-serif`;
    ctx.fillStyle = RT.TC; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(lbl), ox + i * CELL_W + CELL_W / 2, y);
    ctx.restore();
  });
}

export function drawXTitle(ctx, title, cx, oy) {
  if (!title) return;
  ctx.save();
  ctx.font = `700 ${FS_XTITLE}px "${FONT}",sans-serif`;
  ctx.fillStyle = RT.TC; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(title, cx, oy + RAIL_H + 14 + 28);
  ctx.restore();
}

export function drawYTitle(ctx, title, cx, cy) {
  if (!title) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 2);
  ctx.font = `700 ${FS_YTITLE}px "${FONT}",sans-serif`;
  ctx.fillStyle = RT.TC; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(title, 0, 0);
  ctx.restore();
}

export function drawLegend(ctx, series, colors, zX, zoneW, y) {
  if (series.length <= 1) return;
  const DOT = 10, DGAP = 5, IGAP = 16;
  ctx.save();
  ctx.font = `500 ${FS_LEGEND}px "${FONT}",sans-serif`;
  const items = series.map((s, i) => ({ s, w: ctx.measureText(s).width + DOT + DGAP, c: colors[i] }));
  const totalW = items.reduce((a, b) => a + b.w, 0) + (items.length - 1) * IGAP;
  let x = zX + (zoneW - totalW) / 2;
  items.forEach(it => {
    ctx.save();
    ctx.shadowColor = RT.SD; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1; ctx.shadowBlur = 2;
    roundRect(ctx, x, y - DOT / 2, DOT, DOT, 3);
    ctx.fillStyle = it.c; ctx.fill();
    ctx.restore();
    ctx.fillStyle = RT.TC; ctx.textBaseline = 'middle';
    ctx.fillText(it.s, x + DOT + DGAP, y);
    x += it.w + IGAP;
  });
  ctx.restore();
}

export function calcLayout(nBars, hasYTitle, hasXTitle, hasLegend, nSeries = 1, barWOverride = null) {
  const BAR_W   = barWOverride ?? Math.max(28, Math.min(60, Math.floor(700 / nBars)));
  const CELL_W  = BAR_W + GRP_GAP;
  const yTtlW   = hasYTitle ? Y_TTL_W : 0;
  const spacerW = yTtlW + Y_AX_W;
  const barsW   = CELL_W * nBars;
  const zoneW   = spacerW + barsW + ZPPAD * 2;
  const xRowH   = 22;
  const xTtlH   = hasXTitle ? 30 : 0;
  const legendH = (hasLegend && nSeries > 1) ? 44 : 0;
  const titleH  = 24;
  const zoneH   = RAIL_H + ZPPAD * 2 + xRowH + xTtlH;
  const totalW  = PAD * 2 + zoneW + SPAD * 2;
  const totalH  = PAD + GAP + titleH + GAP + zoneH + legendH + PAD + SPAD * 1.5;
  return { BAR_W, CELL_W, spacerW, yTtlW, barsW, zoneW, zoneH, titleH, totalW, totalH, xRowH, xTtlH, legendH, spad: SPAD };
}

export function buildCanvas(L, cfg, drawContent) {
  const C = document.createElement('canvas');
  C.width  = L.totalW * SCALE;
  C.height = L.totalH * SCALE;
  C.style.width  = L.totalW + 'px';
  C.style.height = L.totalH + 'px';
  const ctx = C.getContext('2d');
  ctx.scale(SCALE, SCALE);

  const sp = L.spad ?? 0;
  ctx.save();
  ctx.translate(sp, sp);
  const iW = L.totalW - 2 * sp;
  const iH = L.totalH - 2 * sp;

  neumoRaised(ctx, 5, 5, iW - 10, iH - 10, 22, 14, 14, 28);

  ctx.save();
  ctx.font = `700 ${FS_TITLE}px "${FONT}",sans-serif`;
  ctx.fillStyle = RT.TC; ctx.textBaseline = 'middle';
  ctx.fillText(cfg.title || '', PAD, PAD + L.titleH / 2);
  ctx.restore();

  const zX = PAD, zY = PAD + GAP + L.titleH + GAP;
  neumoRaised(ctx, zX, zY, L.zoneW, L.zoneH, 18, 8, 8, 18);

  const ox = zX + ZPPAD + (L.yTtlW || 0) + Y_AX_W;
  const oy = zY + ZPPAD;

  if (cfg.yTitle && L.yTtlW) drawYTitle(ctx, cfg.yTitle, zX + ZPPAD + L.yTtlW / 2, oy + RAIL_H / 2);

  drawContent(ctx, ox, oy, L);
  drawXLabels(ctx, L._xLabels, L.CELL_W, ox, oy);
  if (cfg.xTitle) drawXTitle(ctx, cfg.xTitle, ox + L.barsW / 2, oy);
  if (L._series) drawLegend(ctx, L._series, L._colors, zX, L.zoneW, zY + L.zoneH + 30);

  ctx.restore();
  return C;
}

/** Draw a small value label centred above (x, y). */
export function drawValueLabel(ctx, text, x, y) {
  ctx.save();
  ctx.font = `700 ${FS_YAXIS}px "${FONT}",sans-serif`;
  ctx.fillStyle = RT.TC;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(String(text), x, y - 4);
  ctx.restore();
}

export function canvasToDataURL(canvas) {
  return canvas.toDataURL('image/png');
}
