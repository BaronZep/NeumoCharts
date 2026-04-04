/**
 * Compute nice integer Y-axis tick values.
 * @param {number} vMin
 * @param {number} vMax
 * @param {number} n  - desired tick count
 * @returns {number[]}
 */
export function niceIntTicks(vMin, vMax, n) {
  const raw  = (vMax - vMin) / (n - 1);
  const step = Math.max(1, Math.ceil(raw));
  const start = Math.floor(vMin / step) * step;
  const end   = Math.ceil(vMax  / step) * step;
  const ticks = [];
  for (let v = start; v <= end + step * 0.01; v += step) ticks.push(v);
  return ticks;
}

/**
 * Format an X-axis label: integers stay integers, floats stay floats,
 * non-numeric strings are returned as-is.
 * @param {*} val
 * @returns {string}
 */
export function fmtX(val) {
  const s = String(val);
  if (/^0[xX]/.test(s)) return s;            // hex literals
  const n = parseFloat(s);
  if (!isNaN(n) && Number.isInteger(n)) return String(n);
  if (!isNaN(n)) return String(n);
  return s;
}
