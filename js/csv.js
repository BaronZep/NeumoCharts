/**
 * Parse a raw CSV string into { headers, rows }.
 * @param {string} text
 * @returns {{ headers: string[], rows: Record<string,string>[] }}
 */
export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('CSV invalide : au moins 2 lignes requises');

  const headers = lines[0].split(',').map(h => h.trim());
  if (headers.length < 2) throw new Error('Au moins 2 colonnes requises');

  const rows = lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });

  return { headers, rows };
}
