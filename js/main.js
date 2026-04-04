import { loadFont } from './fonts.js';
import { init } from './ui.js';

loadFont().then(() => init());
