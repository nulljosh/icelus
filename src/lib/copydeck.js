import { CHARTS, tableCells } from './lines.js';
import { updateElement } from './engine.js';

// Copy deck (v52): every piece of words on the canvas in one list. An entry is one run of words on one line of a
// part (the OK in [ OK ]), so editing it swaps just those characters and the frame around them stays. Parts that
// keep their words apart from their characters (screens, banners, nodes) are read from those words.
// ios/App/CopyDeck.swift is the twin.
const SKIP = new Set(['line', 'paint', 'adjust', 'fill', 'photo', 'boxy', ...CHARTS]);
const RUN = /[\p{L}\p{N}](?:[\p{L}\p{N}'’.,!?:;&@%$/+-]| (?=[\p{L}\p{N}]))*/gu;
export const COPY_MAX = 200;

const ownWords = el => typeof el.text === 'string' && el.presetId !== 'table';
const linesOf = el => (ownWords(el) ? el.text.split('\n') : el.template);

export function copyEntries(elements) {
  const out = [];
  elements.forEach((el, part) => {
    if (SKIP.has(el.presetId) || el.hidden || el.canvas) return;
    linesOf(el).forEach((line, row) => {
      for (const m of line.matchAll(RUN)) {
        if (out.length < COPY_MAX) out.push({ key: `${part}:${row}:${m.index}`, id: el.id, part, row, start: m.index, text: m[0], label: el.label });
      }
    });
  });
  return out;
}

// edits: { key: new words }. Keys come from copyEntries on the same list; each part is rewritten once, with its
// edits applied right to left so earlier starts stay true.
export function applyCopy(elements, edits) {
  const entries = copyEntries(elements).filter(e => typeof edits?.[e.key] === 'string' && edits[e.key] !== e.text);
  if (!entries.length) return elements;
  let out = elements;
  for (const id of new Set(entries.map(e => e.id))) {
    const el = out.find(x => x.id === id), lines = [...linesOf(el)];
    for (const e of entries.filter(x => x.id === id).sort((a, b) => b.row - a.row || b.start - a.start)) {
      const words = edits[e.key].replace(/[\r\n]+/g, ' ').slice(0, 200);
      lines[e.row] = lines[e.row].slice(0, e.start) + words + lines[e.row].slice(e.start + e.text.length);
    }
    out = updateElement(out, id, el.presetId === 'table' ? { cells: tableCells(lines) } : { text: lines.join('\n') });
  }
  return out;
}

// Translate it: the strings go to the model as one JSON array and must come back as one, the same length.
export function translateMessages(strings, language) {
  return [
    { role: 'system', content: `You translate the words on an app screen into ${language}. You get a JSON array of strings. Reply with only a JSON array of the same length, each string translated, short like the original, keeping numbers, names and symbols. No other text.` },
    { role: 'user', content: JSON.stringify(strings) },
  ];
}

export function cleanTranslation(reply, strings) {
  const raw = typeof reply === 'string' ? reply : JSON.stringify(reply ?? '');
  const json = raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1);
  let list;
  try { list = JSON.parse(json); } catch { return null; }
  if (!Array.isArray(list) || list.length !== strings.length) return null;
  return list.map((s, i) => (typeof s === 'string' && s.trim() ? s.trim().slice(0, 200) : strings[i]));
}

// What /api/translate takes: at most COPY_MAX strings of 200 characters, 8,000 in all.
export function cleanStrings(v) {
  if (!Array.isArray(v) || !v.length || v.length > COPY_MAX) return null;
  if (!v.every(s => typeof s === 'string' && s.length <= 200)) return null;
  return v.join('').length <= 8000 ? v : null;
}
