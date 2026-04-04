
// ─────────────────────────────────────────────────────────────────────────────
// neumoCanvas.js — rendu 100% Canvas 2D, reproduit fidèlement le style CSS
// ─────────────────────────────────────────────────────────────────────────────

import { COLORS, RAIL_H, Y_TICKS, Y_AX_W, Y_TTL_W, GRP_GAP } from './constants.js';
import { niceIntTicks, fmtX } from './utils.js';

// ── Constantes visuelles (synchronisées avec tokens.css / chart.css) ─────────
const BG       = '#F0F0F3';
const SD       = '#d0d0d4';   // shadow dark
const SL       = '#ffffff';   // shadow light
const SD2      = '#d1d5d9';   // shadow dark (zone/rail)
const TC       = '#6c757d';   // text color
const ACCENT   = '#9E68D2';
const SCALE    = 2;           // HiDPI ×2
const FONT     = 'DM Sans';

// ── Utilitaires canvas ────────────────────────────────────────────────────────

function hex2rgba(hex, a = 1) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

/** Arrondi avec support des 4 rayons distincts */
function roundRect(ctx, x, y, w, h, r) {
  const [tl, tr, br, bl] = typeof r === 'number' ? [r,r,r,r] : r;
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.arcTo(x+w, y,   x+w, y+tr,   tr);
  ctx.lineTo(x+w, y+h-br);
  ctx.arcTo(x+w, y+h, x+w-br, y+h, br);
  ctx.lineTo(x+bl, y+h);
  ctx.arcTo(x,   y+h, x, y+h-bl,   bl);
  ctx.lineTo(x,   y+tl);
  ctx.arcTo(x,   y,   x+tl, y,     tl);
  ctx.closePath();
}

/** Ombre portée neumorphique (raised) */
function neumoRaised(ctx, x, y, w, h, r, dx=10, dy=10, blur=20) {
  // dark shadow
  ctx.save();
  ctx.shadowColor  = SD;
  ctx.shadowOffsetX = dx; ctx.shadowOffsetY = dy; ctx.shadowBlur = blur;
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = BG; ctx.fill();
  ctx.restore();
  // light shadow
  ctx.save();
  ctx.shadowColor  = SL;
  ctx.shadowOffsetX = -dx; ctx.shadowOffsetY = -dy; ctx.shadowBlur = blur;
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = BG; ctx.fill();
  ctx.restore();
  // fill
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = BG; ctx.fill();
}

/** Ombre inset neumorphique (rail) */
function neumoInset(ctx, x, y, w, h, r) {
  // fond de base
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = BG; ctx.fill();
  // clip dans la forme
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  // dark inset (haut-gauche)
  const grad1 = ctx.createLinearGradient(x, y, x+w*0.5, y+h*0.5);
  grad1.addColorStop(0, hex2rgba(SD2, 0.7));
  grad1.addColorStop(1, hex2rgba(SD2, 0));
  ctx.fillStyle = grad1;
  ctx.fillRect(x, y, w, h);
  // light inset (bas-droit)
  const grad2 = ctx.createLinearGradient(x+w, y+h, x+w*0.5, y+h*0.5);
  grad2.addColorStop(0, hex2rgba(SL, 0.9));
  grad2.addColorStop(1, hex2rgba(SL, 0));
  ctx.fillStyle = grad2;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  // contour léger
  roundRect(ctx, x, y, w, h, r);
  ctx.strokeStyle = hex2rgba(SD2, 0.18);
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** Barre de couleur avec mini ombre portée */
function drawBar(ctx, x, y, w, h, color, r) {
  // ombre
  ctx.save();
  ctx.shadowColor = SD2; ctx.shadowOffsetX=2; ctx.shadowOffsetY=2; ctx.shadowBlur=4;
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = color; ctx.fill();
  ctx.restore();
  // light reflection
  ctx.save();
  ctx.shadowColor = SL; ctx.shadowOffsetX=-2; ctx.shadowOffsetY=-2; ctx.shadowBlur=4;
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = color; ctx.fill();
  ctx.restore();
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = color; ctx.fill();
}

/** Ligne de grille horizontale */
function drawGrid(ctx, x, y, w, opacity) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = TC;
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x+w, y);
  ctx.stroke();
  ctx.restore();
}

