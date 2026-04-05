/**
 * neumoCanvas.js
 * Renders neumorphic charts to an off-screen HTMLCanvasElement at 2× resolution.
 * All drawing is done in logical pixels; ctx.scale(SCALE, SCALE) handles the
 * physical-pixel mapping so the exported PNG is crisp on retina displays.
 *
 * Exported render functions:
 *   renderBarresCanvas      – single-series bar chart
 *   renderStackedCanvas    – multi-series stacked bars
 *   renderGroupedCanvas    – multi-series grouped bars
 *   renderLineCanvas       – multi-series smooth line / area chart
 *   canvasToDataURL        – encode last canvas as PNG data URL
 */
import { COLORS, PALETTES, DEFAULT_PALETTE, RAIL_H, Y_TICKS, Y_AX_W, Y_TTL_W, GRP_GAP, SD, SL, TC } from './constants.js';
import { niceIntTicks, fmtX } from './utils.js';

// ── Rendering constants ───────────────────────────────────────────────────────
const BG    = '#F0F0F3'; // card surface colour (matches BG in constants.js)
const SD2   = '#d1d5d9'; // shadow dark stop
const SCALE = 2;         // device-pixel ratio for the exported canvas
const FONT  = 'DM Sans';
const PAD   = 48;        // outer padding inside the card
const GAP   = 14;        // vertical gap between title and chart zone
const ZPPAD = 18;        // inner padding of the chart zone
const SPAD  = 48;        // canvas bleed around the card (room for drop-shadow)

// ── Typography (logical px) ──────────────────────────────────────────────────
const FS_TITLE   = 25;
const FS_XLABEL  = 12;
const FS_XTITLE  = 16;
const FS_YTITLE  = 16;
const FS_YAXIS   = 11;
const FS_LEGEND  = 13;

// ─────────────────────────────────────────────────────────────────────────────
// Canvas utilities
// ─────────────────────────────────────────────────────────────────────────────

/** Decompose a hex colour string to an rgba() CSS value with the given alpha. */
function hex2rgba(hex, a = 1) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Draw a rounded rectangle path.
 * @param {number[]} r - [topLeft, topRight, bottomRight, bottomLeft] radii,
 *                       or a single number applied to all corners.
 */
function roundRect(ctx, x, y, w, h, r) {
  if (w <= 0 || h <= 0) return;
  const [tl,tr,br,bl] = typeof r === 'number' ? [r,r,r,r] : r;
  ctx.beginPath();
  ctx.moveTo(x+tl, y);
  ctx.lineTo(x+w-tr, y);    ctx.arcTo(x+w, y,    x+w, y+tr,   tr);
  ctx.lineTo(x+w, y+h-br);  ctx.arcTo(x+w, y+h,  x+w-br,y+h,  br);
  ctx.lineTo(x+bl, y+h);    ctx.arcTo(x,   y+h,  x, y+h-bl,   bl);
  ctx.lineTo(x,    y+tl);   ctx.arcTo(x,   y,    x+tl,y,       tl);
  ctx.closePath();
}

/**
 * Fill a raised neumorphic shape: two shadow passes (dark + light) followed
 * by a solid fill pass to restore the surface colour.
 */
function neumoRaised(ctx, x, y, w, h, r, ox=10, oy=10, blur=24, bg=BG) {
  ctx.save();
  ctx.shadowColor=SD2; ctx.shadowOffsetX=ox; ctx.shadowOffsetY=oy; ctx.shadowBlur=blur;
  roundRect(ctx,x,y,w,h,r); ctx.fillStyle=bg; ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.shadowColor=SL; ctx.shadowOffsetX=-ox; ctx.shadowOffsetY=-oy; ctx.shadowBlur=blur;
  roundRect(ctx,x,y,w,h,r); ctx.fillStyle=bg; ctx.fill();
  ctx.restore();
  roundRect(ctx,x,y,w,h,r); ctx.fillStyle=bg; ctx.fill();
}

/**
 * Fill an inset neumorphic shape using four linear gradients clipped to the
 * shape bounds. Using gradients (rather than inset box-shadows) is necessary
 * because ctx.shadowOffset is not affected by ctx.scale(), which would cause
 * misalignment at SCALE > 1.
 */
