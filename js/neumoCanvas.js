/**
 * neumoCanvas.js
 * Neumorphic bar and line chart renderers.
 */
import { COLORS, Y_TICKS, Y_AX_W, Y_TTL_W, GRP_GAP } from './constants.js';
import {
  RT, BG, SD, SL, TC, RAIL_H,
  FONT, PAD, GAP, ZPPAD, SPAD,
  hex2rgba, neumoInset, drawBar, drawGrid, drawYAxis,
  calcLayout, buildCanvas, canvasToDataURL, drawValueLabel,
} from './canvasCore.js';
import { niceIntTicks, fmtX } from './utils.js';

export { canvasToDataURL };

// ── Couleurs shadow dark mode (non mises à jour par setRenderTheme) ──────────
const _D_SD = '#11141b';
const _D_SL = '#303342';

function traceBezier(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1].x + pts[i].x) / 2;
    ctx.bezierCurveTo(cx, pts[i - 1].y, cx, pts[i].y, pts[i].x, pts[i].y);
  }
}

/** Canal gravé au laser : couche de bord sombre, bord lumineux, plancher BG, teinte profondeur, résine accent. */
function drawCarvedChannel(ctx, pts, color) {
  if (pts.length < 2) return;
  const W         = 10;
  const darkEdge  = RT.dark ? hex2rgba(_D_SD, 0.70) : hex2rgba(SD, 0.80);
  const lightEdge = RT.dark ? hex2rgba(_D_SL, 0.60) : hex2rgba(SL, 0.90);

  // ① Bord sombre (décalé vers le bas-droite → ombre intérieure haut-gauche)
  ctx.save();
  ctx.translate(1.5, 1.5);
  traceBezier(ctx, pts);
  ctx.lineWidth = W + 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = darkEdge; ctx.stroke();
  ctx.restore();

  // ② Bord lumineux (décalé haut-gauche)
  ctx.save();
  ctx.translate(-1.5, -1.5);
  traceBezier(ctx, pts);
  ctx.lineWidth = W + 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = lightEdge; ctx.stroke();
  ctx.restore();

  // ③ Plancher du canal (couleur BG, légèrement moins large — révèle les bords)
  ctx.save();
  traceBezier(ctx, pts);
  ctx.lineWidth = W; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = RT.BG; ctx.stroke();
  ctx.restore();

  // ④ Teinte profondeur au centre du canal
  ctx.save();
  traceBezier(ctx, pts);
  ctx.lineWidth = W - 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = RT.dark ? 'rgba(0,0,0,0.20)' : 'rgba(170,175,182,0.28)';
  ctx.stroke();
  ctx.restore();

  // ⑤ Résine UV (accent)
  ctx.save();
  traceBezier(ctx, pts);
  ctx.lineWidth = W - 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = hex2rgba(color, 0.90);
  ctx.shadowColor = hex2rgba(color, 0.35); ctx.shadowBlur = 4;
  ctx.stroke();
  ctx.restore();
}

/** Micro-réservoir : cavité usinée avec fond inset + résine liquide. */
function drawWell(ctx, x, y, color) {
  const R = 8, D = 6;
  const darkGrad  = RT.dark ? 'rgba(0,0,0,0.65)'    : hex2rgba(SD, 0.80);
  const lightGrad = RT.dark ? 'rgba(60,70,105,0.55)' : 'rgba(255,255,255,0.85)';

  // ① Fond BG
  ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fillStyle = RT.BG; ctx.fill();

  // ② Dégradés inset (clippés au cercle)
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.clip();
  let g;
  g = ctx.createLinearGradient(x, y - R, x, y - R + D * 2);
  g.addColorStop(0, darkGrad); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, D * 2);
  g = ctx.createLinearGradient(x - R, y, x - R + D * 2, y);
  g.addColorStop(0, darkGrad); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(x - R, y - R, D * 2, R * 2);
  g = ctx.createLinearGradient(x, y + R - D * 2, x, y + R);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, lightGrad);
  ctx.fillStyle = g; ctx.fillRect(x - R, y + R - D * 2, R * 2, D * 2);
  g = ctx.createLinearGradient(x + R - D * 2, y, x + R, y);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, lightGrad);
  ctx.fillStyle = g; ctx.fillRect(x + R - D * 2, y - R, D * 2, R * 2);
  ctx.restore();

  // ③ Mare de résine
  const rR = Math.round(R * 0.48);
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, rR, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.shadowColor = hex2rgba(color, 0.50); ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1;
  ctx.fill();
  ctx.restore();

  // ④ Reflet spéculaire sur la résine
  ctx.save();
  ctx.beginPath(); ctx.arc(x - rR * 0.32, y - rR * 0.32, rR * 0.32, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.52)'; ctx.fill();
  ctx.restore();
}

