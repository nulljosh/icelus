// Hotspots (v53): a part can open a screen. `opens` holds that screen's id, so a click in play mode (v54) knows
// where to go. Screens, lines, paint and adjustments never open anything. ios/App/Hotspots.swift is the twin.
const NEVER = new Set(['screen', 'line', 'paint', 'adjust']);
export const canOpen = el => !!el && !NEVER.has(el.presetId);
const isScreen = (elements, id) => elements.some(s => s.id === id && s.presetId === 'screen');

// The screen a part opens, or null when it opens none or that screen is gone.
export function opensScreen(elements, el) {
  return el?.opens ? elements.find(s => s.id === el.opens && s.presetId === 'screen') ?? null : null;
}

// Point a part at a screen, or null to take the link off. Anything but a part and a screen is refused.
export function setOpens(elements, id, screenId) {
  const el = elements.find(x => x.id === id);
  if (!canOpen(el) || el.opens === screenId) return elements;
  if (screenId == null) { const { opens, ...rest } = el; return elements.map(x => (x === el ? rest : x)); }
  return isScreen(elements, screenId) ? elements.map(x => (x === el ? { ...el, opens: screenId } : x)) : elements;
}

const at = (screens, col, row) => screens.find(s => col >= s.col && col < s.col + s.width && row >= s.row && row < s.row + s.height);
const name = s => s.text || 'Screen';
export const partWords = el => (el.text ?? el.template.join(' ')).replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim() || el.label;

// Every way from one screen to another, as Markdown list lines: arrows drawn between screens, then hotspots,
// which name the part you press. Used by Copy all screens and the build brief.
export function flowLines(elements) {
  const screens = elements.filter(el => el.presetId === 'screen');
  const arrows = elements.filter(el => el.presetId === 'line' && el.from && el.to)
    .map(el => [at(screens, el.from.col, el.from.row), at(screens, el.to.col, el.to.row)])
    .filter(([a, b]) => a && b && a !== b).map(([a, b]) => `- ${name(a)} → ${name(b)}`);
  const spots = elements.map(el => [el, at(screens, el.col, el.row), opensScreen(elements, el)])
    .filter(([el, a, b]) => canOpen(el) && a && b && a !== b).map(([el, a, b]) => `- ${name(a)} → ${name(b)} (${partWords(el)})`);
  return [...new Set([...arrows, ...spots])];
}
