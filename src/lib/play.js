import { partsInside, carry } from './lines.js';
import { canOpen, opensScreen, partWords } from './hotspots.js';
import { realPart } from './real.js';

// Play mode (v54): click through linked screens like a real app. One screen is shown on its own, moved to the
// top left, and a press on a hotspot (hotspots.js) opens the screen it names. ios/App/Play.swift is the twin.
export const playScreens = elements => elements.filter(el => el.presetId === 'screen' && !el.hidden)
  .sort((a, b) => a.row - b.row || a.col - b.col);

// Where play starts: the picked screen, or the screen holding the picked part, else the first screen.
export function startScreen(elements, selectedId) {
  const screens = playScreens(elements), sel = elements.find(el => el.id === selectedId);
  return (sel && screens.find(s => s === sel || partsInside([sel], s).length)) || screens[0] || null;
}

// One screen to play: it and what sits inside it, shifted so the screen is at 0,0 (the canvas part comes too,
// so its line mode still applies), plus its hotspots with the words to read out.
export function playView(elements, screenId) {
  const screen = elements.find(el => el.id === screenId && el.presetId === 'screen' && !el.hidden);
  if (!screen) return null;
  const shift = el => carry(el, -screen.col, -screen.row);
  const inside = partsInside(elements, screen).filter(el => !el.hidden).map(shift);
  const spots = inside.flatMap(el => {
    const to = canOpen(el) && opensScreen(elements, el);
    return to && !to.hidden && to.id !== screen.id ? [{ id: el.id, col: el.col, row: el.row, width: el.width, height: el.height, to: to.id, label: partWords(el), ...(el.move && { move: el.move }) }] : [];
  });
  return { id: screen.id, title: screen.text || 'Screen', cols: screen.width, rows: screen.height, spots,
    elements: [shift(screen), ...inside, ...elements.filter(el => el.canvas)] };
}

// The hotspot under a cell of the shown screen, topmost first, or null.
export const spotAt = (view, col, row) => view?.spots.findLast(s => col >= s.col && col < s.col + s.width && row >= s.row && row < s.row + s.height) ?? null;

// An agent plays a flow: start on a screen, press hotspots by part id in turn. Returns the screens visited, or
// the step where a press was not a hotspot on the screen shown at the time.
export function playPath(elements, startId, presses) {
  let view = playView(elements, startId);
  if (!view) return { error: 'start must be a screen that is shown' };
  const path = [view];
  for (const [i, id] of presses.entries()) {
    const spot = view.spots.find(s => s.id === id);
    if (!spot) return { path, error: `press ${i} is not a hotspot on ${view.title}` };
    view = playView(elements, spot.to);
    path.push(view);
  }
  return { path };
}

// Live parts (v55): while playing, controls work. Their state lives in the play session only, never in the
// project: { [part id]: value }, where a value is on or off, an index, a count, a column or typed words.
const LIVE = { checkbox: 'tick', radio: 'pick', toggle: 'flip', segmented: 'choose', tabs: 'choose', rating: 'rate',
  slider: 'slide', input: 'type', search: 'type', textarea: 'type' };
export const liveKind = el => (el && !el.opens ? LIVE[el.presetId] ?? null : null); // a hotspot is pressed, not played
export const TYPE_MAX = 500;
const stars = el => (el.template[0] ?? '').match(/[★☆]+/);

// What a live part shows before anyone touches it, read from its characters.
export function liveStart(el) {
  const p = realPart(el);
  switch (liveKind(el)) {
    case 'tick': case 'pick': case 'flip': return !!p?.on;
    case 'choose': return p?.at ?? 0;
    case 'rate': return [...(stars(el)?.[0] ?? '')].filter(c => c === '★').length;
    case 'slide': return Math.max(0, [...(el.template[0] ?? '')].indexOf('●'));
    case 'type': return '';
    default: return undefined;
  }
}
const now = (el, state) => (el.id in state ? state[el.id] : liveStart(el));

// A press on a live part, dCol cells from its left edge (null from the keyboard, which steps to the next value).
// Returns the new state; picking a radio clears the other radios on the screen.
export function pressLive(view, state, id, dCol = null) {
  const el = view.elements.find(x => x.id === id), kind = liveKind(el);
  if (!kind) return state;
  const v = now(el, state);
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  switch (kind) {
    case 'tick': case 'flip': return { ...state, [id]: !v };
    case 'pick': return { ...state, ...Object.fromEntries(view.elements.filter(x => x.presetId === 'radio').map(x => [x.id, false])), [id]: true };
    case 'choose': {
      const n = realPart(el)?.items?.length || 1;
      return { ...state, [id]: dCol == null ? (v + 1) % n : clamp(Math.floor(dCol / (el.width / n)), 0, n - 1) };
    }
    case 'rate': {
      const run = stars(el), len = run ? [...run[0]].length : 0;
      return { ...state, [id]: dCol == null ? (v % len) + 1 : clamp(dCol - (run?.index ?? 0) + 1, 1, len) };
    }
    case 'slide': {
      const len = [...(el.template[0] ?? '')].length;
      return { ...state, [id]: dCol == null ? (v + Math.ceil(len / 10)) % len : clamp(dCol, 0, len - 1) };
    }
    default: return state;
  }
}
export const typeLive = (state, id, words) => ({ ...state, [id]: String(words).slice(0, TYPE_MAX) });

// A live part drawn in its state: the characters rewritten the way the part itself would show it, so the real
// look and the text look both follow. A typed field is drawn empty; the words are typed over it.
export function liveElement(el, state) {
  const kind = liveKind(el);
  if (!kind || !(el.id in state)) return el;
  const v = state[el.id], [t = '', ...rest] = el.template, line = l => ({ ...el, template: [l, ...rest] });
  switch (kind) {
    case 'tick': return line(t.replace(/^\[.\]/, v ? '[✓]' : '[ ]'));
    case 'pick': return line(t.replace(/^\(.\)/, v ? '(●)' : '( )'));
    case 'flip': { const n = Math.max(1, [...t].length - 2); return line(t[0] + (v ? '━'.repeat(n - 1) + '●' : '●' + '━'.repeat(n - 1)) + t.at(-1)); }
    case 'choose': return { ...el, live: v };
    case 'rate': return line(t.replace(/[★☆]+/, run => '★'.repeat(v) + '☆'.repeat([...run].length - v)));
    case 'slide': return line([...t].map((c, i) => (i === v ? '●' : c === '●' ? '─' : c)).join(''));
    case 'type': return v ? { ...el, template: el.template.map(l => l.replace(/[^\s─│┌┐└┘[\]()_]/g, ' ')) } : el;
    default: return el;
  }
}
