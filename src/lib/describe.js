// Describe it: a chat turn in, typed lines out. The model writes Icelus's typed syntax (syntax.js), which
// the app already turns into a screen, so the model never touches the project file and every answer is
// checked by the same parser people type into. Used by POST /api/describe; pure, so it is tested here.

import { SYNTAX_HELP } from './syntax.js';

export const MAX_MESSAGE = 2000;
export const MAX_TURNS = 6;
const MAX_CURRENT = 4000;

const SYSTEM = `You design app screens for Icelus. Reply with the screen only, written in this syntax, no prose and no code fences.
${SYNTAX_HELP}
Write every field as its label in double quotes, like "Email", never as underscores. Start with one "# Title" line naming the screen. Use real words, never "Label" or "Click here". A setting is a checkbox with its name, like [x] Notifications, never a field. Give every form an error
line (like "That password is wrong.") and every list an empty state line. Keep it to one screen of about 6 to 14 lines.`;

// Into a picked area: the same syntax, but only what was asked, sized to the area (the # title is dropped on place).
const AREA_SYSTEM = a => `You design one part of an app screen for Icelus. Reply in this syntax only, no prose and no code fences.
${SYNTAX_HELP}
Write every field as its label in double quotes. Start with one "# Title" line. Then draw only what the person asked for, nothing else:
no extra fields, no error line, no empty state. It must fit in ${a.width} columns and ${a.height} rows.`;
const cleanArea = a => (a && Number.isInteger(a.width) && Number.isInteger(a.height) && a.width > 0 && a.height > 0 && a.width <= 500 && a.height <= 500 ? a : null);

const clip = (s, n) => String(s ?? '').slice(0, n);

/** The messages for the model: the rules, a few earlier turns, then this ask (with the screen being changed). */
export function describeMessages(message, { history = [], current = '', area = null } = {}) {
  const ask = clip(message, MAX_MESSAGE).trim();
  if (!ask) return null;
  const turns = (Array.isArray(history) ? history : [])
    .filter(t => t && (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string')
    .slice(-MAX_TURNS).map(t => ({ role: t.role, content: clip(t.content, MAX_MESSAGE) }));
  const now = current ? `Here is the screen now:\n${clip(current, MAX_CURRENT)}\n\nChange it: ${ask}\nReply with the whole changed screen.` : ask;
  const a = cleanArea(area);
  return [{ role: 'system', content: a ? AREA_SYSTEM(a) : SYSTEM }, ...turns, { role: 'user', content: now }];
}

/** The typed lines in a model's reply: fences, prose before the title and trailing chatter dropped. */
export function cleanReply(text) {
  let lines = String(text ?? '').replace(/\r/g, '').split('\n').filter(l => !/^\s*```/.test(l));
  const title = lines.findIndex(l => /^#\s+\S/.test(l));
  // No title means the model answered in prose (or was talked out of its rules), not with a screen.
  if (title < 0) return '';
  lines = lines.slice(title);
  while (lines.length && !lines.at(-1).trim()) lines.pop();
  // A field written as "Name: ____" becomes the field it means.
  return lines.slice(0, 60).map(l => l.slice(0, 200).replace(/^\s*([^"\[\]:]{1,40}?):?\s*_{3,}\s*$/, '"$1"')).join('\n').trim();
}

// Describe into a selection: the box around the cells the marquee or wand picked, the hint the model gets, and
// the parts of the described screen moved so their top left sits on the box's top left (no screen frame).
export function cellArea(cells) {
  if (!cells?.length) return null;
  const cs = cells.map(c => c[0]), rs = cells.map(c => c[1]);
  const col = Math.min(...cs), row = Math.min(...rs);
  return { col, row, width: Math.max(...cs) - col + 1, height: Math.max(...rs) - row + 1 };
}
export const areaHint = area => `This is not a whole screen: it fills an area ${area.width} columns wide and ${area.height} rows tall inside one. Still start with a # line, but draw only what was asked, nothing more: no extra fields, no error line, no empty state.`;
export function intoArea(all, area) {
  const parts = all.filter((p, i) => !(i === 0 && p.presetId === 'banner')); // the # title names a screen, not an area
  if (!parts.length) return parts;
  const dCol = area.col - Math.min(...parts.map(p => p.col)), dRow = area.row - Math.min(...parts.map(p => p.row));
  return parts.map(p => ({ ...p, col: p.col + dCol, row: p.row + dRow }));
}
