// neumoCanvas.js — rendu Canvas 2D fidèle au style HTML/CSS original
import { COLORS, PALETTES, DEFAULT_PALETTE, RAIL_H, Y_TICKS, Y_AX_W, Y_TTL_W, GRP_GAP, SD, SL, TC } from './constants.js';
import { niceIntTicks, fmtX } from './utils.js';

const BG    = '#F0F0F3'; // doit correspondre à constants.js BG
const SD2   = '#d1d5d9';
const SCALE = 2;
const FONT  = 'DM Sans';
const PAD   = 48;
const GAP   = 14;
const ZPPAD = 18;
const SPAD  = 48; // marge canvas pour ombre portée de la carte


// ── Tailles de police (en px logiques, modifier ici pour tout changer) ──────
const FS_TITLE   = 25;   // titre principal du graphique
const FS_XLABEL  = 12;   // étiquettes axe X
const FS_XTITLE  = 16;   // titre axe X
const FS_YTITLE  = 16;   // titre axe Y
const FS_YAXIS   = 11;   // valeurs axe Y
const FS_LEGEND  = 13; // légende (multi-séries)

// ─────────────────────────────────────────────────────────────────────────────
// Utilitaires Canvas
// ─────────────────────────────────────────────────────────────────────────────

function hex2rgba(hex, a = 1) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

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

/** Neumorphique raised */
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
 * FIX 1 — Neumorphique inset via DÉGRADÉS LINÉAIRES.
 *
 * L'approche shadow+clip est incompatible avec ctx.scale() car les
 * shadowOffset ne sont pas transformés par la CTM. On remplace donc
 * par 4 dégradés (top/left sombre, bottom/right clair) clipés dans la forme.
 */
