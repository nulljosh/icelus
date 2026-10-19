// The layout as HTML for a developer: each part becomes the real element it stands for (a button, an
// input, a table), placed on the same character grid, so the handoff keeps both the structure and the
// positions. Anything without an HTML twin stays a <pre> of its characters. Every string is escaped.
// Ported line for line in ios/App/HTML.swift.

import { COLORS } from './color.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const first = (el, re) => el.template[0]?.match(re);

function inner(el) {
  const t = el.template[0] ?? '';
  let m;
  switch (el.presetId) {
    case 'button': return `<button>${esc(first(el, /^\[\s*(.*?)\s*\]$/)?.[1] ?? t)}</button>`;
    case 'input': return `<input placeholder="${esc(first(el, /^\[\s*(.*?)_*\s*\]$/)?.[1] ?? '')}">`;
    case 'checkbox':
      if ((m = first(el, /^\[(.)\]\s*(.*)$/))) return `<label><input type="checkbox"${m[1] === ' ' ? '' : ' checked'}> ${esc(m[2])}</label>`;
      break;
    case 'radio':
      if ((m = first(el, /^\((.)\)\s*(.*)$/))) return `<label><input type="radio"${m[1] === ' ' ? '' : ' checked'}> ${esc(m[2])}</label>`;
      break;
    case 'select': return `<select><option>${esc(first(el, /^\[▾\s*(.*?)\s*\]$/)?.[1] ?? '')}</option></select>`;
    case 'divider': return '<hr>';
    case 'banner': return `<h1>${esc(el.text ?? el.label)}</h1>`;
    case 'text': return `<p>${el.template.map(esc).join('<br>')}</p>`;
    case 'table': {
      const rows = el.template.filter(l => l.includes('│')).map(l => l.split('│').slice(1, -1).map(c => esc(c.trim())));
      if (rows.length) {
        const [head, ...body] = rows;
        return `<table><thead><tr>${head.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${body.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      }
    }
  }
  return `<pre>${el.template.map(esc).join('\n')}</pre>`;
}

export function toHTML(elements, cols, rows, title = 'Icelus layout') {
  const parts = elements.map(el => {
    const box = `style="left:${el.col}ch;top:calc(${el.row} * var(--row));width:${el.width}ch;height:calc(${el.height} * var(--row))"`;
    if (el.presetId === 'screen') return `<section class="screen" aria-label="${esc(el.text ?? 'Screen')}" ${box}><h2>${esc(el.text ?? 'Screen')}</h2></section>`;
    // Ink and paper come along as inline colors; parts without them stay plain.
    const paint = [el.ink !== undefined && COLORS[el.ink] && `color:${COLORS[el.ink].hex}`, el.paper !== undefined && COLORS[el.paper] && `background:${COLORS[el.paper].hex}`].filter(Boolean).join(';');
    const styled = paint ? box.replace(/"$/, `;${paint}"`) : box;
    return `<div class="part part-${esc(el.presetId)}${el.accent ? ' accent' : ''}" ${styled}>${inner(el)}</div>`;
  });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root { --row: 1.5em; font: 14px/1.5 ui-monospace, "SF Mono", Menlo, monospace; }
  body { margin: 0; padding: 16px; }
  .layout { position: relative; width: ${cols}ch; height: calc(${rows} * var(--row)); }
  .part, .screen { position: absolute; box-sizing: border-box; }
  .accent { color: #1D4ED8; }
  .screen { border: 1px solid currentColor; border-radius: 8px; }
  .screen h2 { margin: 0; padding: 0 1ch; font-size: inherit; }
  pre, p, h1 { margin: 0; font: inherit; }
  h1 { font-weight: 700; font-size: 2em; line-height: calc(3 * var(--row) / 2); }
  input, select, button { font: inherit; width: 100%; box-sizing: border-box; }
  label input { width: auto; }
  hr { margin: calc(var(--row) / 2) 0 0; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid currentColor; padding: 0 1ch; text-align: left; }
</style>
</head>
<body>
<main class="layout">
${parts.join('\n')}
</main>
</body>
</html>
`;
}
