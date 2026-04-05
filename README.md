# 📊 Neumo Charts

A client-side chart generator with a neumorphic design aesthetic. Paste or import a CSV, configure your chart, and export a high-resolution PNG — no server, no dependencies beyond the browser.

**Live demo:** [baronzep.github.io/NeumoCharts](https://baronzep.github.io/NeumoCharts)

---

## Features

- **4 chart types** — Histogram, Stacked bars, Grouped bars, Line / area
- **7 colour palettes** — Mercury, Lavender, Ember, Tide, Moss, Dusk, Rosewood
- **Neumorphic rendering** — raised cards, inset rails, soft drop-shadows, all drawn on Canvas 2D
- **2× resolution export** — PNG output is retina-ready
- **Copy to clipboard** — one click to paste directly into any document or presentation
- **Auto-naming** — exported PNG takes the name of the imported CSV file
- **Fully static** — runs entirely in the browser, zero backend

---

## CSV Format

The first column is always the X-axis label. Subsequent columns are data series.
Column headers become series names in the legend.

### Histogram / Barres
```csv
categorie,valeur
Jan,42
Fév,61
Mar,88
```

### Stacked & Grouped bars
```csv
mois,Nord,Sud,Ouest
Jan,12,8,5
Fév,15,10,7
Mar,9,14,6
```

### Line chart
```csv
mois,Bordeaux,Champagne,Loire
Jan,42,55,33
Fév,48,62,37
Mar,61,71,44
```

---

## Project Structure

```
NeumoCharts/
├── index.html          # App shell, layout, type selector
├── css/
│   ├── layout.css      # Page structure, header, panel grid
│   ├── controls.css    # Form controls, buttons, type selector
│   └── preview.css     # Preview area, action bar, toast
└── js/
    ├── main.js         # Entry point
    ├── constants.js    # Palettes, design tokens, CSV placeholders
    ├── utils.js        # Y-axis tick calculation, label formatting
    ├── csv.js          # CSV parser
    ├── neumoCanvas.js  # All chart rendering (Canvas 2D)
    └── ui.js           # DOM wiring, state management
```

---

## Adding a Chart Type

1. **`neumoCanvas.js`** — implement and export a `render*Canvas({ headers, rows }, cfg)` function following the pattern of existing renderers. Use `calcLayout` and `buildCanvas` to inherit the standard card layout.
2. **`index.html`** — add a `<button class="type-btn" data-type="yourtype">` in the type selector.
3. **`constants.js`** — add a representative CSV example to `CSV_PLACEHOLDERS`.
4. **`ui.js`** — add a branch in `generate()` and import the new renderer.

---

## Local Development

No build step required.

```bash
git clone https://github.com/BaronZep/NeumoCharts.git
cd NeumoCharts
python3 -m http.server 8000
# → http://localhost:8000
```

> **Note:** ES modules require a server context — opening `index.html` directly as a `file://` URL will not work.

---

## Browser Support

| Feature | Chrome | Firefox | Safari |
|---|---|---|---|
| Chart rendering | ✅ | ✅ | ✅ |
| PNG download | ✅ | ✅ | ✅ |
| Copy to clipboard | ✅ | ✅ | ✅ 17.4+ |

---
