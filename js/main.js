import { loadFont } from './fonts.js';
import { init } from './ui.js';

// init() est toujours appelé, même si la police échoue à charger
loadFont().catch(e => console.warn('Font load failed:', e)).finally(() => init());
