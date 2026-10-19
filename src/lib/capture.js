// Capture a page: a web page's HTML back as the typed syntax (syntax.js), so it draws as an editable
// wireframe. Headings, links, buttons, fields, lists and tables are kept, in page order; scripts, styles and
// images are dropped. No DOM, so it runs the same in a Worker, in Node and in the browser.

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const SKIP = new Set(['script', 'style', 'noscript', 'svg', 'template', 'head', 'iframe', 'canvas', 'object']);
const HOLD = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'td', 'th', 'button', 'a', 'label', 'option', 'title', 'summary', 'dt', 'dd', 'figcaption', 'blockquote']);
const BLOCK = new Set(['div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'form', 'nav', 'ul', 'ol', 'table', 'tr', 'br', 'fieldset']);
const MAX_LINES = 40;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '-', ndash: '-', hellip: '...', copy: '(c)', rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"' };
const decode = s => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
  if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ''; }
  return ENTITIES[e.toLowerCase()] ?? m;
});
const squash = s => decode(s).replace(/\s+/g, ' ').trim();
const attrs = s => Object.fromEntries([...s.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m => [m[1].toLowerCase(), decode(m[2] ?? m[3] ?? m[4] ?? '')]));
const clip = (s, n) => ([...s].length > n ? [...s].slice(0, n - 1).join('') + '…' : s);
// Plain text must not read as syntax: no leading marks, no arrows that would draw a flowchart.
const plain = s => clip(s.replace(/->/g, '→').replace(/^[#[("|\-\s]+/, ''), 70);
const word = s => clip(s.replace(/[[\]()"|]/g, '').replace(/->/g, '→').trim(), 30);

// The page as items in order: { kind, text, cells? }.
function items(html) {
  const out = [], stack = [], rows = [];
  let skip = 0, row = null;
  const hold = () => { for (let i = stack.length - 1; i >= 0; i--) if (stack[i].buf !== undefined) return stack[i]; return null; };
  const loose = { buf: '' }; // text outside any held tag
  const flushLoose = () => { const t = squash(loose.buf); if (t) out.push({ kind: 'text', text: t }); loose.buf = ''; };
  const src = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<!doctype[^>]*>/gi, '');
  for (const m of src.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>|([^<]+)/g)) {
    const [, close, rawTag, rest, selfClose, text] = m;
    if (text !== undefined) {
      if (skip) continue;
      const h = hold();
      if (h) h.buf += text; else loose.buf += text;
      continue;
    }
    const tag = rawTag.toLowerCase();
    if (SKIP.has(tag)) { if (!VOID.has(tag) && !selfClose) skip += close ? -1 : 1; skip = Math.max(0, skip); continue; }
    if (skip) continue;
    const a = close ? {} : attrs(rest);
    { const h = hold(); if (h) h.buf += ' '; } // words from separate elements stay separate words
    if (!close) {
      if (BLOCK.has(tag) || HOLD.has(tag)) flushLoose();
      if (tag === 'tr') row = [];
      if (tag === 'hr') out.push({ kind: 'hr' });
      if (tag === 'input') {
        const type = (a.type || 'text').toLowerCase();
        const label = squash(a.placeholder || a['aria-label'] || a.value || a.name || type);
        if (['submit', 'button', 'reset'].includes(type)) out.push({ kind: 'button', text: label });
        else if (type === 'checkbox') out.push({ kind: 'check', text: squash(a['aria-label'] || a.name || 'Option') });
        else if (type === 'radio') out.push({ kind: 'radio', text: squash(a['aria-label'] || a.value || a.name || 'Option') });
        else if (type !== 'hidden') out.push({ kind: 'input', text: label });
      }
      if (tag === 'textarea') out.push({ kind: 'input', text: squash(a.placeholder || a['aria-label'] || a.name || 'Message') });
      if (tag === 'select') out.push({ kind: 'select', text: squash(a['aria-label'] || a.name || 'Choose'), pending: true });
      if (HOLD.has(tag)) {
        const button = tag === 'button' || (tag === 'a' && /\b(btn|button|cta)\b/i.test(`${a.class ?? ''} ${a.role ?? ''}`));
        // A link to a spot on the same page (Skip to content, a table of contents) says nothing about the screen.
        const jump = tag === 'a' && (a.href ?? '').startsWith('#');
        stack.push({ tag, buf: '', button, jump, nav: stack.some(s => s.tag === 'nav') });
      } else if (!VOID.has(tag) && !selfClose) stack.push({ tag });
      continue;
    }
    // A closing tag: pop to its opener.
    const at = stack.map(s => s.tag).lastIndexOf(tag);
    if (at < 0) continue;
    for (const el of stack.splice(at).reverse()) {
      if (el.buf === undefined) { if (el.tag === 'nav') out.push({ kind: 'break' }); continue; }
      const t = squash(el.buf);
      const parent = hold();
      if (el.tag === 'option') { const sel = out.findLast(i => i.kind === 'select'); if (sel?.pending && t) { sel.text = t; sel.pending = false; } continue; }
      if (!t || el.jump) continue;
      if (el.tag === 'td' || el.tag === 'th') { row?.push(t); continue; }
      if (el.tag === 'button' || el.button || (el.tag === 'a' && el.nav)) { out.push({ kind: 'button', text: t }); continue; }
      if (el.tag === 'a' && parent) { parent.buf += ` ${t} `; continue; }
      if (el.tag === 'label' && out.at(-1)?.kind === 'check' && out.at(-1).text === 'Option') { out.at(-1).text = t; continue; }
      out.push({ kind: /^h[1-6]$/.test(el.tag) ? 'heading' : el.tag === 'title' ? 'title' : el.tag === 'li' ? 'item' : 'text', text: t });
    }
    if (tag === 'tr' && row) { if (row.length) out.push({ kind: 'row', cells: row }); row = null; }
    if (BLOCK.has(tag)) flushLoose();
  }
  flushLoose();
  return out;
}

// A page with a <main> (or an <article>) is read from there, with one row of its first <nav> on top, so the
// site's menus and footers do not bury the screen.
function focus(html) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i) ?? html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if (!main) return items(html);
  const nav = html.match(/<nav\b[^>]*>([\s\S]*?)<\/nav>/i);
  const top = nav && nav.index < main.index ? items(`<nav>${nav[1]}</nav>`).filter(i => i.kind === 'button').slice(0, 6) : [];
  return [...top, { kind: 'break' }, ...items(main[1])];
}

export function htmlToSketch(html) {
  const list = focus(String(html ?? '').slice(0, 2_000_000));
  const lines = [];
  const title = list.find(i => i.kind === 'heading');
  const head = title?.text ?? squash(String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  if (head) lines.push(`# ${word(head)}`);
  let buttons = [];
  const flushButtons = () => { for (let i = 0; i < buttons.length; i += 4) lines.push(buttons.slice(i, i + 4).join('  ')); buttons = []; };
  let tableRows = 0;
  for (const i of list) {
    if (lines.length >= MAX_LINES) break;
    if (i === title) continue;
    if (i.kind === 'button') { const w = word(i.text.split(' ').slice(0, 3).join(' ')); if (w) buttons.push(`[${w}]`); continue; }
    flushButtons();
    if (i.kind !== 'row') tableRows = 0;
    const prev = lines.at(-1);
    let line = null;
    if (i.kind === 'heading' || i.kind === 'text') line = plain(i.text);
    else if (i.kind === 'item') line = `- ${plain(i.text)}`;
    else if (i.kind === 'input') line = `"${word(i.text)}"`;
    else if (i.kind === 'check') line = `[ ] ${word(i.text)}`;
    else if (i.kind === 'radio') line = `( ) ${word(i.text)}`;
    else if (i.kind === 'select') line = `[v ${word(i.text)}]`;
    else if (i.kind === 'hr') line = prev === '---' ? null : '---';
    else if (i.kind === 'row' && tableRows < 6) { tableRows++; line = `| ${i.cells.slice(0, 5).map(c => clip(word(c), 16) || ' ').join(' | ')} |`; }
    if (line && line.replace(/^- /, '').length > 1 && line !== prev) lines.push(line);
  }
  flushButtons();
  return lines.slice(0, MAX_LINES).join('\n');
}

// Only public http(s) pages: no credentials, no local or private hosts, no bare IPs.
export function safePageUrl(raw) {
  let url;
  try { url = new URL(String(raw ?? '').trim()); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  if (!host.includes('.') || /^[\d.]+$/.test(host) || host.includes(':') || host.startsWith('[')
    || /(^|\.)(localhost|local|internal|lan|home|corp|test|invalid)$/.test(host)) return null;
  return url.href;
}
