import { partsInside, carry } from './lines.js';
import { canOpen, opensScreen, partWords } from './hotspots.js';

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
    return to && !to.hidden && to.id !== screen.id ? [{ id: el.id, col: el.col, row: el.row, width: el.width, height: el.height, to: to.id, label: partWords(el) }] : [];
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