export function renderBarresCanvas({ headers, rows }, cfg) {
  const [nomAxe, nomSerie] = headers;
  const color = (cfg.colors || COLORS)[0];
  const data = rows.map(r => ({ x: r[nomAxe], v: parseFloat(r[nomSerie]) || 0 }));
  const maxV = Math.max(...data.map(d => d.v), 0);
  const ticks = niceIntTicks(0, maxV, Y_TICKS);
  const axMin = ticks[0], axMax = ticks[ticks.length - 1], span = axMax - axMin || 1;

  const L = calcLayout(data.length, !!cfg.yTitle, !!cfg.xTitle, false);
  L._xLabels = data.map(d => fmtX(d.x));

  return buildCanvas(L, cfg, (ctx, ox, oy) => {
    drawYAxis(ctx, ticks, axMin, span, ox, oy, L.barsW);
    data.forEach((d, i) => {
      const cx = ox + i * L.CELL_W + L.CELL_W / 2;
      neumoInset(ctx, cx - L.BAR_W / 2, oy, L.BAR_W, RAIL_H, 10);
      const bH = Math.max(0, (d.v / span) * (RAIL_H - 6));
      if (bH > 0) {
        drawBar(ctx, cx - L.BAR_W * 0.65 / 2, oy + RAIL_H - bH - 3, L.BAR_W * 0.65, bH, color, [6, 6, 6, 6]);
        if (cfg.showValueLabels) drawValueLabel(ctx, Math.round(d.v), cx, oy + RAIL_H - bH - 3);
      }
    });
  });
}

export function renderStackedCanvas({ headers, rows }, cfg) {
  const nomAxe = headers[0], series = headers.slice(1);
  const palette = cfg.colors || COLORS;
  const colors = series.map((_, i) => palette[i % palette.length]);
  const BAR_W = Math.max(28, Math.min(56, Math.floor(700 / rows.length)));
  const data = rows.map(r => ({ x: r[nomAxe], values: series.map(s => parseFloat(r[s]) || 0) }));
  const maxTot = Math.max(...data.map(d => d.values.reduce((a, b) => a + b, 0)), 0);
  const ticks = niceIntTicks(0, maxTot, Y_TICKS);
  const axMin = ticks[0], axMax = ticks[ticks.length - 1], span = axMax - axMin || 1;

  const L = calcLayout(data.length, !!cfg.yTitle, !!cfg.xTitle, true, series.length, BAR_W);
  L._xLabels = data.map(d => fmtX(d.x)); L._series = series; L._colors = colors;

  return buildCanvas(L, cfg, (ctx, ox, oy) => {
    drawYAxis(ctx, ticks, axMin, span, ox, oy, L.barsW);
    data.forEach((d, i) => {
      const cx = ox + i * L.CELL_W + L.CELL_W / 2;
      neumoInset(ctx, cx - L.BAR_W / 2, oy, L.BAR_W, RAIL_H, 10);
      let botH = 3;
      d.values.forEach((v, si) => {
        const bH = Math.max(0, (v / span) * (RAIL_H - 6));
        const bW = L.BAR_W * 0.65, bX = cx - bW / 2, bY = oy + RAIL_H - botH - bH;
        const isTop = si === series.length - 1, isBot = si === 0;
        const r = (isBot && isTop) ? [8,8,8,8] : isTop ? [8,8,0,0] : isBot ? [0,0,8,8] : [0,0,0,0];
        if (bH > 0) drawBar(ctx, bX, bY, bW, bH, colors[si], r);
        botH += bH;
      });
      if (cfg.showValueLabels && botH > 3) {
        const total = d.values.reduce((a, b) => a + b, 0);
        drawValueLabel(ctx, Math.round(total), cx, oy + RAIL_H - botH - 3);
      }
    });
  });
}