function neumoInset(ctx, x, y, w, h, r) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = BG; ctx.fill();

  const D = 14; // gradient depth in logical px

  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();

  let g;
  g = ctx.createLinearGradient(x, y, x, y + D);
  g.addColorStop(0, 'rgba(209,213,217,0.9)');
  g.addColorStop(1, 'rgba(209,213,217,0)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, D);

  g = ctx.createLinearGradient(x, y, x + D, y);
  g.addColorStop(0, 'rgba(209,213,217,0.9)');
  g.addColorStop(1, 'rgba(209,213,217,0)');
  ctx.fillStyle = g; ctx.fillRect(x, y, D, h);

  g = ctx.createLinearGradient(x, y + h - D, x, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(255,255,255,0.80)');
  ctx.fillStyle = g; ctx.fillRect(x, y + h - D, w, D);

  g = ctx.createLinearGradient(x + w - D, y, x + w, y);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(255,255,255,0.80)');
  ctx.fillStyle = g; ctx.fillRect(x + w - D, y, D, h);

  ctx.restore();
}

/** Fill a rounded bar with a soft raised drop-shadow. */
function drawBar(ctx, x, y, w, h, color, r) {
  if(w<=0||h<=0) return;
  ctx.save();
  ctx.shadowColor=SD2; ctx.shadowOffsetX=2; ctx.shadowOffsetY=2; ctx.shadowBlur=4;
  roundRect(ctx,x,y,w,h,r); ctx.fillStyle=color; ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.shadowColor=hex2rgba(SL,0.8); ctx.shadowOffsetX=-1; ctx.shadowOffsetY=-1; ctx.shadowBlur=3;
  roundRect(ctx,x,y,w,h,r); ctx.fillStyle=color; ctx.fill();
  ctx.restore();
  roundRect(ctx,x,y,w,h,r); ctx.fillStyle=color; ctx.fill();
}

/** Draw a single horizontal grid line at the given y position. */
function drawGrid(ctx, x, y, w, opacity) {
  ctx.save();
  ctx.globalAlpha=opacity;
  ctx.strokeStyle=TC; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+w,y); ctx.stroke();
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// Axes & labels
// ─────────────────────────────────────────────────────────────────────────────

/** Draw Y-axis tick labels and horizontal grid lines. Skips the zero line. */
function drawYAxis(ctx, ticks, axMin, span, ox, oy, barsW) {
  for (const tv of ticks) {
    if (Math.abs(tv) < 0.001) continue;
    const pct = Math.max(0, Math.min(1, (tv-axMin)/span));
    const yy  = oy + RAIL_H - pct*RAIL_H;
    drawGrid(ctx, ox, yy, barsW, 0.2);
    ctx.save();
    ctx.font=`600 ${FS_YAXIS}px "${FONT}",sans-serif`;
    ctx.fillStyle=TC; ctx.textAlign='right'; ctx.textBaseline='middle';
    ctx.fillText(Math.round(tv), ox-4, yy);
    ctx.restore();
  }
}

/** Draw centred X-axis category labels below the chart zone. */
function drawXLabels(ctx, labels, CELL_W, ox, oy) {
  const y = oy + RAIL_H + 14;
  labels.forEach((lbl,i) => {
    ctx.save();
    ctx.font=`800 ${FS_XLABEL}px "${FONT}",sans-serif`;
    ctx.fillStyle=TC; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(String(lbl), ox + i*CELL_W + CELL_W/2, y);
    ctx.restore();
  });
}

/** Draw the X-axis title centred below the category labels. */
function drawXTitle(ctx, title, cx, oy) {
  if (!title) return;
  ctx.save();
  ctx.font=`700 ${FS_XTITLE}px "${FONT}",sans-serif`;
  ctx.fillStyle=TC; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(title, cx, oy + RAIL_H + 14 + 28);
  ctx.restore();
}

/** Draw the Y-axis title rotated 90° counter-clockwise. */
function drawYTitle(ctx, title, cx, cy) {
  if (!title) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI/2);
  ctx.font=`700 ${FS_YTITLE}px "${FONT}",sans-serif`;
  ctx.fillStyle=TC; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(title, 0, 0);
  ctx.restore();
}