// ── Layout constants ──────────────────────────────────────────────────────────
const PAD    = 36;   // padding carte principale
const GAP    = 14;   // gap titre → zone
const ZPPAD  = 18;   // padding zone
const BAR_W_DEFAULT = 44;
const CELL_GAP = 12; // GRP_GAP

// ── Calcul des dimensions ─────────────────────────────────────────────────────
function calcLayout(nBars, hasYTitle, hasXTitle, hasLegend, nSeries=1, barWOverride=null) {
  const BAR_W   = barWOverride ?? Math.max(28, Math.min(60, Math.floor(700 / nBars)));
  const CELL_W  = BAR_W + CELL_GAP;
  const yTtlW   = hasYTitle ? Y_TTL_W : 0;
  const spacerW = yTtlW + Y_AX_W;
  const barsW   = CELL_W * nBars;
  const innerW  = spacerW + barsW;
  const xRowH   = 22;
  const xTtlH   = hasXTitle ? 20 : 0;
  const legendH = (hasLegend && nSeries > 1) ? 24 : 0;
  const zoneW   = innerW + ZPPAD * 2;
  const zoneH   = RAIL_H + ZPPAD * 2;
  const titleH  = 24;
  const totalW  = PAD*2 + zoneW;
  const totalH  = PAD + GAP + titleH + GAP + zoneH + xRowH + xTtlH + legendH + PAD;
  return { BAR_W, CELL_W, spacerW, yTtlW, barsW, innerW,
           xRowH, xTtlH, legendH, zoneW, zoneH, titleH, totalW, totalH };
}

// ── Dessin partagé (axes, grille, labels) ─────────────────────────────────────
function drawAxes(ctx, L, ticks, axMin, span, zX, zY, chartX, chartY) {
  // labels Y + grilles
  for (const tv of ticks) {
    const pct = Math.max(0, Math.min(1, (tv - axMin) / span));
    const yy  = zY + RAIL_H - pct * RAIL_H;  // dans zone coords
    const op  = Math.abs(tv) < 0.001 ? 0.65 : 0.2;
    // grille sur toute la largeur des barres
    drawGrid(ctx, zX + ZPPAD + L.spacerW, yy + zY - (zY), L.barsW, op);
    // label
    ctx.save();
    ctx.font = `600 11px "${FONT}", sans-serif`;
    ctx.fillStyle = TC;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(tv), zX + ZPPAD + L.spacerW - 4, yy);
    ctx.restore();
  }
}

function drawXLabels(ctx, labels, L, zX, zY) {
  const y = zY + RAIL_H + ZPPAD + 14;
  labels.forEach((lbl, i) => {
    const cx = zX + ZPPAD + L.spacerW + i * L.CELL_W + L.CELL_W/2;
    ctx.save();
    ctx.font = `800 12px "${FONT}", sans-serif`;
    ctx.fillStyle = TC;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(lbl), cx, y);
    ctx.restore();
  });
}

function drawXTitle(ctx, title, L, zX, zY) {
  if (!title) return;
  const y = zY + RAIL_H + ZPPAD + 14 + 20;
  const cx = zX + ZPPAD + L.spacerW + L.barsW / 2;
  ctx.save();
  ctx.font = `700 12px "${FONT}", sans-serif`;
  ctx.fillStyle = TC;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, cx, y);
  ctx.restore();
}

function drawYTitle(ctx, title, L, zX, zY) {
  if (!title || !L.yTtlW) return;
  const cx = zX + ZPPAD + L.yTtlW / 2;
  const cy = zY + RAIL_H / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 2);
  ctx.font = `700 12px "${FONT}", sans-serif`;
  ctx.fillStyle = TC;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 0, 0);
  ctx.restore();
}

