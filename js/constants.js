export const PALETTES = {
  mercury: ['#9E68D2','#D5B8EA','#7FB5FF','#FFB57F','#7FD5B5','#FF9FB3','#A8D8EA','#FFC8A2','#D3B1C2','#C6D57E'],
  lavender: ['#8F67D6','#C9B2EE','#B9A0E8','#E0D4F7','#A88AE1','#D8C8F3','#7B5BC5','#EEE7FB','#BCA7EA','#9674D9'],
  ember: ['#C96A3D','#F0B38B','#D9895B','#F7C8A7','#A94F2F','#E4A07A','#8A3D24','#FFD9C2','#B95B36','#F2B08F'],
  tide: ['#2D8C8A','#8ED3D1','#57AAA8','#BFE8E6','#226E6D','#72C1BE','#1C5B5A','#D9F3F1','#3E9C99','#A5DEDC'],
  moss: ['#6E8B3D','#BDD08D','#86A857','#D8E5B8','#566C2E','#A4C070','#455725','#EAF1D9','#789348','#C9D9A2'],
  dusk: ['#5E6FAF','#B7C2EA','#7E8DCA','#D7DDF4','#4B5A93','#9DA9DB','#3C4978','#E7EBFA','#6979BB','#C7D0EF'],
  rosewood: ['#B45E7A','#E8B6C4','#CC7D96','#F2CFD8','#93455F','#DA98AB','#77354C','#F7E1E7','#BF6B88','#EEC2CE']
};

export const DEFAULT_PALETTE = 'mercury';
export const COLORS = PALETTES[DEFAULT_PALETTE];

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

  line: `mois,Bordeaux,Champagne,Loire
Jan,42,55,33
Fév,48,62,37
Mar,61,71,44
Avr,74,68,55
Mai,88,74,66
Jun,95,79,72
Jul,91,76,69
Aoû,87,72,65
Sep,79,82,60
Oct,68,91,51
Nov,53,74,42
Déc,45,68,36`,
};