/**
 * Draw a horizontally centred legend row below the chart zone.
 * Each item consists of a small raised colour swatch followed by the series name.
 */
function drawLegend(ctx, series, colors, zX, zoneW, y) {
  if (series.length<=1) return;
  const DOT=10, DGAP=5, IGAP=16;
  ctx.save();
  ctx.font=`500 ${FS_LEGEND}px "${FONT}",sans-serif`;
  const items = series.map((s,i)=>({s, w:ctx.measureText(s).width+DOT+DGAP, c:colors[i]}));
  const totalW = items.reduce((a,b)=>a+b.w,0)+(items.length-1)*IGAP;
  let x = zX + (zoneW-totalW)/2;
  items.forEach(it => {
    ctx.save();
    ctx.shadowColor=SD2; ctx.shadowOffsetX=1; ctx.shadowOffsetY=1; ctx.shadowBlur=2;
    roundRect(ctx,x,y-DOT/2,DOT,DOT,3);
    ctx.fillStyle=it.c; ctx.fill();
    ctx.restore();
    ctx.fillStyle=TC; ctx.textBaseline='middle';
    ctx.fillText(it.s, x+DOT+DGAP, y);
    x += it.w+IGAP;
  });
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the full canvas layout given the chart parameters.
 * All dimensions are in logical pixels.
 *
 * @param {number}  nBars         - number of X categories
 * @param {boolean} hasYTitle     - whether a Y-axis title is present
 * @param {boolean} hasXTitle     - whether an X-axis title is present
 * @param {boolean} hasLegend     - whether to reserve space for a legend
 * @param {number}  nSeries       - number of data series (legend shown only if > 1)
 * @param {number|null} barWOverride - explicit bar width, or null for auto
 * @returns {object} layout descriptor consumed by buildCanvas
 */
function calcLayout(nBars, hasYTitle, hasXTitle, hasLegend, nSeries=1, barWOverride=null) {
  const BAR_W  = barWOverride ?? Math.max(28, Math.min(60, Math.floor(700/nBars)));
  const CELL_W = BAR_W + GRP_GAP;
  const yTtlW  = hasYTitle ? Y_TTL_W : 0;
  const spacerW= yTtlW + Y_AX_W;
  const barsW  = CELL_W * nBars;
  const zoneW  = spacerW + barsW + ZPPAD*2;
  const xRowH  = 22; // height reserved for X category labels
  const xTtlH  = hasXTitle ? 30 : 0;
  const legendH= (hasLegend && nSeries>1) ? 44 : 0;
  const titleH = 24;
  const zoneH  = RAIL_H + ZPPAD*2 + xRowH + xTtlH;
  const totalW = PAD*2 + zoneW + SPAD*2;
  const totalH = PAD + GAP + titleH + GAP + zoneH + legendH + PAD + SPAD*1.5;
  return {BAR_W, CELL_W, spacerW, yTtlW, barsW, zoneW, zoneH,
          titleH, totalW, totalH, xRowH, xTtlH, legendH, spad: SPAD};
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create and return a fully rendered HTMLCanvasElement.
 * Draws the outer card, title, inner chart zone, axes, and legend.
 * The actual chart content is delegated to the `drawContent` callback.
 *
 * @param {object}   L           - layout descriptor from calcLayout
 * @param {object}   cfg         - chart configuration (title, xTitle, yTitle, colors)
 * @param {Function} drawContent - (ctx, ox, oy, L) → void; draws bars/lines into the zone
 */
function buildCanvas(L, cfg, drawContent) {
  const C = document.createElement('canvas');
  C.width  = L.totalW * SCALE;
  C.height = L.totalH * SCALE;
  C.style.width  = L.totalW+'px';
  C.style.height = L.totalH+'px';
  const ctx = C.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // Canvas background is intentionally transparent; the page background
  // shows through in the browser, and exported PNGs have a transparent bg.

  const sp = L.spad ?? 0;
  ctx.save();
  ctx.translate(sp, sp);
  const iW = L.totalW - 2*sp;
  const iH = L.totalH - 2*sp;

  neumoRaised(ctx, 5, 5, iW-10, iH-10, 22, 14, 14, 28);

  ctx.save();
  ctx.font=`700 ${FS_TITLE}px "${FONT}",sans-serif`;
  ctx.fillStyle=TC; ctx.textBaseline='middle';
  ctx.fillText(cfg.title||'', PAD, PAD + L.titleH/2);
  ctx.restore();

  const zX=PAD, zY=PAD+GAP+L.titleH+GAP;
  neumoRaised(ctx, zX, zY, L.zoneW, L.zoneH, 18, 8, 8, 18);

  // ox/oy: origin of the drawable bar area inside the zone
  const ox = zX + ZPPAD + (L.yTtlW||0) + Y_AX_W;
  const oy = zY + ZPPAD;

  if (cfg.yTitle && L.yTtlW) drawYTitle(ctx, cfg.yTitle, zX+ZPPAD+L.yTtlW/2, oy+RAIL_H/2);

  drawContent(ctx, ox, oy, L);
  drawXLabels(ctx, L._xLabels, L.CELL_W, ox, oy);
  if (cfg.xTitle) drawXTitle(ctx, cfg.xTitle, ox+L.barsW/2, oy);
  if (L._series)  drawLegend(ctx, L._series, L._colors, zX, L.zoneW, zY + L.zoneH + 30);

  ctx.restore();
  return C;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart renderers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render a single-series bar chart (Barres).
 * CSV format: col0 = X label, col1 = value.
 */
export function renderBarresCanvas({ headers, rows }, cfg) {
  const [nomAxe, nomSerie] = headers;
  const palette = cfg.colors || COLORS;
  const color   = palette[0];
  const data    = rows.map(r => ({ x: r[nomAxe], v: parseFloat(r[nomSerie])||0 }));
  const maxV    = Math.max(...data.map(d=>d.v), 0);
  const ticks   = niceIntTicks(0, maxV, Y_TICKS);
  const axMin   = ticks[0], axMax=ticks[ticks.length-1], span=axMax-axMin||1;

  const L = calcLayout(data.length, !!cfg.yTitle, !!cfg.xTitle, false);
  L._xLabels = data.map(d=>fmtX(d.x));

  return buildCanvas(L, cfg, (ctx, ox, oy) => {
    drawYAxis(ctx, ticks, axMin, span, ox, oy, L.barsW);
    data.forEach((d,i) => {
      const cx = ox + i*L.CELL_W + L.CELL_W/2;
      neumoInset(ctx, cx - L.BAR_W/2, oy, L.BAR_W, RAIL_H, 10);
      const bH = Math.max(0, (d.v/span)*(RAIL_H-6));
      if (bH>0) drawBar(ctx, cx-L.BAR_W*0.65/2, oy+RAIL_H-bH-3, L.BAR_W*0.65, bH, color, [6,6,6,6]);
    });
  });
}

/**
 * Render a multi-series stacked bar chart.
 * CSV format: col0 = X label, col1..n = series values.
 */
export function renderStackedCanvas({ headers, rows }, cfg) {
  const nomAxe=headers[0], series=headers.slice(1);
  const palette=cfg.colors||COLORS;
  const colors=series.map((_,i)=>palette[i%palette.length]);
  const BAR_W=Math.max(28,Math.min(56,Math.floor(700/rows.length)));
  const data=rows.map(r=>({ x:r[nomAxe], values:series.map(s=>parseFloat(r[s])||0) }));
  const maxTot=Math.max(...data.map(d=>d.values.reduce((a,b)=>a+b,0)),0);
  const ticks=niceIntTicks(0,maxTot,Y_TICKS);
  const axMin=ticks[0],axMax=ticks[ticks.length-1],span=axMax-axMin||1;

  const L=calcLayout(data.length,!!cfg.yTitle,!!cfg.xTitle,true,series.length,BAR_W);
  L._xLabels=data.map(d=>fmtX(d.x)); L._series=series; L._colors=colors;

  return buildCanvas(L, cfg, (ctx, ox, oy) => {
    drawYAxis(ctx, ticks, axMin, span, ox, oy, L.barsW);
    data.forEach((d,i) => {
      const cx=ox+i*L.CELL_W+L.CELL_W/2;
      neumoInset(ctx, cx-L.BAR_W/2, oy, L.BAR_W, RAIL_H, 10);
      let botH=3;
      d.values.forEach((v,si) => {
        const bH=Math.max(0,(v/span)*(RAIL_H-6));
        const bW=L.BAR_W*0.65, bX=cx-bW/2, bY=oy+RAIL_H-botH-bH;
        const isTop=si===series.length-1, isBot=si===0;
        const r=(isBot&&isTop)?[8,8,8,8]:isTop?[8,8,0,0]:isBot?[0,0,8,8]:[0,0,0,0];
        if(bH>0) drawBar(ctx, bX, bY, bW, bH, colors[si], r);
        botH+=bH;
      });
    });
  });
}

/**
 * Render a multi-series grouped bar chart. Supports negative values;
 * bars grow downward from the zero baseline when negative.
 * CSV format: col0 = X label, col1..n = series values.
 */
export function renderGroupedCanvas({ headers, rows }, cfg) {
  const nomAxe=headers[0], series=headers.slice(1);
  const palette=cfg.colors||COLORS;
  const colors=series.map((_,i)=>palette[i%palette.length]);
  const BW=15, BGAP=3;
  const grpW=series.length*BW+(series.length-1)*BGAP;
  const CELL_W=grpW+GRP_GAP;

  const data=rows.map(r=>({ x:r[nomAxe], values:series.map(s=>parseFloat(r[s])||0) }));
  const allV=data.flatMap(d=>d.values);
  const valMin=Math.min(...allV,0), valMax=Math.max(...allV,0);
  const ticks=niceIntTicks(valMin,valMax,Y_TICKS);
  const axMin=ticks[0], axMax=ticks[ticks.length-1], span=axMax-axMin||1;
  const zeroPct=-axMin/span; // fractional position of y=0 within RAIL_H

  const hasYT=!!cfg.yTitle;
  const spacerW=(hasYT?Y_TTL_W:0)+Y_AX_W;
  const barsW=CELL_W*data.length;
  const zoneW=spacerW+barsW+ZPPAD*2;
  const xRowH=22, xTtlH=cfg.xTitle?30:0, legendH=series.length>1?44:0;
  const zoneH=RAIL_H+ZPPAD*2+xRowH+xTtlH;
  const totalW=PAD*2+zoneW+SPAD*2;
  const totalH=PAD+GAP+24+GAP+zoneH+legendH+PAD+SPAD*1.5;
  const L={BAR_W:BW, CELL_W, spacerW, yTtlW:hasYT?Y_TTL_W:0, barsW, zoneW, zoneH,
           titleH:24, totalW, totalH, xRowH, xTtlH, legendH, spad: SPAD,
           _xLabels:data.map(d=>fmtX(d.x)), _series:series, _colors:colors};

  return buildCanvas(L, cfg, (ctx, ox, oy) => {
    drawYAxis(ctx, ticks, axMin, span, ox, oy, barsW);
    data.forEach((d,gi) => {
      const gx=ox+gi*CELL_W+(CELL_W-grpW)/2;
      neumoInset(ctx, gx, oy, grpW, RAIL_H, 10);
      d.values.forEach((v,si) => {
        const bH=Math.abs(v)/span*(RAIL_H-6);
        const bX=gx+si*(BW+BGAP);
        const bY=v>=0 ? oy+RAIL_H-zeroPct*(RAIL_H-6)-bH-3
                      : oy+RAIL_H-zeroPct*(RAIL_H-6)-3;
        if(bH>0) drawBar(ctx, bX, bY, BW, bH, colors[si], [7,7,7,7]);
      });
    });
  });
}

/** Encode the given canvas element as a PNG data URL. */
export function canvasToDataURL(canvas) {
  return canvas.toDataURL('image/png');
}

// ─────────────────────────────────────────────────────────────────────────────
// Line / Area chart
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Draw a single series as a smooth bezier area + stroke.
 * The control points are placed at the horizontal midpoint between consecutive
 * data points, producing a natural monotone curve without overshoot.
 *
 * Rendering order matters for multi-series: call this for all series before
 * drawing any strokes or points so that area fills do not obscure later layers.
 */
function drawLineArea(ctx, pts, color, oy, alpha=0.22) {
  const n = pts.length;
  if (n < 2) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < n; i++) {
    const cpx = (pts[i-1].x + pts[i].x) / 2;
    ctx.bezierCurveTo(cpx, pts[i-1].y, cpx, pts[i].y, pts[i].x, pts[i].y);
  }
  ctx.lineTo(pts[n-1].x, oy + RAIL_H - 3);
  ctx.lineTo(pts[0].x,   oy + RAIL_H - 3);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, oy, 0, oy + RAIL_H);
  grad.addColorStop(0, hexAlpha(color, alpha));
  grad.addColorStop(1, hexAlpha(color, 0));
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

/** Draw the bezier stroke for a single series. */
function drawLineStroke(ctx, pts, color) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const cpx = (pts[i-1].x + pts[i].x) / 2;
    ctx.bezierCurveTo(cpx, pts[i-1].y, cpx, pts[i].y, pts[i].x, pts[i].y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2.5;
  ctx.lineJoin    = 'round';
  ctx.stroke();
  ctx.restore();
}

/** Draw raised data-point circles with a specular highlight. */
function drawLinePoints(ctx, pts, color) {
  const R = 4.5;
  pts.forEach(({x, y}) => {
    ctx.save();
    ctx.shadowColor=SD2; ctx.shadowBlur=5; ctx.shadowOffsetX=2; ctx.shadowOffsetY=2;
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI*2);
    ctx.fillStyle=color; ctx.fill();
    ctx.restore();
    // Specular highlight at top-left of each point
    ctx.save();
    ctx.beginPath(); ctx.arc(x-1.2, y-1.2, R*0.45, 0, Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.fill();
    ctx.restore();
  });
}

/** Convert a hex colour string to rgba() with the given alpha (0–1). */
function hexAlpha(hex, a) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Render a multi-series line / area chart.
 * All series share the same Y scale (global max across all series).
 * CSV format: col0 = X label, col1..n = series values.
 */
export function renderLineCanvas({ headers, rows }, cfg) {
  const nomAxe  = headers[0];
  const series  = headers.slice(1);
  const palette = cfg.colors || COLORS;
  const colors  = series.map((_,i) => palette[i % palette.length]);

  const seriesData = series.map(s =>
    rows.map(r => ({ x: r[nomAxe], v: parseFloat(r[s]) || 0 }))
  );

  const allVals = seriesData.flat().map(d => d.v);
  const maxV    = Math.max(...allVals, 0);
  const ticks   = niceIntTicks(0, maxV, Y_TICKS);
  const axMin   = ticks[0], axMax = ticks[ticks.length-1], span = axMax - axMin || 1;

  const n           = rows.length;
  const CELL_W_LINE = Math.max(36, Math.min(80, Math.floor(700 / n)));
  const L           = calcLayout(n, !!cfg.yTitle, !!cfg.xTitle, series.length > 1, series.length, CELL_W_LINE);
  L._xLabels = rows.map(r => fmtX(r[nomAxe]));
  if (series.length > 1) { L._series = series; L._colors = colors; }

  return buildCanvas(L, cfg, (ctx, ox, oy) => {
    drawYAxis(ctx, ticks, axMin, span, ox, oy, L.barsW);

    // Subtle vertical guide lines at each X position
    ctx.save();
    ctx.strokeStyle='rgba(0,0,0,0.04)'; ctx.lineWidth=1;
    for (let i = 0; i < n; i++) {
      const cx = ox + i*L.CELL_W + L.CELL_W/2;
      ctx.beginPath(); ctx.moveTo(cx, oy); ctx.lineTo(cx, oy+RAIL_H); ctx.stroke();
    }
    ctx.restore();

    const allPts = seriesData.map(sd =>
      sd.map((d,i) => ({
        x: ox + i*L.CELL_W + L.CELL_W/2,
        y: oy + RAIL_H - Math.max(0, (d.v-axMin)/span) * (RAIL_H-6) - 3,
      }))
    );

    // Draw in three passes so areas never obscure strokes or points
    allPts.forEach((pts, si) => drawLineArea(ctx, pts, colors[si], oy));
    allPts.forEach((pts, si) => drawLineStroke(ctx, pts, colors[si]));
    allPts.forEach((pts, si) => drawLinePoints(ctx, pts, colors[si]));
  });
}