function drawLegend(ctx, series, colors, L, zX, bottomY) {
  if (series.length <= 1) return;
  const DOT = 10, GAP_DOT = 5, ITEM_GAP = 15;
  ctx.save();
  ctx.font = `500 11.5px "${FONT}", sans-serif`;
  const items = series.map((s, i) => ({ s, w: ctx.measureText(s).width + DOT + GAP_DOT, color: colors[i] }));
  const totalW = items.reduce((a, b) => a + b.w, 0) + (items.length-1)*ITEM_GAP;
  let x = zX + (L.zoneW - totalW) / 2;
  const y = bottomY;
  items.forEach(it => {
    // dot neumorphique
    ctx.save();
    ctx.shadowColor = SD2; ctx.shadowOffsetX=1; ctx.shadowOffsetY=1; ctx.shadowBlur=2;
    roundRect(ctx, x, y - DOT/2, DOT, DOT, 3);
    ctx.fillStyle = it.color; ctx.fill();
    ctx.restore();
    ctx.fillStyle = TC;
    ctx.textBaseline = 'middle';
    ctx.fillText(it.s, x + DOT + GAP_DOT, y);
    x += it.w + ITEM_GAP;
  });
  ctx.restore();
}

// ── Rendu principal partagé ───────────────────────────────────────────────────
function buildCanvas(L, cfg, drawBars) {
  const C = document.createElement('canvas');
  C.width  = L.totalW  * SCALE;
  C.height = L.totalH  * SCALE;
  C.style.width  = L.totalW  + 'px';
  C.style.height = L.totalH  + 'px';
  const ctx = C.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // ── Carte principale (raised) ──────────────────────────────────────────────
  neumoRaised(ctx, PAD*0, PAD*0, L.totalW, L.totalH, 24, 10, 10, 20);
  // fond blanc cassé
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, L.totalW, L.totalH);
  neumoRaised(ctx, 5, 5, L.totalW-10, L.totalH-10, 22, 10, 10, 20);

  // ── Titre ─────────────────────────────────────────────────────────────────
  const titleY = PAD + L.titleH / 2;
  ctx.save();
  ctx.font = `700 17px "${FONT}", sans-serif`;
  ctx.fillStyle = TC;
  ctx.textBaseline = 'middle';
  ctx.fillText(cfg.title || '', PAD, titleY);
  ctx.restore();

  // ── Zone chart (raised interne) ───────────────────────────────────────────
  const zX = PAD;
  const zY = PAD + GAP + L.titleH + GAP;
  neumoRaised(ctx, zX, zY, L.zoneW, L.zoneH, 18, 5, 5, 10);
  // contour léger
  roundRect(ctx, zX, zY, L.zoneW, L.zoneH, 18);
  ctx.strokeStyle = hex2rgba(SD2, 0.12); ctx.lineWidth=1; ctx.stroke();

  // ── Y title + Y axis ──────────────────────────────────────────────────────
  drawYTitle(ctx, cfg.yTitle, L, zX, zY + ZPPAD);

  // drawBars doit dessiner rails + barres + axes
  drawBars(ctx, L, zX + ZPPAD, zY + ZPPAD);

  // ── Labels X ─────────────────────────────────────────────────────────────
  drawXLabels(ctx, L._xLabels, L, zX, zY + ZPPAD);
  drawXTitle(ctx, cfg.xTitle, L, zX, zY + ZPPAD);

  // ── Légende ───────────────────────────────────────────────────────────────
  const legendY = zY + L.zoneH + L.xRowH + L.xTtlH + 12;
  if (L._series) drawLegend(ctx, L._series, L._colors, L, zX, legendY);

  return C;
}

