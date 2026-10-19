// Parts drawn from their content: tables from cells, charts from numbers, flowchart nodes from words.
// Ported line for line in ios/App/Shapes.swift.
import { minOf, maxOf } from './extent.js';

// A table is its cells. The frame is drawn from them: the first row is the header, and each column is as
// wide as its longest cell, so cells grow with their text. Rows may be short; missing cells are blank.
export function tableFrame(cells) {
  const rows = cells.length ? cells : [['']];
  const widths = Array.from({ length: Math.max(1, maxOf(rows.map(r => r.length))) },
    (_, i) => Math.max(1, maxOf(rows.map(r => [...(r[i] || '')].length))));
  const rule = (l, m, r) => l + widths.map(w => '─'.repeat(w + 2)).join(m) + r;
  const row = r => '│' + widths.map((w, i) => ` ${(r[i] || '').padEnd(w)} `).join('│') + '│';
  const out = [rule('┌', '┬', '┐'), row(rows[0])];
  if (rows.length > 1) out.push(rule('├', '┼', '┤'), ...rows.slice(1).map(row));
  return [...out, rule('└', '┴', '┘')];
}

// A flowchart node: its words in a box, one cell of padding each side.
export function nodeFrame(text) {
  const lines = String(text).split('\n'), w = Math.max(1, maxOf(lines.map(l => [...l].length)));
  return [`┌${'─'.repeat(w + 2)}┐`, ...lines.map(l => `│ ${l.padEnd(w)} │`), `└${'─'.repeat(w + 2)}┘`];
}

// The way back: a table's cells read off its template, and as typed rows (`a | b`, one row a line).
export const tableCells = template =>
  template.filter(l => l.includes('│')).map(l => l.split('│').slice(1, -1).map(c => c.trim()));
export const tableText = template => tableCells(template).map(r => r.join(' | ')).join('\n');
export const textCells = text => String(text).replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim())
  .map(l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()));

// Charts are drawn from a list of numbers, kept as the part's text: one `label number` a line, or bare
// numbers split by spaces or commas. A bar chart lines up labels and scales bars to the largest value in
// eighths of a cell; a sparkline spreads the values over eight block heights; progress fills to a percent.
export const CHARTS = ['chart', 'sparkline', 'progress'];
// The parts drawn from their text alone: a chart, a sequence diagram, a tree. Null for any other part.
export function contentFrame(id, text) {
  if (CHARTS.includes(id)) return chartFrame(id, text);
  if (id === 'sequence') return sequenceFrame(text);
  if (id === 'tree') return treeFrame(text);
  return null;
}

// Parts sized by what is in them (cells, numbers, messages): a drag moves them and never stretches them.
export const SIZED = ['table', 'sequence', 'tree', ...CHARTS];
const EIGHTHS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉'];
const SPARKS = '▁▂▃▄▅▆▇█';
const fmt = n => String(Math.round(n * 100) / 100);

export function chartItems(text) {
  const items = [];
  for (const line of String(text).replace(/\r\n?/g, '\n').split('\n').map(l => l.trim()).filter(Boolean)) {
    if (/^[-\d.,%\s]+$/.test(line)) {
      for (const n of line.split(/[\s,]+/).map(parseFloat)) if (Number.isFinite(n)) items.push({ label: '', value: n });
      continue;
    }
    const m = line.match(/^(.*?)\s*(-?\d+(?:\.\d+)?)%?$/);
    if (m) items.push({ label: m[1].trim(), value: parseFloat(m[2]) });
  }
  return items;
}

