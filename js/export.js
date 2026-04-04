import { showToast } from './ui.js';

/**
 * Collecte tous les @font-face déclarés dans les stylesheets de la page
 * sous forme de texte CSS, pour les injecter dans la fenêtre d'impression.
 */
function collectFontFaces() {
  return [...document.styleSheets]
    .flatMap(s => { try { return [...s.cssRules]; } catch { return []; } })
    .filter(r => r instanceof CSSFontFaceRule)
    .map(r => r.cssText)
    .join('\n');
}

/**
 * Collecte toutes les règles CSS des stylesheets liés (hors font-face),
 * pour les injecter dans la fenêtre d'impression.
 */
function collectStyles() {
  return [...document.styleSheets]
    .flatMap(s => { try { return [...s.cssRules]; } catch { return []; } })
    .filter(r => !(r instanceof CSSFontFaceRule))
    .map(r => r.cssText)
    .join('\n');
}

/**
 * Ouvre une fenêtre dédiée avec le graphique seul,
 * attend que les fonts soient chargées, puis déclenche window.print().
 * L'utilisateur peut sauvegarder en PDF ou PNG depuis la boîte d'impression.
 */
export function printChart() {
  const el = document.querySelector('.chart-wrap');
  if (!el) { showToast('Générez d\'abord un graphique !'); return; }

  const fonts  = collectFontFaces();
  const styles = collectStyles();

  const win = window.open('', '_blank', 'width=800,height=700');
  if (!win) { showToast('Pop-up bloqué — autorisez les pop-ups pour ce site.'); return; }

  win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Neumo Chart</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300..700&display=swap" rel="stylesheet">
  <style>
    /* ── @font-face déclarations de la page parente ── */
    ${fonts}

    /* ── Styles graphique (chart.css, neumo.css, tokens.css…) ── */
    ${styles}

    /* ── Mise en page impression ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background: #e6e6ea;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 40px;
      font-family: 'DM Sans', sans-serif;
    }

    @media print {
      html, body {
        background: white;
        padding: 20px;
        min-height: unset;
      }
      @page { margin: 0.5cm; size: auto; }
    }
  </style>
</head>
<body>
  ${el.outerHTML}
  <script>
    // Attendre que les fonts Google soient chargées avant d'imprimer
    document.fonts.ready.then(() => {
      setTimeout(() => { window.print(); }, 200);
    });
  <\/script>
</body>
</html>`);
  win.document.close();
}
