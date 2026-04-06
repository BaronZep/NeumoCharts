/**
 * constants.js
 * Shared design tokens, colour palettes, and chart layout constants.
 */

// ── Colour palettes ──────────────────────────────────────────────────────────
// Each palette defines 10 ordered colours used for multi-series charts.
export const PALETTES = {
  mercury:  ['#9E68D2','#D5B8EA','#7FB5FF','#FFB57F','#7FD5B5','#FF9FB3','#A8D8EA','#FFC8A2','#D3B1C2','#C6D57E'],
  lavender: ['#8F67D6','#C9B2EE','#B9A0E8','#E0D4F7','#A88AE1','#D8C8F3','#7B5BC5','#EEE7FB','#BCA7EA','#9674D9'],
  ember:    ['#C96A3D','#F0B38B','#D9895B','#F7C8A7','#A94F2F','#E4A07A','#8A3D24','#FFD9C2','#B95B36','#F2B08F'],
  tide:     ['#2D8C8A','#8ED3D1','#57AAA8','#BFE8E6','#226E6D','#72C1BE','#1C5B5A','#D9F3F1','#3E9C99','#A5DEDC'],
  moss:     ['#6E8B3D','#BDD08D','#86A857','#D8E5B8','#566C2E','#A4C070','#455725','#EAF1D9','#789348','#C9D9A2'],
  dusk:     ['#5E6FAF','#B7C2EA','#7E8DCA','#D7DDF4','#4B5A93','#9DA9DB','#3C4978','#E7EBFA','#6979BB','#C7D0EF'],
  rosewood: ['#B45E7A','#E8B6C4','#CC7D96','#F2CFD8','#93455F','#DA98AB','#77354C','#F7E1E7','#BF6B88','#EEC2CE'],

  pie: `categorie,valeur
Marketing,42
Tech,28
RH,15
Finance,20`,

  comparaison: `serie,valeur
Produit A,82
Produit B,64
Produit C,91
Produit D,47`,
};

export const DEFAULT_PALETTE = 'mercury';
export const COLORS           = PALETTES[DEFAULT_PALETTE];

// ── Neumorphic surface tokens ────────────────────────────────────────────────
export const BG  = '#F0F0F3'; // card background
export const SD  = '#d1d5d9'; // shadow dark
export const SL  = '#ffffff'; // shadow light
export const TC  = '#6c757d'; // text / tick colour

export const DARK_BG = '#1e2028'; // dark card background
export const DARK_SD = '#14161d'; // dark shadow dark
export const DARK_SL = '#303342'; // dark shadow light
export const DARK_TC = '#c4ccda'; // dark text / tick colour

// ── Chart layout constants (logical px) ─────────────────────────────────────
export const RAIL_H  = 300; // height of the drawable bar area
export const Y_TICKS = 6;   // target number of Y-axis tick marks
export const Y_AX_W  = 52;  // width reserved for Y-axis tick labels
export const Y_TTL_W = 22;  // width reserved for the Y-axis title (rotated)
export const GRP_GAP = 14;  // gap between grouped bar cells

// ── CSV placeholder text (shown when the textarea is empty) ─────────────────
export const CSV_PLACEHOLDERS = {
  fr: {
    barres:     `categorie,valeur\nLun,12\nMar,15\nMer,9\nJeu,18\nVen,7`,
    stacked:    `axe,serie1,serie2,serie3\nJan,12,8,5\nFév,15,10,7\nMar,9,14,6\nAvr,18,11,9`,
    grouped:    `axe,serie1,serie2\nLun,12,8\nMar,15,10\nMer,9,14\nJeu,18,11\nVen,7,13`,
    line:       `mois,Bordeaux,Champagne,Loire\nJan,42,55,33\nFév,48,62,37\nMar,61,71,44\nAvr,74,68,55\nMai,88,74,66\nJun,95,79,72\nJul,91,76,69\nAoû,87,72,65\nSep,79,82,60\nOct,68,91,51\nNov,53,74,42\nDéc,45,68,36`,
    pie:        `categorie,valeur\nMarketing,42\nTech,28\nRH,15\nFinance,20`,
    comparaison:`serie,valeur\nProduit A,82\nProduit B,64\nProduit C,91\nProduit D,47`,
  },
  en: {
    barres:     `category,value\nMon,12\nTue,15\nWed,9\nThu,18\nFri,7`,
    stacked:    `axis,series1,series2,series3\nJan,12,8,5\nFeb,15,10,7\nMar,9,14,6\nApr,18,11,9`,
    grouped:    `axis,series1,series2\nMon,12,8\nTue,15,10\nWed,9,14\nThu,18,11\nFri,7,13`,
    line:       `month,Bordeaux,Champagne,Loire\nJan,42,55,33\nFeb,48,62,37\nMar,61,71,44\nApr,74,68,55\nMay,88,74,66\nJun,95,79,72\nJul,91,76,69\nAug,87,72,65\nSep,79,82,60\nOct,68,91,51\nNov,53,74,42\nDec,45,68,36`,
    pie:        `category,value\nMarketing,42\nTech,28\nHR,15\nFinance,20`,
    comparaison:`series,value\nProduct A,82\nProduct B,64\nProduct C,91\nProduct D,47`,
  },
};
