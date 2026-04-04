export const COLORS = [
  '#9E68D2','#D5B8EA','#7FB5FF','#FFB57F',
  '#7FD5B5','#FF9FB3','#A8D8EA','#FFC8A2',
  '#D3B1C2','#C6D57E'
];

export const BG      = '#F0F0F3';
export const SD      = '#d1d5d9';
export const SL      = '#ffffff';
export const TC      = '#6c757d';
export const RAIL_H  = 300;
export const Y_TICKS = 6;
export const Y_AX_W  = 52;
export const Y_TTL_W = 22;
export const GRP_GAP = 14;

/** Placeholder text shown in the CSV textarea for each chart type */
export const CSV_PLACEHOLDERS = {
  histogram: `valeur,occurrences
42,3
43,7
44,15
45,28
46,22
47,10`,

  stacked: `axe,serie1,serie2,serie3
Jan,12,8,5
Fév,15,10,7
Mar,9,14,6
Avr,18,11,9`,

  grouped: `axe,serie1,serie2
Lun,12,8
Mar,15,10
Mer,9,14
Jeu,18,11
Ven,7,13`,
};
