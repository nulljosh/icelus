// The typed syntax: write a screen as plain lines, get editable parts back.
//
//   # Sign in                     a banner title
//   "Email"   "Password"          inputs, the words are the placeholder
//   [x] Remember me   ( ) Work    a checkbox and a radio; [ ] and ( ) are off, [x] and (o) are on
//   [v Country]                   a select
//   [Sign in]   [Cancel]          buttons
//   ---                           a divider
//   | Name | Plan |               table rows, the first one is the header
//   anything else                 text
//
// Parts on one line sit side by side, split by two or more spaces. Each line is a row, with a blank
// row after it; a blank line adds one more.

import { createElement, renderElements, gridToText, trimText } from './engine.js';
import { screenFrame, bannerText, tableFrame, tableCells, textCells, nodeFrame, createLine, sequenceFrame, isMessage, treeFrame, isTreeLine }
  from './lines.js';
import { minOf, maxOf } from './extent.js';

const part = (id, label, template, extra) =>
  ({ id, label, template, width: maxOf(template.map(l => [...l].length)), height: template.length, ...extra });

function chunk(src) {
  let m;
  if ((m = src.match(/^\[([ xX])\]\s+(.+)$/))) return part('checkbox', 'Checkbox', [`[${m[1] === ' ' ? ' ' : '✓'}] ${m[2]}`]);
  if ((m = src.match(/^\(([ oO])\)\s+(.+)$/))) return part('radio', 'Radio', [`(${m[1] === ' ' ? ' ' : '●'}) ${m[2]}`]);
  if ((m = src.match(/^\[v\s+(.+)\]$/))) return part('select', 'Select', [`[▾ ${m[1].padEnd(12)}]`]);
  if ((m = src.match(/^"(.*)"$/))) return part('input', 'Input', [`[ ${m[1]}${'_'.repeat(Math.max(2, 14 - m[1].length))} ]`]);
  if ((m = src.match(/^\[(.+)\]$/))) return part('button', 'Button', [`[ ${m[1].trim()} ]`]);
  return part('text', 'Text', [src]);
}

const table = lines => part('table', 'Table', tableFrame(textCells(lines.join('\n'))));

const FLOW = /\s*(?:->|→)\s*/;
const isFlow = line => !isMessage(line) && FLOW.test(line) && line.split(FLOW).every(Boolean);

// `a -> b -> c` lines, one flow a line, become boxes and pinned arrows. Each node sits in the column of its
// longest path from a start, so a flow reads left to right and branches stack under each other.
// ponytail: longest-path layers, no crossing reduction; a back edge (a cycle) is drawn but may cross boxes.
// The layout is recursive and quadratic, so a flowchart stops taking lines at 200 steps.
const MAX_STEPS = 200;
export function flowchart(lines, startRow = 1, startCol = 2) {
  const names = [], edges = [];
  for (const line of lines) {
    if (names.length >= MAX_STEPS) break;
    const steps = line.split(FLOW).map(s => s.trim());
    for (const s of steps) if (!names.includes(s)) names.push(s);
    for (let i = 1; i < steps.length; i++) if (steps[i - 1] !== steps[i] && !edges.some(([a, b]) => a === steps[i - 1] && b === steps[i])) edges.push([steps[i - 1], steps[i]]);
  }
  // An edge back to a step still on the walk is a loop; the rest decide the columns.
  const loops = new Set(), seen = new Map();
  const walk = n => {
    seen.set(n, 1);
    for (const e of edges) if (e[0] === n) { if (seen.get(e[1]) === 1) loops.add(e); else if (!seen.has(e[1])) walk(e[1]); }
    seen.set(n, 2);
  };
  for (const n of names) if (!seen.has(n)) walk(n);
  const depth = new Map(names.map(n => [n, 0]));
  for (let pass = 0; pass < names.length; pass++)
    for (const e of edges) if (!loops.has(e)) depth.set(e[1], Math.max(depth.get(e[1]), depth.get(e[0]) + 1));
  const layers = [];
  for (const n of names) (layers[depth.get(n)] ||= []).push(n);
  const nodes = new Map();
  let col = startCol;
  layers.forEach((layer, l) => {
    if (!layer) return;
    // An arrow that skips this column runs along its source's middle row, so keep that row free here.
    const busy = new Set(edges.filter(([a, b]) => depth.get(a) < l && l < depth.get(b) && nodes.has(a))
      .map(([a]) => nodes.get(a).row + 1));
    let slot = 0, width = 0;
    for (const n of layer) {
      while (busy.has(startRow + slot * 5 + 1)) slot++;
      const template = nodeFrame(n), w = [...template[0]].length;
      nodes.set(n, createElement({ id: 'node', label: 'Node', template, width: w, height: template.length, text: n }, col, startRow + slot * 5));
      slot++; width = Math.max(width, w);
    }
    col += width + 6;
  });
  const els = [...nodes.values()], arrows = [];
  for (const e of edges) {
    const s = nodes.get(e[0]), t = nodes.get(e[1]), mid = el => el.row + Math.floor(el.height / 2);
    const bottom = el => ({ col: el.col + Math.floor(el.width / 2), row: el.row + el.height - 1 });
    arrows.push(loops.has(e) ? createLine(els, bottom(s), bottom(t), 'below')
      : createLine(els, { col: s.col + s.width - 1, row: mid(s) }, { col: t.col, row: mid(t) }, true));
  }
  return [...els, ...arrows];
}

