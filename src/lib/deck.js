// Decks: every screen as a slide, in reading order (top to bottom, then left to right). A canvas with no
// screens is one slide of everything on it. toDeck writes one self-contained HTML file that presents with
// the arrow keys and prints one slide per page, so Save as PDF in any browser gives the PDF.
// Ported line for line in ios/App/Deck.swift.

import { renderElements, trimText } from './engine.js';
import { maxOf } from './extent.js';

/** [{ title, text }] for each screen, cropped to its frame. Empty when the canvas is empty. */
export function slides(elements, cols, rows) {
  const grid = renderElements(elements, cols, rows);
  const screens = elements.filter(el => el.presetId === 'screen' && !el.hidden).sort((a, b) => a.row - b.row || a.col - b.col);
  const crop = s => trimText(grid.slice(s.row, s.row + s.height).map(r => r.slice(s.col, s.col + s.width).join('')).join('\n'));
  if (screens.length) return screens.map(s => ({ title: s.text || 'Screen', text: crop(s) }));
  const all = trimText(grid.map(r => r.join('')).join('\n'));
  return all.trim() ? [{ title: 'Icelus', text: all }] : [];
}

/** How big a slide's text can be: its widest line and its line count. */
export function slideSize(text) {
  const lines = text.split('\n');
  return { w: Math.max(1, maxOf(lines.map(l => [...l].length))), h: lines.length };
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function toDeck(elements, cols, rows, title = 'Icelus deck') {
  const list = slides(elements, cols, rows);
  const sections = list.map((s, i) => {
    const { w, h } = slideSize(s.text);
    return `<section${i ? '' : ' class="on"'} style="--w:${w};--h:${h}" aria-label="${esc(s.title)}"><pre>${esc(s.text)}</pre><p>${i + 1} / ${list.length}</p></section>`;
  });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  html, body { margin: 0; height: 100%; background: #F5F5F7; color: #1D1D1F; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif; }
  section { display: none; box-sizing: border-box; height: 100vh; padding: 32px 48px; flex-direction: column; align-items: center; justify-content: center; gap: 24px; }
  section.on { display: flex; }
  pre { margin: 0; font-family: ui-monospace, "SF Mono", Menlo, monospace; line-height: 1.2; font-size: min(calc(88vw / var(--w) / 0.6), calc(80vh / var(--h) / 1.2), 28px); }
  p { margin: 0; font-size: 13px; color: rgba(29, 29, 31, 0.6); }
  @media (prefers-color-scheme: dark) { html, body { background: #000; color: #F5F5F7; } p { color: rgba(245, 245, 247, 0.6); } }
  @page { size: landscape; margin: 0; }
  @media print { html, body { background: #fff; color: #000; } section { display: flex; break-after: page; } }
</style>
</head>
<body>
${sections.join('\n') || '<section class="on"><p>No screens yet.</p></section>'}
<script>
  const all = [...document.querySelectorAll('section')];
  let at = 0;
  const go = d => { all[at].classList.remove('on'); at = Math.max(0, Math.min(all.length - 1, at + d)); all[at].classList.add('on'); };
  addEventListener('keydown', e => { if (['ArrowRight', 'ArrowDown', ' ', 'PageDown'].includes(e.key)) go(1); if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) go(-1); });
  addEventListener('click', e => go(e.clientX < innerWidth / 3 ? -1 : 1));
</script>
</body>
</html>
`;
}