function neumoInset(ctx, x, y, w, h, r) {
  // Fond de base
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = BG; ctx.fill();

  const D = 14; // correspond à inset 4px offset + 8px blur du CSS Python

  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();

  // Ombre sombre — bord haut
  let g = ctx.createLinearGradient(x, y, x, y + D);
  g.addColorStop(0, 'rgba(209,213,217,0.9)'); // correspond à SD #d1d5d9
  g.addColorStop(1, 'rgba(209,213,217,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, D);

  // Ombre sombre — bord gauche
  g = ctx.createLinearGradient(x, y, x + D, y);
  g.addColorStop(0, 'rgba(209,213,217,0.9)'); // correspond à SD #d1d5d9
  g.addColorStop(1, 'rgba(209,213,217,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, D, h);

  // Lumière — bord bas
  g = ctx.createLinearGradient(x, y + h - D, x, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(255,255,255,0.80)'); // SL #ffffff, légèrement atténué
  ctx.fillStyle = g;
  ctx.fillRect(x, y + h - D, w, D);

  // Lumière — bord droit
  g = ctx.createLinearGradient(x + w - D, y, x + w, y);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(255,255,255,0.80)'); // SL #ffffff, légèrement atténué
  ctx.fillStyle = g;
  ctx.fillRect(x + w - D, y, D, h);

  ctx.restore();
}

/** Barre colorée avec micro ombre portée */
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

function drawYAxis(ctx, ticks, axMin, span, ox, oy, barsW) {
  for (const tv of ticks) {
    if (Math.abs(tv) < 0.001) continue; // ne pas afficher le 0 sur l'axe
    const pct = Math.max(0, Math.min(1, (tv-axMin)/span));
    const yy  = oy + RAIL_H - pct*RAIL_H;
    drawGrid(ctx, ox, yy, barsW, Math.abs(tv)<0.001 ? 0.65 : 0.2);
    ctx.save();
    ctx.font=`600 ${FS_YAXIS}px "${FONT}",sans-serif`;
    ctx.fillStyle=TC; ctx.textAlign='right'; ctx.textBaseline='middle';
    ctx.fillText(Math.round(tv), ox-4, yy);
    ctx.restore();
  }
}

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

function drawXTitle(ctx, title, cx, oy) {
  if (!title) return;
  ctx.save();
  ctx.font=`700 ${FS_XTITLE}px "${FONT}",sans-serif`;
  ctx.fillStyle=TC; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(title, cx, oy + RAIL_H + 14 + 28);
  ctx.restore();
}

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
// Layout calc
// ─────────────────────────────────────────────────────────────────────────────

function calcLayout(nBars, hasYTitle, hasXTitle, hasLegend, nSeries=1, barWOverride=null) {
  const BAR_W  = barWOverride ?? Math.max(28, Math.min(60, Math.floor(700/nBars)));
  const CELL_W = BAR_W + GRP_GAP;
  const yTtlW  = hasYTitle ? Y_TTL_W : 0;
  const spacerW= yTtlW + Y_AX_W;
  const barsW  = CELL_W * nBars;
  const zoneW  = spacerW + barsW + ZPPAD*2;
  const xRowH  = 22;
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
// Constructeur canvas principal
// ─────────────────────────────────────────────────────────────────────────────

function buildCanvas(L, cfg, drawContent) {
  const C = document.createElement('canvas');
  C.width  = L.totalW * SCALE;
  C.height = L.totalH * SCALE;
  C.style.width  = L.totalW+'px';
  C.style.height = L.totalH+'px';
  const ctx = C.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // Fond transparent : on ne remplit pas — le canvas reste transparent en dehors de la carte
  // (dans le navigateur le fond de page est blanc, à l'export le PNG aura un fond transparent)

  // Translate par SPAD : donne de la place à l'ombre portée de la carte
  const sp = L.spad ?? 0;
  ctx.save();
  ctx.translate(sp, sp);
  const iW = L.totalW - 2*sp;
  const iH = L.totalH - 2*sp;

  // Carte principale raised
  neumoRaised(ctx, 5, 5, iW-10, iH-10, 22, 14, 14, 28);

  // Titre
  ctx.save();
  ctx.font=`700 ${FS_TITLE}px "${FONT}",sans-serif`;
  ctx.fillStyle=TC; ctx.textBaseline='middle';
  ctx.fillText(cfg.title||'', PAD, PAD + L.titleH/2);
  ctx.restore();

  // Zone chart raised interne
  const zX=PAD, zY=PAD+GAP+L.titleH+GAP;
  neumoRaised(ctx, zX, zY, L.zoneW, L.zoneH, 18, 8, 8, 18);

  // Origine des barres
  const ox = zX + ZPPAD + (L.yTtlW||0) + Y_AX_W;
  const oy = zY + ZPPAD;

  // Titre axe Y
  if (cfg.yTitle && L.yTtlW) {
    drawYTitle(ctx, cfg.yTitle, zX+ZPPAD+L.yTtlW/2, oy+RAIL_H/2);
  }

  // Contenu (axes, rails, barres)
  drawContent(ctx, ox, oy, L);

  // Labels X — toujours dessinés à oy+RAIL_H+14, maintenant dans le carré
  drawXLabels(ctx, L._xLabels, L.CELL_W, ox, oy);

  // Titre axe X — toujours à oy+RAIL_H+32, maintenant dans le carré
  if (cfg.xTitle) drawXTitle(ctx, cfg.xTitle, ox+L.barsW/2, oy);

  // Légende à l'intérieur de la zone (évite l'ombre portée)
  if (L._series) {
    const legendY = zY + L.zoneH + 30;
    drawLegend(ctx, L._series, L._colors, zX, L.zoneW, legendY);
  }

  ctx.restore();
  return C;
}

// ─────────────────────────────────────────────────────────────────────────────
// Histogramme
// ─────────────────────────────────────────────────────────────────────────────

export function renderHistogramCanvas({ headers, rows }, cfg) {
  const [nomAxe, nomSerie] = headers;
  const palette = cfg.colors || COLORS;
  const color = palette[0];
  const data  = rows.map(r => ({ x: r[nomAxe], v: parseFloat(r[nomSerie])||0 }));
  const maxV  = Math.max(...data.map(d=>d.v), 0);
  const ticks = niceIntTicks(0, maxV, Y_TICKS);
  const axMin = ticks[0], axMax=ticks[ticks.length-1], span=axMax-axMin||1;

  const L = calcLayout(data.length, !!cfg.yTitle, !!cfg.xTitle, false);
  L._xLabels = data.map(d=>fmtX(d.x));

  return buildCanvas(L, cfg, (ctx, ox, oy) => {
    drawYAxis(ctx, ticks, axMin, span, ox, oy, L.barsW);
    data.forEach((d,i) => {
      const cx = ox + i*L.CELL_W + L.CELL_W/2;
      const rX = cx - L.BAR_W/2;
      neumoInset(ctx, rX, oy, L.BAR_W, RAIL_H, 10);
      const bH = Math.max(0, (d.v/span)*(RAIL_H-6));
      const bW = L.BAR_W*0.65;
      if (bH>0) drawBar(ctx, cx-bW/2, oy+RAIL_H-bH-3, bW, bH, color, [6,6,6,6]);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Barres empilées
// ─────────────────────────────────────────────────────────────────────────────

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
      const cx=ox+i*L.CELL_W+L.CELL_W/2, rX=cx-L.BAR_W/2;
      neumoInset(ctx, rX, oy, L.BAR_W, RAIL_H, 10);
      let botH=3;
      d.values.forEach((v,si) => {
        const bH=Math.max(0,(v/span)*(RAIL_H-6));
        const bW=L.BAR_W*0.65, bX=cx-bW/2, bY=oy+RAIL_H-botH-bH;
        const isTop=si===series.length-1;
        const isBot=si===0;
        const r = (isBot&&isTop) ? [8,8,8,8] : isTop ? [8,8,0,0] : isBot ? [0,0,8,8] : [0,0,0,0];
        if(bH>0) drawBar(ctx, bX, bY, bW, bH, colors[si], r);
        botH+=bH;
      });
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Barres groupées
// ─────────────────────────────────────────────────────────────────────────────

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
  const zeroPct=-axMin/span;

  const hasYT=!!cfg.yTitle;
  const spacerW=(hasYT?Y_TTL_W:0)+Y_AX_W;
  const barsW=CELL_W*data.length;
  const zoneW=spacerW+barsW+ZPPAD*2;
  const xRowH=22, xTtlH=cfg.xTitle?30:0, legendH=series.length>1?40:0;
  // zoneH englobe xRowH, xTtlH ET legendH → tout dans le carré intérieur
  const zoneH=RAIL_H+ZPPAD*2+xRowH+xTtlH+legendH;
  const totalW=PAD*2+zoneW+SPAD*2;
  const totalH=PAD+GAP+24+GAP+zoneH+PAD+SPAD*2;
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
        const r=v>=0?[7,7,7,7]:[7,7,7,7];
        if(bH>0) drawBar(ctx, bX, bY, BW, bH, colors[si], r);
      });
    });
  });
}

export function canvasToDataURL(canvas) {
  return canvas.toDataURL('image/png');
}

// ─────────────────────────────────────────────────────────────────────────────
// Courbes (Line Chart)
// ─────────────────────────────────────────────────────────────────────────────

/** Trace une courbe bezier lissée + aire dégradée pour une série */
function drawLineSeries(ctx, pts, color, oy, alpha=0.22) {
  const n = pts.length;
  if (n < 2) return;

  // ── Aire remplie sous la courbe ──────────────────────────────────────────
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

  // ── Trait de la courbe ───────────────────────────────────────────────────
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < n; i++) {
    const cpx = (pts[i-1].x + pts[i].x) / 2;
    ctx.bezierCurveTo(cpx, pts[i-1].y, cpx, pts[i].y, pts[i].x, pts[i].y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2.5;
  ctx.lineJoin    = 'round';
  ctx.stroke();
  ctx.restore();
}

/** Points de données avec effet raised neumorphique */
function drawLinePoints(ctx, pts, color) {
  const R = 4.5;
  pts.forEach(({x, y}) => {
    // Ombre portée
    ctx.save();
    ctx.shadowColor   = SD2;
    ctx.shadowBlur    = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI*2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();

    // Reflet lumineux (haut-gauche)
    ctx.save();
    ctx.beginPath();
    ctx.arc(x - 1.2, y - 1.2, R * 0.45, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
    ctx.restore();
  });
}

/** Convertit un hex couleur (#RRGGBB) en rgba avec alpha */
function hexAlpha(hex, a) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

export function renderLineCanvas({ headers, rows }, cfg) {
  const nomAxe  = headers[0];
  const series  = headers.slice(1);
  const palette = cfg.colors || COLORS;
  const colors  = series.map((_,i) => palette[i % palette.length]);
  const hasMany = series.length > 1;

  // Données par série
  const seriesData = series.map(s =>
    rows.map(r => ({ x: r[nomAxe], v: parseFloat(r[s]) || 0 }))
  );

  // Calcul de l'échelle globale (max de toutes les séries)
  const allVals = seriesData.flat().map(d => d.v);
  const maxV    = Math.max(...allVals, 0);
  const ticks   = niceIntTicks(0, maxV, Y_TICKS);
  const axMin   = ticks[0], axMax = ticks[ticks.length-1], span = axMax - axMin || 1;

  const n = rows.length;
  // CELL_W fixe pour line chart : espacement confortable entre points
  const CELL_W_LINE = Math.max(36, Math.min(80, Math.floor(700 / n)));
  const BAR_W_LINE  = CELL_W_LINE;

  const L = calcLayout(n, !!cfg.yTitle, !!cfg.xTitle, hasMany, series.length, BAR_W_LINE);
  L._xLabels = rows.map(r => fmtX(r[nomAxe]));
  if (hasMany) { L._series = series; L._colors = colors; }

  return buildCanvas(L, cfg, (ctx, ox, oy) => {
    // Grille Y
    drawYAxis(ctx, ticks, axMin, span, ox, oy, L.barsW);

    // Grille verticale légère aux points X
    ctx.save();
    ctx.strokeStyle = `rgba(0,0,0,0.04)`;
    ctx.lineWidth   = 1;
    for (let i = 0; i < n; i++) {
      const cx = ox + i*L.CELL_W + L.CELL_W/2;
      ctx.beginPath();
      ctx.moveTo(cx, oy);
      ctx.lineTo(cx, oy + RAIL_H);
      ctx.stroke();
    }
    ctx.restore();

    // Calcul des points pour chaque série
    const allPts = seriesData.map(sd =>
      sd.map((d, i) => ({
        x: ox + i*L.CELL_W + L.CELL_W/2,
        y: oy + RAIL_H - Math.max(0, (d.v - axMin)/span) * (RAIL_H - 6) - 3,
      }))
    );

    // Dessine d'abord toutes les aires (pour éviter qu'elles masquent les courbes)
    allPts.forEach((pts, si) => drawLineSeries(ctx, pts, colors[si], oy));

    // Puis toutes les courbes
    allPts.forEach((pts, si) => {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const cpx = (pts[i-1].x + pts[i].x) / 2;
        ctx.bezierCurveTo(cpx, pts[i-1].y, cpx, pts[i].y, pts[i].x, pts[i].y);
      }
      ctx.strokeStyle = colors[si];
      ctx.lineWidth   = 2.5;
      ctx.lineJoin    = 'round';
      ctx.stroke();
      ctx.restore();
    });

    // Puis tous les points (au-dessus de tout)
    allPts.forEach((pts, si) => drawLinePoints(ctx, pts, colors[si]));
  });
}