export function parseSketch(source, startRow = 1, startCol = 2) {
  const raw = String(source).replace(/\r\n?/g, '\n').split('\n'), lines = raw.map(l => l.trim());
  const elements = [];
  let row = startRow;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) { if (elements.length) row += 1; continue; }
    // An indented `- ` list, two lines or more with something nested, is a tree.
    let end = i;
    while (isTreeLine(raw[end + 1] || '')) end++;
    if (isTreeLine(raw[i]) && end > i && raw.slice(i, end + 1).some(l => /^\s+-/.test(l))) {
      const text = raw.slice(i, end + 1).join('\n'), p = part('tree', 'Tree', treeFrame(text), { text });
      elements.push(createElement(p, startCol, row));
      row += p.height + 1;
      i = end;
      continue;
    }
    if (isMessage(line)) {
      const msgs = [line];
      while (isMessage(lines[i + 1] || '')) msgs.push(lines[++i]);
      const p = part('sequence', 'Sequence', sequenceFrame(msgs.join('\n')), { text: msgs.join('\n') });
      elements.push(createElement(p, startCol, row));
      row += p.height + 1;
      continue;
    }
    if (isFlow(line)) {
      const flow = [line];
      while (isFlow(lines[i + 1] || '')) flow.push(lines[++i]);
      const els = flowchart(flow, row, startCol);
      elements.push(...els);
      row = Math.max(maxOf(els.map(e => e.row + e.height))) + 1;
      continue;
    }
    let parts;
    if (/^-{3,}$/.test(line)) parts = [part('divider', 'Divider', ['─'.repeat(40)])];
    else if (/^#\s+/.test(line)) {
      const words = line.replace(/^#\s+/, '');
      parts = [part('banner', 'Banner', bannerText(words), { text: words })];
    } else if (/^\|.*\|$/.test(line)) {
      const rows = [line];
      while (/^\|.*\|$/.test(lines[i + 1] || '')) rows.push(lines[++i]);
      parts = [table(rows)];
    } else parts = line.split(/\s{2,}/).map(chunk);
    let col = startCol;
    for (const p of parts) { elements.push(createElement(p, col, row)); col += p.width + 2; }
    row += Math.max(maxOf(parts.map(p => p.height))) + 1;
  }
  return elements;
}

// The way back: a wireframe as typed syntax. Parts the syntax has no word for (cards, nav bars,
// arrows) are left out and named in `skipped`, so a round trip never invents anything.
const BACK = {
  button: t => `[${t.match(/^\[\s*(.*?)\s*\]$/)?.[1] || 'OK'}]`,
  input: t => `"${t.match(/^\[\s*(.*?)_*\s*\]$/)?.[1] ?? ''}"`,
  select: t => `[v ${t.match(/^\[▾\s*(.*?)\s*\]$/)?.[1] || 'Choose'}]`,
  checkbox: t => { const m = t.match(/^\[(.)\]\s*(.*)$/); return m && `[${m[1] === ' ' ? ' ' : 'x'}] ${m[2] || 'Label'}`; },
  radio: t => { const m = t.match(/^\((.)\)\s*(.*)$/); return m && `(${m[1] === ' ' ? ' ' : 'o'}) ${m[2] || 'Option'}`; },
  divider: () => '---',
};

function back(el) {
  if (el.presetId === 'banner') return [`# ${el.text ?? el.label}`];
  if (el.presetId === 'sequence' || el.presetId === 'tree') return el.text ? el.text.split('\n') : null;
  if (el.presetId === 'text') return [el.template.map(l => l.trim()).filter(Boolean).join(' ')];
  if (el.presetId === 'table') return tableCells(el.template).map(r => `| ${r.join(' | ')} |`);
  const line = BACK[el.presetId]?.(el.template[0]);
  return line ? [line] : null;
}

