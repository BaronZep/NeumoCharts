import { COLORS, SD, SL, TC, RAIL_H, Y_TICKS, Y_AX_W, Y_TTL_W, GRP_GAP } from './constants.js';
import { niceIntTicks, fmtX } from './utils.js';

/* ── shared helpers ──────────────────────────────────────────────────── */

function buildYAxis(ticks, axMin, span) {
  let labels = '', grid = '';
  for (const tv of ticks) {
    const pct = Math.max(0, Math.min(100, ((tv - axMin) / span) * 100));
    const op  = Math.abs(tv) < 0.001 ? '0.65' : '0.2';
    labels += `<div style="position:absolute;bottom:calc(${pct.toFixed(2)}% - 8px);right:6px;font-size:11px;font-weight:600;color:${TC};white-space:nowrap;font-family:'DM Sans',sans-serif">${Math.round(tv)}</div>`;
    grid   += `<div style="position:absolute;bottom:${pct.toFixed(2)}%;left:0;right:0;height:1px;background:${TC};opacity:${op}"></div>`;
  }
  return { labels, grid };
}

function buildXRow(labels, spacerW, cellW) {
  let html = `<div style="width:${spacerW}px;flex-shrink:0"></div>`;
  for (const lbl of labels) {
    html += `<div style="width:${cellW}px;flex-shrink:0;text-align:center;font-size:12px;font-weight:800;color:${TC};font-family:'DM Sans',sans-serif">${lbl}</div>`;
  }
  return `<div class="chart-x-row">${html}</div>`;
}

function buildXTitle(title, spacerW) {
  if (!title) return '';
  return `<div style="display:flex;padding-top:4px">
    <div style="width:${spacerW}px;flex-shrink:0"></div>
    <div style="flex:1;text-align:center;font-size:12px;font-weight:700;color:${TC};font-family:'DM Sans',sans-serif">${title}</div>
  </div>`;
}

function buildYTitle(title) {
  if (!title) return '';
  return `<div style="width:${Y_TTL_W}px;height:${RAIL_H}px;flex-shrink:0;display:flex;align-items:center;justify-content:center">
    <span style="writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg);font-size:12px;font-weight:700;color:${TC};white-space:nowrap;font-family:'DM Sans',sans-serif">${title}</span>
  </div>`;
}

function buildLegend(series, colors) {
  if (series.length <= 1) return '';
  const items = series.map((s, i) =>
    `<div class="chart-legend-item">
      <div class="chart-legend-dot" style="background:${colors[i]}"></div>${s}
    </div>`
  ).join('');
  return `<div class="chart-legend">${items}</div>`;
}

function wrapChart(title, inner, legend) {
  return `<div class="chart-wrap">
    <div class="chart-title-el">${title}</div>
    <div class="chart-zone">${inner}</div>
    ${legend}
  </div>`;
}

/* ── histogram ───────────────────────────────────────────────────────── */

export function renderHistogram({ headers, rows }, cfg) {
  const [nomAxe, nomSerie] = headers;
  const color  = COLORS[0];
  const BAR_W  = Math.max(28, Math.min(60, Math.floor(700 / rows.length)));
  const CELL_W = BAR_W + GRP_GAP;

  const data  = rows.map(r => ({ x: r[nomAxe], v: parseFloat(r[nomSerie]) || 0 }));
  const maxV  = Math.max(...data.map(d => d.v), 0);
  const ticks = niceIntTicks(0, maxV, Y_TICKS);
  const axMin = ticks[0], axMax = ticks[ticks.length - 1];
  const span  = axMax - axMin || 1;
  const { labels: yLabels, grid } = buildYAxis(ticks, axMin, span);
  const spacerW = (cfg.yTitle ? Y_TTL_W : 0) + Y_AX_W;

  let rails = '';
  for (const d of data) {
    const hPct = (d.v / span) * 100;
    const bar  = `<div style="position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:65%;height:${hPct.toFixed(2)}%;background:${color};border-radius:9px 9px 3px 3px;box-shadow:2px 2px 4px ${SD},-2px -2px 4px ${SL}"></div>`;
    rails += `<div style="width:${CELL_W}px;flex-shrink:0">
      <div class="chart-rail" style="width:${BAR_W}px;height:${RAIL_H}px">${grid}${bar}</div>
    </div>`;
  }

  const inner = `
    <div class="chart-inner">
      ${buildYTitle(cfg.yTitle)}
      <div style="position:relative;width:${Y_AX_W}px;height:${RAIL_H}px;flex-shrink:0">${yLabels}</div>
      <div style="display:flex;align-items:flex-end;height:${RAIL_H}px">${rails}</div>
    </div>
    ${buildXRow(data.map(d => fmtX(d.x)), spacerW, CELL_W)}
    ${buildXTitle(cfg.xTitle, spacerW)}`;

  return wrapChart(cfg.title, inner, '');
}

/* ── stacked bars ────────────────────────────────────────────────────── */

