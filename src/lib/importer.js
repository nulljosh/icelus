// Any text wireframe back into parts: boxes are found by their corners and edges, the text outside them
// becomes text parts (a [ bracketed ] run becomes a button). Drawing the parts gives back the same text,
// so a pasted sketch from a README or a chat is editable and nothing about it changes until you edit it.
// Ported line for line in ios/App/Import.swift.

import { createElement } from './engine.js';

const TL = new Set('┌╭┏╔+'), TR = new Set('┐╮┓╗+'), BL = new Set('└╰┗╚+'), BR = new Set('┘╯┛╝+');
const H = new Set('─━═-+┬┴┼┳┻╋╦╩╬╤╧');
const V = new Set('│┃║|+├┤┼┣┫╋╠╣╬╟╢');

export function findBoxes(g) {
  const at = (r, c) => g[r]?.[c] ?? ' ';
  const boxes = [];
  for (let r = 0; r < g.length; r++) {
    for (let c = 0; c < g[r].length; c++) {
      if (!TL.has(at(r, c)) || !H.has(at(r, c + 1)) || !(V.has(at(r + 1, c)) || BL.has(at(r + 1, c)))) continue;
      // The top edge may carry a title (┌─ Home ───┐), so look for the corner along the row.
      let c2 = c + 1;
      while (c2 < g[r].length && !TR.has(at(r, c2)) && !V.has(at(r, c2)) && !TL.has(at(r, c2))) c2++;
      if (!TR.has(at(r, c2))) continue;
      let r2 = r + 1;
      while (V.has(at(r2, c)) && !BL.has(at(r2, c))) r2++;
      if (!BL.has(at(r2, c)) || !BR.has(at(r2, c2))) continue;
      let closed = true;
      for (let x = c + 1; x < c2 && closed; x++) closed = H.has(at(r2, x));
      for (let y = r + 1; y < r2 && closed; y++) closed = V.has(at(y, c2));
      if (closed) boxes.push({ r, c, r2, c2 });
    }
  }
  return boxes;
}

// Box corners that open a box that never closes: the usual damage when a wireframe in a README is edited
// by hand. Each is { row, col }, 0-based. ASCII + is left out, since it is also an ordinary character.
export function brokenBoxes(text) {
  const g = String(text).replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n').map(l => [...l]);
  const boxes = findBoxes(g);
  const broken = [];
  g.forEach((chars, r) => chars.forEach((ch, c) => {
    if (TL.has(ch) && ch !== '+' && !boxes.some(b => b.r === r && b.c === c)) broken.push({ row: r, col: c });
  }));
  return broken;
}

export function importText(text, startRow = 0, startCol = 0) {
  const lines = String(text).replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
  while (lines.length && !lines.at(-1).trim()) lines.pop();
  const g = lines.map(l => [...l]);
  // Outer boxes first, so inner ones draw on top of them.
  const boxes = findBoxes(g).sort((a, b) => (b.r2 - b.r) * (b.c2 - b.c) - (a.r2 - a.r) * (a.c2 - a.c));
  const inside = (b, r, c) => r >= b.r && r <= b.r2 && c >= b.c && c <= b.c2;
  // A box with dividers inside it (a table) keeps its contents. Any other box hands them out as parts.
  const divided = b => [b.r, b.r2].some(r => g[r].slice(b.c + 1, b.c2).some(ch => '┬┴┼┳┻╋╦╩╬╤╧'.includes(ch)))
    || g.slice(b.r + 1, b.r2).some(row => '├┣╠╟'.includes(row[b.c]));
  const whole = boxes.filter(divided);
  const border = (b, r, c) => inside(b, r, c) && (r === b.r || r === b.r2 || c === b.c || c === b.c2);
  const held = (r, c) => boxes.some(b => border(b, r, c)) || whole.some(b => inside(b, r, c));
  const elements = boxes.map((b, i) => {
    const template = [];
    for (let r = b.r; r <= b.r2; r++) {
      let row = '';
      for (let c = b.c; c <= b.c2; c++) {
        const keep = border(b, r, c) || (whole.includes(b) && !boxes.slice(i + 1).some(o => inside(o, r, c)));
        row += keep ? (g[r][c] ?? ' ') : ' ';
      }
      template.push(row);
    }
    return createElement({ id: 'box', label: 'Box', template, width: b.c2 - b.c + 1, height: b.r2 - b.r + 1 }, startCol + b.c, startRow + b.r);
  });
  // Everything else: runs split by two or more spaces, or by a box edge.
  g.forEach((chars, r) => {
    let c = 0;
    while (c < chars.length) {
      if (chars[c] === ' ' || held(r, c)) { c++; continue; }
      let end = c;
      while (end < chars.length && !held(r, end) && !(chars[end] === ' ' && (chars[end + 1] ?? ' ') === ' ')) end++;
      const run = chars.slice(c, end).join('').trimEnd();
      const button = /^\[[^\]]*[^\]x✓ ][^\]]*\]$/u.test(run) && !/^\[[ x✓]\] /u.test(run);
      elements.push(createElement({ id: button ? 'button' : 'text', label: button ? 'Button' : 'Text', template: [run],
        width: [...run].length, height: 1 }, startCol + c, startRow + r));
      c = end;
    }
  });
  return elements;
}
