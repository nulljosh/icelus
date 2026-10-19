import { describe, it, expect } from 'vitest';
import { createElement, moveElement, duplicateElement, updateElement, renderElements, gridToText, trimText, createLine, screenFrame, partsInside, screensDocument, accentMask, parseProject, serializeProject } from './engine.js';

const screen = (col, row, w = 20, h = 8) =>
  ({ ...createElement({ id: 'screen', label: 'Screen', template: screenFrame('Home', w, h), width: w, height: h }, col, row), text: 'Home' });
const button = (col, row) => createElement({ id: 'button', label: 'Button', template: ['[ OK ]'], width: 6, height: 1 }, col, row);

describe('screens', () => {
  it('draws the name in the top border', () => {
    expect(screenFrame('Home', 12, 3)).toEqual(['┌─ Home ───┐', '│          │', '└──────────┘']);
  });

  it('carries the parts wholly inside it, and leaves a part across the edge', () => {
    const s = screen(0, 0), inside = button(2, 2), across = button(17, 3), outside = button(30, 2);
    const moved = moveElement([s, inside, across, outside], s.id, 40, 5);
    const at = id => moved.find(el => el.id === id);
    expect([at(inside.id).col, at(inside.id).row]).toEqual([42, 7]);
    expect([at(across.id).col, at(outside.id).col]).toEqual([17, 30]);
    expect(partsInside([s, inside, across], s).map(el => el.id)).toEqual([inside.id]);
  });

  it('lets parts show through and keeps an arrow between carried parts pinned', () => {
    const s = screen(0, 0, 30, 10), a = button(2, 2), b = button(20, 6);
    const line = createLine([s, a, b], { col: 3, row: 2 }, { col: 21, row: 6 });
    const els = moveElement([s, a, b, line], s.id, 1, 1);
    const moved = els.find(el => el.id === line.id);
    expect(moved.to.id).toBe(b.id);
    expect(trimText(gridToText(renderElements([s, a], 30, 10)))).toContain('│ [ OK ]');
  });

  it('copies with its parts to the right, the arrow pinned to the copies', () => {
    const s = screen(0, 0, 30, 10), a = button(2, 2), b = button(20, 6);
    const line = createLine([s, a, b], { col: 3, row: 2 }, { col: 21, row: 6 });
    const { elements, id } = duplicateElement([s, a, b, line], s.id, 100, 50);
    expect(elements).toHaveLength(8);
    expect(elements[0].id).toBe(id); // a new frame goes to the back
    const copies = elements.slice(5);
    const lineCopy = copies.find(el => el.presetId === 'line');
    expect(copies.map(el => el.id)).toContain(lineCopy.to.id);
    expect(copies.find(el => el.id === lineCopy.to.id).col).toBe(54);
  });

  it('redraws its frame when renamed or resized', () => {
    const s = screen(0, 0, 12, 3);
    const [renamed] = updateElement([s], s.id, { text: 'Cart' });
    expect(renamed.template[0]).toBe('┌─ Cart ───┐');
    const [bigger] = updateElement([s], s.id, { width: 14, height: 4 });
    expect(bigger.template).toEqual(screenFrame('Home', 14, 4));
  });
});

describe('screens document', () => {
  it('lists the flow between screens, then each screen cropped to its frame', () => {
    const home = { ...screen(0, 0, 12, 4), text: 'Home' }, cart = { ...screen(20, 0, 12, 4), text: 'Cart' };
    cart.template = screenFrame('Cart', 12, 4);
    const go = button(2, 1);
    const arrow = createLine([home, cart, go], { col: 7, row: 1 }, { col: 21, row: 2 });
    const doc = screensDocument([home, cart, go, arrow], 40, 6);
    expect(doc.startsWith('## Flow\n\n- Home → Cart\n\n## Home\n\n```\n┌─ Home ───┐\n│ [ OK')).toBe(true);
    expect(doc).toContain('## Cart\n\n```\n┌─ Cart ───┐');
  });

  it('is null without screens', () => {
    expect(screensDocument([button(0, 0)], 10, 2)).toBeNull();
  });
});

describe('accent highlight', () => {
  it('marks the cells an accented part paints, cleared by a part on top, never in the text', () => {
    const a = { ...button(0, 0), accent: true }, b = button(3, 0);
    const mask = accentMask([a, b], 10, 1);
    expect(mask[0].slice(0, 4)).toEqual([true, true, true, false]);
    expect(trimText(gridToText(renderElements([a], 10, 1)))).toBe('[ OK ]');
  });

  it('toggles on and off, and survives a save', () => {
    const el = button(0, 0);
    const [lit] = updateElement([el], el.id, { accent: true });
    expect(lit.accent).toBe(true);
    expect(updateElement([lit], el.id, { accent: false })[0]).not.toHaveProperty('accent');
    expect(parseProject(serializeProject({ cols: 10, rows: 2, elements: [lit] })).elements[0].accent).toBe(true);
  });
});