export function renderGroupedCanvas({ headers, rows }, cfg) {
  const nomAxe = headers[0], series = headers.slice(1);
  const palette = cfg.colors || COLORS;
  const colors = series.map((_, i) => palette[i % palette.length]);
  const BW = 15, BGAP = 3;
  const grpW = series.length * BW + (series.length - 1) * BGAP;
  const CELL_W = grpW + GRP_GAP;

  const data = rows.map(r => ({ x: r[nomAxe], values: series.map(s => parseFloat(r[s]) || 0) }));
  const allV = data.flatMap(d => d.values);
  const valMin = Math.min(...allV, 0), valMax = Math.max(...allV, 0);
  const ticks = niceIntTicks(valMin, valMax, Y_TICKS);
  const axMin = ticks[0], axMax = ticks[ticks.length - 1], span = axMax - axMin || 1;
  const zeroPct = -axMin / span;

  const hasYT = !!cfg.yTitle;
  const spacerW = (hasYT ? Y_TTL_W : 0) + Y_AX_W;
  const barsW = CELL_W * data.length;
  const zoneW = spacerW + barsW + ZPPAD * 2;
  const xRowH = 22, xTtlH = cfg.xTitle ? 30 : 0, titleH = 24;
  const zoneH = RAIL_H + ZPPAD * 2 + xRowH + xTtlH;
  const totalW = PAD * 2 + zoneW + SPAD * 2;
  const totalH = PAD + GAP + titleH + GAP + zoneH + 44 + PAD + SPAD * 1.5;

  const L = {
    BAR_W: BW, CELL_W, spacerW, yTtlW: hasYT ? Y_TTL_W : 0, barsW,
    zoneW, zoneH, titleH, totalW, totalH, xRowH, xTtlH, legendH: 44, spad: SPAD,
    _xLabels: data.map(d => fmtX(d.x)), _series: series, _colors: colors,
  };

  return buildCanvas(L, cfg, (ctx, ox, oy) => {
    drawYAxis(ctx, ticks, axMin, span, ox, oy, barsW);
    data.forEach((d, gi) => {
      const gx = ox + gi * CELL_W + (CELL_W - grpW) / 2;
      neumoInset(ctx, gx, oy, grpW, RAIL_H, 10);
      d.values.forEach((v, si) => {
        const bH = Math.abs(v) / span * (RAIL_H - 6);
        const bX = gx + si * (BW + BGAP);
        const bY = v >= 0 ? oy + RAIL_H - zeroPct * (RAIL_H - 6) - bH - 3 : oy + RAIL_H - zeroPct * (RAIL_H - 6) - 3;
        if (bH > 0) {
          drawBar(ctx, bX, bY, BW, bH, colors[si], [7, 7, 7, 7]);
          if (cfg.showValueLabels) drawValueLabel(ctx, Math.round(v), bX + BW / 2, v >= 0 ? bY : bY + bH + 16);
        }
      });
    });
  });
}

export function renderLineCanvas({ headers, rows }, cfg) {
  const nomAxe = headers[0], series = headers.slice(1);
  const palette = cfg.colors || COLORS;
  const colors = series.map((_, i) => palette[i % palette.length]);

  const seriesData = series.map(s => rows.map(r => ({ x: r[nomAxe], v: parseFloat(r[s]) || 0 })));
  const allVals = seriesData.flat().map(d => d.v);
  const maxV = Math.max(...allVals, 0);
  const ticks = niceIntTicks(0, maxV, Y_TICKS);
  const axMin = ticks[0], axMax = ticks[ticks.length - 1], span = axMax - axMin || 1;

  const n = rows.length;
  const CELL_W_LINE = Math.max(36, Math.min(80, Math.floor(700 / n)));
  const L = calcLayout(n, !!cfg.yTitle, !!cfg.xTitle, series.length > 1, series.length, CELL_W_LINE);
  L._xLabels = rows.map(r => fmtX(r[nomAxe]));
  if (series.length > 1) { L._series = series; L._colors = colors; }
  if (cfg.showValueLabels) {
    const extra = 18;
    L._topPad  = extra;
    L.zoneH   += extra;
    L.totalH  += extra;
  }

  return buildCanvas(L, cfg, (ctx, ox, oy) => {
    drawYAxis(ctx, ticks, axMin, span, ox, oy, L.barsW);

    ctx.save();
    ctx.strokeStyle = RT.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i < n; i++) {
      const cx = ox + i * L.CELL_W + L.CELL_W / 2;
      ctx.beginPath(); ctx.moveTo(cx, oy); ctx.lineTo(cx, oy + RAIL_H); ctx.stroke();
    }
    ctx.restore();

    const allPts = seriesData.map(sd => sd.map((d, i) => ({
      x: ox + i * L.CELL_W + L.CELL_W / 2,
      y: oy + RAIL_H - Math.max(0, (d.v - axMin) / span) * (RAIL_H - 6) - 3,
    })));

    allPts.forEach((pts, si) => drawCarvedChannel(ctx, pts, colors[si]));
    allPts.forEach((pts, si) => pts.forEach(({ x, y }) => drawWell(ctx, x, y, colors[si])));
    if (cfg.showValueLabels) {
      allPts.forEach((pts, si) =>
        pts.forEach(({ x, y }, i) => drawValueLabel(ctx, Math.round(seriesData[si][i].v), x, y - 8))
      );
    }
  });
}