export function renderStacked({ headers, rows }, cfg) {
  if (headers.length < 2) throw new Error('2 colonnes minimum requises');
  const nomAxe  = headers[0];
  const series  = headers.slice(1);
  const colors  = series.map((_, i) => COLORS[i % COLORS.length]);
  const BAR_W   = Math.max(28, Math.min(56, Math.floor(700 / rows.length)));
  const CELL_W  = BAR_W + GRP_GAP;

  const data     = rows.map(r => ({ x: r[nomAxe], values: series.map(s => parseFloat(r[s]) || 0) }));
  const maxTotal = Math.max(...data.map(d => d.values.reduce((a, b) => a + b, 0)), 0);
  const ticks    = niceIntTicks(0, maxTotal, Y_TICKS);
  const axMin    = ticks[0], axMax = ticks[ticks.length - 1];
  const span     = axMax - axMin || 1;
  const { labels: yLabels, grid } = buildYAxis(ticks, axMin, span);
  const spacerW  = (cfg.yTitle ? Y_TTL_W : 0) + Y_AX_W;

  let rails = '';
  for (const d of data) {
    let segs = grid, botPct = 0;
    d.values.forEach((v, i) => {
      const hPct  = (v / span) * 100;
      const isBot = i === 0, isTop = i === series.length - 1;
      const br    = isBot && isTop ? '8px' : isTop ? '8px 8px 0 0' : isBot ? '0 0 8px 8px' : '0';
      segs += `<div style="position:absolute;bottom:${(botPct + 3).toFixed(2)}%;height:${hPct.toFixed(2)}%;left:50%;transform:translateX(-50%);width:65%;background:${colors[i]};border-radius:${br};box-shadow:1px 1px 2px ${SD},-1px -1px 2px ${SL}"></div>`;
      botPct += hPct;
    });
    rails += `<div style="width:${CELL_W}px;flex-shrink:0">
      <div class="chart-rail" style="width:${BAR_W}px;height:${RAIL_H}px">${segs}</div>
    </div>`;
  }

  const inner = `
    <div class="chart-inner">
      ${buildYTitle(cfg.yTitle)}
      <div style="position:relative;width:${Y_AX_W}px;height:${RAIL_H}px;flex-shrink:0">${yLabels}</div>
      <div style="display:flex;align-items:flex-end;height:${RAIL_H}px">${rails}</div>
    </div>
    ${buildXRow(data.map(d => fmtX(d.x)), spacerW, CELL_W)}
    ${buildXTitle(cfg.xTitle, spacerW)}`;

  return wrapChart(cfg.title, inner, buildLegend(series, colors));
}

/* ── grouped bars ────────────────────────────────────────────────────── */

export function renderGrouped({ headers, rows }, cfg) {
  if (headers.length < 2) throw new Error('2 colonnes minimum requises');
  const nomAxe  = headers[0];
  const series  = headers.slice(1);
  const colors  = series.map((_, i) => COLORS[i % COLORS.length]);
  const BAR_W   = 15, BAR_GAP = 3;
  const grpW    = series.length * BAR_W + (series.length - 1) * BAR_GAP;
  const CELL_W  = grpW + GRP_GAP;

  const data    = rows.map(r => ({ x: r[nomAxe], values: series.map(s => parseFloat(r[s]) || 0) }));
  const allV    = data.flatMap(d => d.values);
  const valMin  = Math.min(...allV, 0), valMax = Math.max(...allV, 0);
  const ticks   = niceIntTicks(valMin, valMax, Y_TICKS);
  const axMin   = ticks[0], axMax = ticks[ticks.length - 1];
  const span    = axMax - axMin || 1;
  const zeroPct = (-axMin / span) * 100;
  const { labels: yLabels, grid } = buildYAxis(ticks, axMin, span);
  const spacerW = (cfg.yTitle ? Y_TTL_W : 0) + Y_AX_W;

  let rails = '';
  for (const d of data) {
    let bars = grid;
    d.values.forEach((v, i) => {
      const hPct   = Math.abs(v) / span * 100;
      const leftPx = i * (BAR_W + BAR_GAP);
      const botPct = v >= 0 ? zeroPct : zeroPct - hPct;
      const br     = v >= 0 ? '7px 7px 2px 2px' : '2px 2px 7px 7px';
      bars += `<div style="position:absolute;bottom:${botPct.toFixed(2)}%;height:${hPct.toFixed(2)}%;left:${leftPx}px;width:${BAR_W}px;background:${colors[i]};border-radius:${br};box-shadow:1px 1px 2px ${SD},-1px -1px 2px ${SL}"></div>`;
    });
    rails += `<div style="width:${CELL_W}px;flex-shrink:0">
      <div class="chart-rail" style="width:${grpW}px;height:${RAIL_H}px">${bars}</div>
    </div>`;
  }

  const inner = `
    <div class="chart-inner">
      ${buildYTitle(cfg.yTitle)}
      <div style="position:relative;width:${Y_AX_W}px;height:${RAIL_H}px;flex-shrink:0">${yLabels}</div>
      <div style="display:flex;align-items:flex-end;height:${RAIL_H}px">${rails}</div>
    </div>
    ${buildXRow(data.map(d => fmtX(d.x)), spacerW, CELL_W)}
    ${buildXTitle(cfg.xTitle, spacerW)}`;

  return wrapChart(cfg.title, inner, buildLegend(series, colors));
}