export function chartFrame(kind, text) {
  const items = chartItems(text);
  if (!items.length) return [kind === 'sparkline' ? '▁' : '0'];
  if (kind === 'sparkline') {
    const values = items.map(i => i.value), lo = Math.min(minOf(values)), hi = Math.max(maxOf(values));
    return [values.map(v => SPARKS[hi === lo ? 3 : Math.round((v - lo) / (hi - lo) * 7)]).join('')];
  }
  if (kind === 'progress') {
    const { label, value } = items[0], pct = Math.max(0, Math.min(100, value)), filled = Math.round(pct / 100 * 14);
    return [`${label ? label + ' ' : ''}${'▓'.repeat(filled)}${'░'.repeat(14 - filled)} ${fmt(pct)}%`];
  }
  const max = Math.max(maxOf(items.map(i => i.value)), 0) || 1;
  const pad = Math.max(0, maxOf(items.map(i => [...i.label].length)));
  // A blank row between bars keeps them apart; blocks are painted edge to edge.
  return items.flatMap(({ label, value }, i) => {
    const eighths = Math.round(Math.max(0, value) / max * 20 * 8);
    const bar = '█'.repeat(Math.floor(eighths / 8)) + EIGHTHS[eighths % 8];
    return [...(i ? [''] : []), `${pad ? label.padEnd(pad) + ' ' : ''}${bar.padEnd(20)} ${fmt(value)}`];
  });
}

// A sequence diagram from `A -> B: message` lines (`-->` for a reply, drawn dashed). Each participant is a box
// with a lifeline under it, in the order they first appear; each message is a label over an arrow, one after
// the next. Lifelines are spaced so every label fits between its two ends.
const MESSAGE = /^(.+?)\s*(-->|->)\s*(.+?)\s*:\s*(.*)$/;
export const isMessage = line => MESSAGE.test(line.trim());

export function sequenceFrame(text) {
  const msgs = String(text).replace(/\r\n?/g, '\n').split('\n').map(l => l.trim().match(MESSAGE)).filter(Boolean)
    .map(([, from, kind, to, label]) => ({ from, to, label, reply: kind === '-->' }));
  if (!msgs.length) return ['┌───┐', '│ ? │', '└───┘'];
  const names = [];
  for (const m of msgs) for (const n of [m.from, m.to]) if (!names.includes(n)) names.push(n);
  const len = s => [...s].length, at = n => names.indexOf(n);
  const centers = [];
  names.forEach((n, i) => {
    const half = Math.floor((len(n) + 4) / 2);
    centers.push(i ? centers[i - 1] + Math.floor((len(names[i - 1]) + 4) / 2) + half + 4 : half);
  });
  for (const m of [...msgs].sort((a, b) => Math.abs(at(a.from) - at(a.to)) - Math.abs(at(b.from) - at(b.to)))) {
    const lo = Math.min(at(m.from), at(m.to)), hi = Math.max(at(m.from), at(m.to));
    const need = lo === hi ? 0 : len(m.label) + 4 - (centers[hi] - centers[lo]);
    if (need > 0) for (let i = hi; i < centers.length; i++) centers[i] += need;
  }
  const last = names.length - 1;
  const width = Math.max(centers[last] + Math.ceil((len(names[last]) + 4) / 2),maxOf(msgs.filter(m => m.from === m.to).map(m => centers[at(m.from)] + len(m.label) + 6)));
  const blank = () => Array(width).fill(' ');
  const rows = [blank(), blank(), blank()];
  names.forEach((n, i) => {
    const w = len(n) + 4, x = centers[i] - Math.floor(w / 2);
    [`┌${'─'.repeat(w - 2)}┐`, `│ ${n} │`, `└${'─'.repeat(w - 2)}┘`].forEach((s, r) => [...s].forEach((ch, c) => { rows[r][x + c] = ch; }));
    rows[2][centers[i]] = '┬';
  });
  const line = () => { const r = blank(); centers.forEach(c => { r[c] = '│'; }); return r; };
  const put = (r, x, s) => [...s].forEach((ch, i) => { r[x + i] = ch; });
  for (const m of msgs) {
    const a = centers[at(m.from)], b = centers[at(m.to)], dash = m.reply ? '╌' : '─';
    if (a === b) {
      const label = line(), out = line(), back = line();
      put(label, a + 2, m.label); put(out, a, '├──┐'); put(back, a, '◀──┘');
      rows.push(label, out, back);
      continue;
    }
    const label = line(), arrow = line(), lo = Math.min(a, b);
    put(label, lo + 2, m.label);
    for (let c = lo + 1; c < Math.max(a, b); c++) arrow[c] = dash;
    arrow[a] = b > a ? '├' : '┤';
    arrow[b] = b > a ? '▶' : '◀';
    rows.push(label, arrow);
  }
  rows.push(line());
  return rows.map(r => r.join('').replace(/\s+$/, '').padEnd(width));
}

