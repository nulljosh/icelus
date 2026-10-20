import { screenTemplate } from './syntax.js';
import { setOpens } from './hotspots.js';
import { DEFAULT_COLS, DEFAULT_ROWS } from './engine.js';
import { maxOf } from './extent.js';

// Files (Joshua 2026-10-19: "create multiple files in the app, and templates for new file, not just blank").
// The open file is the working canvas; a library keeps every file's project JSON by id, and an index keeps the
// names, newest first. A new file starts blank or from a template: a few screens side by side, their buttons
// already linked (hotspots.js) so Play walks the flow at once. ios/App/Files.swift is the twin.
export const FILES_MAX = 100, NAME_MAX = 60;

// [screen name, typed lines] per screen, then links: [from screen, words on the button, to screen].
export const FILE_TEMPLATES = [
  { id: 'blank', name: 'Blank', screens: [], links: [] },
  { id: 'sign-in', name: 'Sign in', screens: [
    ['Sign in', '# Welcome back\n"Email"\n"Password"\n[x] Remember me\n[Sign in]  [Create account]'],
    ['Create account', '# Create account\n"Name"\n"Email"\n"Password"\n[x] I agree to the terms\n[Create account]  [Back]'],
    ['Home', '# Home\nYou are signed in.\n---\n[Settings]  [Sign out]'],
  ], links: [[0, 'Sign in', 2], [0, 'Create account', 1], [1, 'Create account', 2], [1, 'Back', 0], [2, 'Sign out', 0]] },
  { id: 'onboarding', name: 'Onboarding', screens: [
    ['Welcome', '# Welcome\nSketch a screen in a minute.\nShare it as plain text.\n\n[Next]'],
    ['Notifications', '# Stay in the loop\nWe tell you when a teammate\nleaves a note.\n[x] Allow notifications\n[Next]  [Skip]'],
    ['Ready', '# You are all set\nYour first screen is waiting.\n\n[Start]'],
  ], links: [[0, 'Next', 1], [1, 'Next', 2], [1, 'Skip', 2]] },
  { id: 'settings', name: 'Settings', screens: [
    ['Settings', '# Settings\n[Account]\n[x] Notifications\n[ ] Dark mode\n[v English]\n---\n[Sign out]'],
    ['Account', '# Account\n"Name"\n"Email"\n[Save]  [Back]'],
  ], links: [[0, 'Account', 1], [1, 'Back', 0], [1, 'Save', 0]] },
  { id: 'inbox', name: 'Inbox', screens: [
    ['Inbox', '# Inbox\n"Search"\n| From | Subject |\n| Ada | Lunch? |\n| Grace | The build |\n[Open]  [Compose]'],
    ['Message', '# Lunch?\nFrom Ada, 12:04\n---\nAre you free at one?\n[Reply]  [Back]'],
    ['Compose', '# New message\n"To"\n"Subject"\n"Message"\n[Send]  [Cancel]'],
  ], links: [[0, 'Open', 1], [0, 'Compose', 2], [1, 'Back', 0], [1, 'Reply', 2], [2, 'Send', 0], [2, 'Cancel', 0]] },
  { id: 'checkout', name: 'Checkout', screens: [
    ['Cart', '# Your cart\n| Item | Price |\n| Lamp | $40 |\n| Rug | $120 |\nTotal $160\n[Check out]'],
    ['Payment', '# Payment\n"Card number"\n"Expiry"  "CVC"\n[x] Save this card\n[Pay $160]  [Back]'],
    ['Done', '# Thank you\nYour order is on its way.\n\n[Keep shopping]'],
  ], links: [[0, 'Check out', 1], [1, 'Pay $160', 2], [1, 'Back', 0], [2, 'Keep shopping', 0]] },
];

const words = el => (el.text ?? el.template.join(' ')).replace(/[[\]]/g, '').trim();

// A template as a project: its screens in a row, six cells apart, linked as listed. Blank is an empty canvas.
export function templateProject(id) {
  const t = FILE_TEMPLATES.find(x => x.id === id) ?? FILE_TEMPLATES[0];
  let col = 2, elements = [];
  const frames = [];
  for (const [name, source] of t.screens) {
    const els = screenTemplate(name, source, col, 2);
    frames.push(els);
    elements.push(...els);
    col += els[0].width + 6;
  }
  for (const [from, label, to] of t.links) {
    const button = frames[from]?.find(el => el.presetId === 'button' && words(el) === label);
    if (button && frames[to]) elements = setOpens(elements, button.id, frames[to][0].id);
  }
  const cols = Math.max(DEFAULT_COLS, maxOf(elements.map(el => el.col + el.width)) + 4);
  const rows = Math.max(DEFAULT_ROWS, maxOf(elements.map(el => el.row + el.height)) + 4);
  return { cols: Math.min(500, cols), rows: Math.min(500, rows), elements };
}

export const fileId = () => `f-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
export const cleanName = name => String(name ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, NAME_MAX);
const ID = /^f-[a-z0-9]{1,32}$/;

// The index from storage, untrusted: { files: [{ id, name, updated }], current }. Bad rows are dropped.
export function cleanIndex(raw) {
  let data = raw;
  if (typeof raw === 'string') { try { data = JSON.parse(raw); } catch { data = null; } }
  const seen = new Set();
  const files = (Array.isArray(data?.files) ? data.files : []).filter(f => f && ID.test(f.id) && !seen.has(f.id) && seen.add(f.id))
    .slice(0, FILES_MAX).map(f => ({ id: f.id, name: cleanName(f.name) || 'Untitled', updated: Number.isFinite(f.updated) ? f.updated : 0 }));
  return { files, current: files.some(f => f.id === data?.current) ? data.current : files[0]?.id ?? null };
}

// A name not already taken: Sign in, then Sign in 2, Sign in 3.
export function uniqueName(index, base) {
  const name = cleanName(base) || 'Untitled', taken = new Set(index.files.map(f => f.name));
  if (!taken.has(name)) return name;
  let n = 2;
  while (taken.has(`${name} ${n}`)) n++;
  return `${name} ${n}`;
}

// Index edits, all pure. A new file goes first and becomes current.
export const addFile = (index, id, name, now = Date.now()) =>
  index.files.length >= FILES_MAX ? index : { files: [{ id, name: uniqueName(index, name), updated: now }, ...index.files], current: id };
export const renameFile = (index, id, name) =>
  ({ ...index, files: index.files.map(f => (f.id === id && cleanName(name) ? { ...f, name: cleanName(name) } : f)) });
export const touchFile = (index, id, now = Date.now()) => ({ ...index, files: index.files.map(f => (f.id === id ? { ...f, updated: now } : f)) });
export function removeFile(index, id) {
  if (index.files.length <= 1) return index; // there is always one file open
  const files = index.files.filter(f => f.id !== id);
  return { files, current: index.current === id ? files[0].id : index.current };
}