export function toSketch(elements) {
  const skipped = [];
  const rows = new Map();
  const nodes = new Map(elements.filter(e => e.presetId === 'node').map(e => [e.id, e]));
  const flow = elements.filter(e => e.presetId === 'line' && nodes.has(e.from?.id) && nodes.has(e.to?.id))
    .map(e => `${nodes.get(e.from.id).text} -> ${nodes.get(e.to.id).text}`);
  if (flow.length) {
    const top = Math.min(minOf([...nodes.values()].map(n => n.row)));
    const height = Math.max(maxOf([...nodes.values()].map(n => n.row + n.height))) - top;
    rows.set(top, { inline: [], blocks: flow, height });
  } else skipped.push(...[...nodes.values()].map(n => n.label));
  for (const el of [...elements].sort((a, b) => a.row - b.row || a.col - b.col)) {
    if (el.presetId === 'node' || (el.presetId === 'line' && nodes.has(el.from?.id) && nodes.has(el.to?.id))) continue;
    const lines = back(el);
    if (!lines) { skipped.push(el.label); continue; }
    if (!rows.has(el.row)) rows.set(el.row, { inline: [], blocks: [], height: 0 });
    const r = rows.get(el.row);
    r.height = Math.max(r.height, el.height);
    // A table is several lines, so it takes its own lines under the row's other parts.
    if (['table', 'sequence', 'tree'].includes(el.presetId)) r.blocks.push(...lines); else r.inline.push(lines[0]);
  }
  const out = [];
  let next = null;
  for (const [row, r] of [...rows].sort((a, b) => a[0] - b[0])) {
    if (next !== null) out.push(...Array(Math.min(2, Math.max(0, row - next))).fill(''));
    if (r.inline.length) out.push(r.inline.join('  '));
    out.push(...r.blocks);
    next = row + r.height + 1;
  }
  return { source: out.join('\n'), skipped };
}

// The syntax in one breath, for agents (the MCP tool description) and the in-app sheet.
export const SYNTAX_HELP =
  'One line per row. # Title draws a banner. "Email" is an input. [Sign in] is a button. [x] Label and [ ] Label are ' +
  'checkboxes, (o) Label and ( ) Label are radios. [v Country] is a select. --- is a divider. | a | b | lines make ' +
  'a table, the first row is the header. a -> b -> c draws a flowchart, one flow a line. A -> B: message lines draw a sequence diagram (--> for a reply). An indented - list draws a tree. Anything else is text. Put two or more spaces between parts on one line.';

// Screen templates: a named Screen frame with a typed screen inside it. Placing one drops the frame and its parts.
const TEMPLATES = [
  ['Sign in', '# Sign in\n"Email"\n"Password"\n[x] Remember me\n[Sign in]  [Create account]'],
  ['Settings', '# Settings\n[x] Notifications\n[ ] Dark mode\n[v English]\n---\n[Sign out]'],
  ['List', '# Inbox\n"Search"\n| From | Subject |\n| Ada | Lunch? |\n| Grace | The build |\n| Alan | Notes |'],
  ['Detail', '# Lunch\nFrom Ada, 12:04\n---\nAre you free at one?\nThe usual place.\n[Reply]  [Archive]'],
  ['Empty state', '# Inbox\n\n\nNothing here yet.\nNew mail shows up here.\n\n[Compose]'],
];

export function screenTemplate(name, source, col = 0, row = 0) {
  const parts = parseSketch(source, row + 2, col + 3);
  const width = Math.max(32, Math.max(maxOf(parts.map(p => p.col + p.width))) - col + 3);
  const height = Math.max(maxOf(parts.map(p => p.row + p.height))) - row + 2;
  const frame = { ...createElement({ id: 'screen', label: 'Screen', template: screenFrame(name, width, height), width, height, text: name }, col, row) };
  return [frame, ...parts];
}

// Palette entries for the templates. The template shown is the whole screen, so the palette and the
// placing preview show what lands.
export const SCREEN_TEMPLATES = TEMPLATES.map(([name, source]) => {
  const els = screenTemplate(name, source);
  const lines = trimText(gridToText(renderElements(els, els[0].width, els[0].height))).split('\n');
  return { id: `template-${name.toLowerCase().replace(/\s+/g, '-')}`, label: name, category: 'Screens', source, name,
    template: lines, width: els[0].width, height: els[0].height };
});
