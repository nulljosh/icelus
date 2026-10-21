// Access check (v51): Review also checks that a screen works for everyone. Focus moves through controls in the
// order they appear in the project, so it must match reading order; a field needs words that name it; a control
// needs room to be tapped; ink on its paper must read at 4.5 to 1. ios/App/Access.swift is the twin.
import { COLORS, cleanColor } from './color.js';

export const CONTROLS = new Set(['button', 'input', 'select', 'checkbox', 'radio', 'toggle', 'search', 'segmented', 'slider',
  'textarea', 'stepper', 'datepicker', 'rating', 'ios-switch', 'md-fab', 'email-button']);
const FIELDS = new Set(['input', 'select', 'search', 'textarea', 'datepicker']);
export const MIN_TARGET = 5; // cells: about 44 points at the default size
export const MIN_CONTRAST = 4.5; // WCAG AA for text

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const linear = c => (c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const luminance = hex => { const [r, g, b] = rgb(hex).map(linear); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
/** WCAG contrast ratio of two hex colors, 1 to 21. */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
/** The terminal color nearest the ink (by RGB) that reads at 4.5 to 1 or better on the paper. Black or white always does. */
export function nearestReadable(ink, paper) {
  const from = rgb(COLORS[ink].hex), paperHex = COLORS[paper].hex;
  const dist = i => rgb(COLORS[i].hex).reduce((s, v, k) => s + (v - from[k]) ** 2, 0);
  const passing = COLORS.map((_, i) => i).filter(i => contrast(COLORS[i].hex, paperHex) >= MIN_CONTRAST);
  return passing.reduce((best, i) => (dist(i) < dist(best) ? i : best));
}

const words = el => /[\p{L}\p{N}]/u.test(el.template.join('').replace(/[▾]/gu, ''));
const reading = (a, b) => a.row - b.row || a.col - b.col;
// Reading order screen by screen: the screens left to right and top to bottom, then within each screen.
function byScreen(elements) {
  const screens = elements.filter(el => el.presetId === 'screen').sort(reading);
  const rank = el => screens.findIndex(s => el.col >= s.col && el.row >= s.row && el.col + el.width <= s.col + s.width && el.row + el.height <= s.row + s.height);
  return (a, b) => rank(a) - rank(b) || reading(a, b);
}
const rowsMeet = (a, b) => a.row < b.row + b.height && b.row < a.row + a.height;
const colsMeet = (a, b) => a.col < b.col + b.width && b.col < a.col + a.width;

// A field is named by its own words, or by words just left of it on its rows or in the two rows above it.
function named(el, shown) {
  if (words(el)) return true;
  return shown.some(o => !CONTROLS.has(o.presetId) && o.presetId !== 'screen' && words(o)
    && ((rowsMeet(o, el) && o.col + o.width <= el.col && el.col - (o.col + o.width) <= 4)
      || (colsMeet(o, el) && o.row + o.height <= el.row && el.row - (o.row + o.height) <= 1)));
}

export function accessIssues(shown) {
  const issues = [], controls = shown.filter(el => CONTROLS.has(el.presetId)), order = byScreen(shown);
  const out = controls.find((el, i) => i > 0 && order(controls[i - 1], el) > 0);
  if (out) issues.push({ rule: 'focus_order', el: out });
  for (const el of shown) {
    const ink = cleanColor(el.ink), paper = cleanColor(el.paper);
    if (ink !== undefined && paper !== undefined && contrast(COLORS[ink].hex, COLORS[paper].hex) < MIN_CONTRAST) {
      issues.push({ rule: 'low_contrast', el, color: COLORS[nearestReadable(ink, paper)].name });
    }
  }
  for (const el of controls) {
    if (FIELDS.has(el.presetId) && !named(el, shown)) issues.push({ rule: 'no_label', el });
    if (el.width < MIN_TARGET) issues.push({ rule: 'small_target', el, kind: 'narrow' });
    else if (controls.some(o => o !== el && reading(o, el) < 0
      && ((rowsMeet(o, el) && (el.col === o.col + o.width || o.col === el.col + el.width))
        || (colsMeet(o, el) && el.row === o.row + o.height)))) issues.push({ rule: 'small_target', el, kind: 'crowded' });
  }
  return issues;
}

// One tap puts the controls in reading order. Everything else keeps its place in the list.
export function fixFocusOrder(elements) {
  const at = elements.map((el, i) => (CONTROLS.has(el.presetId) ? i : -1)).filter(i => i >= 0);
  const sorted = at.map(i => elements[i]).sort(byScreen(elements));
  const out = [...elements];
  at.forEach((i, k) => { out[i] = sorted[k]; });
  return out.every((el, i) => el === elements[i]) ? elements : out;
}