// ── Histogramme ───────────────────────────────────────────────────────────────
export function renderHistogramCanvas({ headers, rows }, cfg) {
  const [, nomSerie] = headers;
  const nomAxe = headers[0];
  const color  = COLORS[0];
  const data   = rows.map(r => ({ x: r[nomAxe], v: parseFloat(r[nomSerie]) || 0 }));
  const maxV   = Math.max(...data.map(d => d.v), 0);
  const ticks  = niceIntTicks(0, maxV, Y_TICKS);
  const axMin  = ticks[0], axMax = ticks[ticks.length-1];
  const span   = axMax - axMin || 1;

  const L = calcLayout(data.length, !!cfg.yTitle, !!cfg.xTitle, false);
  L._xLabels = data.map(d => fmtX(d.x));

  return buildCanvas(L, cfg, (ctx, L, ox, oy) => {
    // grilles + labels Y
    for (const tv of ticks) {
      const pct = Math.max(0, Math.min(1, (tv - axMin) / span));
      const yy  = oy + RAIL_H - pct * RAIL_H;
      const op  = Math.abs(tv) < 0.001 ? 0.65 : 0.2;
      drawGrid(ctx, ox + L.spacerW, yy, L.barsW, op);
      ctx.save();
      ctx.font = `600 11px "${FONT}", sans-serif`;
      ctx.fillStyle = TC; ctx.textAlign='right'; ctx.textBaseline='middle';
      ctx.fillText(Math.round(tv), ox + L.spacerW - 4, yy);
      ctx.restore();
    }
    drawYTitle(ctx, cfg.yTitle, L, ox - ZPPAD, oy);

    data.forEach((d, i) => {
      const cx  = ox + L.spacerW + i * L.CELL_W + L.CELL_W/2;
      const rX  = cx - L.BAR_W/2;
      // rail inset
      neumoInset(ctx, rX, oy, L.BAR_W, RAIL_H, 10);
      // barre
      const bH  = Math.max(0, (d.v / span) * (RAIL_H - 6));
      const bW  = L.BAR_W * 0.65;
      const bX  = cx - bW/2;
      const bY  = oy + RAIL_H - bH - 3;
      if (bH > 0) drawBar(ctx, bX, bY, bW, bH, color, [9,9,3,3]);
    });
  });
}

// ── Barres empilées ───────────────────────────────────────────────────────────
export function renderStackedCanvas({ headers, rows }, cfg) {
  const nomAxe = headers[0];
  const series = headers.slice(1);
  const colors = series.map((_, i) => COLORS[i % COLORS.length]);
  const data   = rows.map(r => ({ x: r[nomAxe], values: series.map(s => parseFloat(r[s])||0) }));
  const maxTot = Math.max(...data.map(d => d.values.reduce((a,b)=>a+b,0)), 0);
  const ticks  = niceIntTicks(0, maxTot, Y_TICKS);
  const axMin  = ticks[0], axMax = ticks[ticks.length-1];
  const span   = axMax - axMin || 1;
  const BAR_W  = Math.max(28, Math.min(56, Math.floor(700/data.length)));

  const L = calcLayout(data.length, !!cfg.yTitle, !!cfg.xTitle, true, series.length, BAR_W);
  L._xLabels = data.map(d => fmtX(d.x));
  L._series  = series; L._colors = colors;

  return buildCanvas(L, cfg, (ctx, L, ox, oy) => {
    for (const tv of ticks) {
      const pct = Math.max(0, Math.min(1, (tv-axMin)/span));
      const yy  = oy + RAIL_H - pct*RAIL_H;
      const op  = Math.abs(tv)<0.001 ? 0.65 : 0.2;
      drawGrid(ctx, ox+L.spacerW, yy, L.barsW, op);
      ctx.save();
      ctx.font=`600 11px "${FONT}",sans-serif`;
      ctx.fillStyle=TC; ctx.textAlign='right'; ctx.textBaseline='middle';
      ctx.fillText(Math.round(tv), ox+L.spacerW-4, yy);
      ctx.restore();
    }
    data.forEach((d, i) => {
      const cx = ox+L.spacerW+i*L.CELL_W+L.CELL_W/2;
      const rX = cx-L.BAR_W/2;
      neumoInset(ctx, rX, oy, L.BAR_W, RAIL_H, 10);
      let botH = 3;
      d.values.forEach((v, si) => {
        const bH = Math.max(0, (v/span)*(RAIL_H-6));
        const bW = L.BAR_W*0.65;
        const bX = cx-bW/2;
        const bY = oy+RAIL_H-botH-bH;
        const isBot=si===0, isTop=si===series.length-1;
        const r = isBot&&isTop?[8,8,8,8]: isTop?[8,8,0,0]: isBot?[0,0,8,8]:[0,0,0,0];
        if (bH>0) drawBar(ctx, bX, bY, bW, bH, colors[si], r);
        botH += bH;
      });
    });
  });
}

