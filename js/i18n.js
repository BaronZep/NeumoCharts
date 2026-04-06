/**
 * i18n.js
 * Internationalisation — French / English.
 * Each key maps to the translatable text of a [data-i18n] element.
 * Placeholder keys use the suffix "-placeholder".
 * Toast message keys are used programmatically in ui.js.
 */

export const TRANSLATIONS = {
  fr: {
    // Sidebar
    'csv-label':            'Données CSV',
    'import-btn':           'Importer',
    'chart-type-label':     'Type de graphique',
    'type-barres':          'Barres',
    'type-stacked':         'Barres empilées',
    'type-grouped':         'Barres groupées',
    'type-line':            'Courbes',
    'type-pie':             'Camembert',
    'type-comparaison':     'Comparaison',
    'comp-max-label':       'Maximum',
    'pie-labels-label':     'Étiquettes',
    'toggle-off':           'Non',
    'toggle-on':            'Oui',
    'colors-label':         'Couleurs',
    'config-label':         'Configuration',
    'title-label':          'Titre du graphique',
    'title-placeholder':    'Titre…',
    'x-label':              'Titre axe X',
    'x-placeholder':        'Axe X',
    'y-label':              'Titre axe Y',
    'y-placeholder':        'Axe Y',
    'generate-btn':         'Générer',
    // Preview
    'empty-state':          'Collez un CSV et cliquez sur Générer',
    'copy-btn':             'Copier',
    'dl-btn':               'Télécharger PNG',
    // Footer
    'privacy-line1':        'Aucun serveur, aucun stockage.',
    'privacy-line2':        'Vos données ne quittent jamais votre appareil.',
    // Toasts
    'toast-no-csv':         "Collez d'abord un CSV !",
    'toast-no-chart':       "Générez d'abord un graphique !",
    'toast-copied':         'Copié dans le presse-papier !',
    'toast-copy-fail':      'Copie non supportée sur ce navigateur.',
    'toast-error':          'Erreur : ',
    // Default chart title
    'default-title':        'Mon graphique',
    'theme-toggle-label':   "Mode d'affichage",
    'value-labels-label':   'Valeurs',
    'value-labels-toggle':  'Afficher les valeurs',
  },
  en: {
    // Sidebar
    'csv-label':            'CSV Data',
    'import-btn':           'Import',
    'chart-type-label':     'Chart type',
    'type-barres':          'Bars',
    'type-stacked':         'Stacked bars',
    'type-grouped':         'Grouped bars',
    'type-line':            'Lines',
    'type-pie':             'Pie chart',
    'type-comparaison':     'Comparison',
    'comp-max-label':       'Maximum',
    'pie-labels-label':     'Slice labels',
    'toggle-off':           'Off',
    'toggle-on':            'On',
    'colors-label':         'Colours',
    'config-label':         'Configuration',
    'title-label':          'Chart title',
    'title-placeholder':    'Title…',
    'x-label':              'X axis title',
    'x-placeholder':        'X axis',
    'y-label':              'Y axis title',
    'y-placeholder':        'Y axis',
    'generate-btn':         'Generate',
    // Preview
    'empty-state':          'Paste a CSV and click Generate',
    'copy-btn':             'Copy',
    'dl-btn':               'Download PNG',
    // Footer
    'privacy-line1':        'No server, no storage.',
    'privacy-line2':        'Your data never leaves your device.',
    // Toasts
    'toast-no-csv':         'Paste a CSV first!',
    'toast-no-chart':       'Generate a chart first!',
    'toast-copied':         'Copied to clipboard!',
    'toast-copy-fail':      'Copy not supported on this browser.',
    'toast-error':          'Error: ',
    // Default chart title
    'default-title':        'My chart',
    'theme-toggle-label':   'Display mode',
    'value-labels-label':   'Values',
    'value-labels-toggle':  'Show values',
  },
};

export const DEFAULT_LANG = 'fr';
let currentLang = DEFAULT_LANG;

/** Return the translation for a given key in the current language. */
export function t(key) {
  return TRANSLATIONS[currentLang]?.[key] ?? TRANSLATIONS[DEFAULT_LANG][key] ?? key;
}

/** Apply translations to all [data-i18n] elements and update placeholders. */
export function applyLang(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    // Preserve child elements (e.g. SVG icons in buttons) — only update text nodes
    if (el.children.length === 0) {
      el.textContent = val;
    } else {
      // Replace only the last text node (after any icon)
      const nodes = [...el.childNodes];
      const lastText = nodes.filter(n => n.nodeType === Node.TEXT_NODE).at(-1);
      if (lastText) lastText.textContent = val;
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel));
  });
}
