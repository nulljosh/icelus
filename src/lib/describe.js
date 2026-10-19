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

const clip = (s, n) => String(s ?? '').slice(0, n);

/** The messages for the model: the rules, a few earlier turns, then this ask (with the screen being changed). */
export function describeMessages(message, { history = [], current = '' } = {}) {
  const ask = clip(message, MAX_MESSAGE).trim();
  if (!ask) return null;
  const turns = (Array.isArray(history) ? history : [])
    .filter(t => t && (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string')
    .slice(-MAX_TURNS).map(t => ({ role: t.role, content: clip(t.content, MAX_MESSAGE) }));
  const now = current ? `Here is the screen now:\n${clip(current, MAX_CURRENT)}\n\nChange it: ${ask}\nReply with the whole changed screen.` : ask;
  return [{ role: 'system', content: SYSTEM }, ...turns, { role: 'user', content: now }];
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