// ── Barres groupées ───────────────────────────────────────────────────────────
export function renderGroupedCanvas({ headers, rows }, cfg) {
  const nomAxe = headers[0];
  const series = headers.slice(1);
  const colors = series.map((_, i) => COLORS[i % COLORS.length]);
  const BAR_W  = 15, BAR_GAP = 3;
  const grpW   = series.length*BAR_W+(series.length-1)*BAR_GAP;
  const CELL_W = grpW+CELL_GAP;
  const data   = rows.map(r => ({ x: r[nomAxe], values: series.map(s => parseFloat(r[s])||0) }));
  const allV   = data.flatMap(d => d.values);
  const valMin = Math.min(...allV,0), valMax=Math.max(...allV,0);
  const ticks  = niceIntTicks(valMin, valMax, Y_TICKS);
  const axMin  = ticks[0], axMax=ticks[ticks.length-1];
  const span   = axMax-axMin||1;
  const zeroPct= (-axMin/span);

  const hasYT = !!cfg.yTitle;
  const spacerW = (hasYT?Y_TTL_W:0)+Y_AX_W;
  const barsW   = CELL_W*data.length;
  const zoneW   = spacerW+barsW+ZPPAD*2;
  const zoneH   = RAIL_H+ZPPAD*2;
  const xRowH=22, xTtlH=cfg.xTitle?20:0, legendH=series.length>1?24:0;
  const totalW=PAD*2+zoneW;
  const totalH=PAD+GAP+24+GAP+zoneH+xRowH+xTtlH+legendH+PAD;

  const L={BAR_W,CELL_W,spacerW,yTtlW:hasYT?Y_TTL_W:0,barsW,zoneW,zoneH,
           titleH:24,totalW,totalH,xRowH,xTtlH,legendH,
           _xLabels:data.map(d=>fmtX(d.x)),_series:series,_colors:colors};

  return buildCanvas(L, cfg, (ctx, L, ox, oy) => {
    for (const tv of ticks) {
      const pct=Math.max(0,Math.min(1,(tv-axMin)/span));
      const yy=oy+RAIL_H-pct*RAIL_H;
      const op=Math.abs(tv)<0.001?0.65:0.2;
      drawGrid(ctx, ox+spacerW, yy, barsW, op);
      ctx.save();
      ctx.font=`600 11px "${FONT}",sans-serif`;
      ctx.fillStyle=TC; ctx.textAlign='right'; ctx.textBaseline='middle';
      ctx.fillText(Math.round(tv), ox+spacerW-4, yy);
      ctx.restore();
    }
    data.forEach((d, gi) => {
      const gx = ox+spacerW+gi*CELL_W+(CELL_W-grpW)/2;
      neumoInset(ctx, gx, oy, grpW, RAIL_H, 10);
      d.values.forEach((v, si) => {
        const bH=Math.abs(v)/span*(RAIL_H-6);
        const bX=gx+si*(BAR_W+BAR_GAP);
        const bY=v>=0? oy+RAIL_H-zeroPct*(RAIL_H-6)-bH-3 : oy+RAIL_H-zeroPct*(RAIL_H-6)-3;
        const r=v>=0?[7,7,2,2]:[2,2,7,7];
        if (bH>0) drawBar(ctx, bX, bY, BAR_W, bH, colors[si], r);
      });
    });
  });
}

/** Export PNG depuis un canvas */
export function canvasToDataURL(canvas) {
  return canvas.toDataURL('image/png');
}