// A tree from an indented `- ` list: file trees, sitemaps, org charts as an outline. Each level is two spaces
// (or a tab) deeper than its parent; children hang off ├── and └── under it.
export const isTreeLine = line => /^\s*-\s+\S/.test(line);
export function treeItems(text) {
  return String(text).replace(/\r\n?/g, '\n').split('\n').filter(isTreeLine).map(l => {
    const [, lead, label] = l.replace(/\t/g, '  ').match(/^(\s*)-\s+(.*?)\s*$/);
    return { depth: lead.length, label };
  });
}
export function treeFrame(text) {
  const items = treeItems(text);
  if (!items.length) return ['?'];
  // Each item's parent is the nearest earlier item that sits less deep.
  const kids = items.map(() => []), roots = [];
  items.forEach((it, i) => {
    let p = i - 1;
    while (p >= 0 && items[p].depth >= it.depth) p--;
    (p < 0 ? roots : kids[p]).push(i);
  });
  const out = [];
  const draw = (i, prefix) => kids[i].forEach((k, n) => {
    const last = n === kids[i].length - 1;
    out.push(`${prefix}${last ? '└── ' : '├── '}${items[k].label}`);
    draw(k, prefix + (last ? '    ' : '│   '));
  });
  for (const r of roots) { out.push(items[r].label); draw(r, ''); }
  const width = Math.max(maxOf(out.map(l => [...l].length)));
  return out.map(l => l.padEnd(width));
}

// A symbol is a part made once and reused: its copies share a `symbol` id, and editing one copy's content
// (words, cells, size, box style) edits them all. Position, highlight and layer flags stay each copy's own.
const SYMBOL_FIELDS = ['template', 'width', 'height', 'text', 'style'];
export function syncSymbol(elements, id) {
  const src = elements.find(el => el.id === id);
  if (!src?.symbol) return elements;
  return elements.map(el => {
    if (el.symbol !== src.symbol || el.id === id) return el;
    const next = { ...el };
    for (const f of SYMBOL_FIELDS) { if (src[f] === undefined) delete next[f]; else next[f] = src[f]; }
    return next;
  });
}
export const makeSymbol = (elements, id, symbol) => elements.map(el => (el.id === id ? { ...el, symbol } : el));
export const detachSymbol = (elements, id) => elements.map(el => { if (el.id !== id) return el; const { symbol: _, ...rest } = el; return rest; });
export const symbolUses = (elements, el) => (el?.symbol ? elements.filter(x => x.symbol === el.symbol).length : 0);

// A part's state, drawn in its characters so it shows in pasted text too: pressed is heavy lines and solid
// brackets, disabled is dashed lines and soft brackets, error is double lines and bangs. Each copy has its own.
export const VARIANTS = ['default', 'pressed', 'disabled', 'error'];
const VARIANT_CHARS = {
  pressed: { from: '─│┌┐└┘├┤┬┴┼[]', to: '━┃┏┓┗┛┣┫┳┻╋▐▌' },
  disabled: { from: '─│[]', to: '┄┆‹›' },
  error: { from: '─│┌┐└┘├┤┬┴┼[]', to: '═║╔╗╚╝╠╣╦╩╬!!' },
};
export function variantChar(ch, variant) {
  const map = VARIANT_CHARS[variant];
  const i = map ? map.from.indexOf(ch) : -1;
  return i < 0 ? ch : [...map.to][i];
}

// The four shades a Shade fill can take, light to solid.
export const FILLS = ['░', '▒', '▓', '█'];

// Notes: a short note pinned to a part, for a person or an agent to act on. It rides in the project file,
// never in copied text. An empty note is a resolved one.
export const NOTE_MAX = 500;
export const cleanNote = note => String(note ?? '').trim().slice(0, NOTE_MAX);
export const noteList = elements => elements.filter(el => el.note)
  .map(({ id, presetId, col, row, note }) => ({ id, part: presetId, col, row, note }));
