import { describe, it, expect } from 'vitest';
import { cleanMask, shownBox, withMasks, HOLE } from './mask.js';
import { createElement, renderElements, updateElement, parseProject, serializeProject, gridToText } from './engine.js';
import { PRESETS } from './presets.js';
import { colorMask } from './color.js';
import { callTool } from './tools.js';

const at = (id, col, row) => createElement(PRESETS.find(p => p.id === id), col, row);
const text = (els, cols = 30, rows = 8) => gridToText(renderElements(els, cols, rows));

describe('masks', () => {
  it('cleans untrusted masks', () => {
    expect(cleanMask(null)).toBeUndefined();
    expect(cleanMask({ top: 0 })).toBeUndefined();
    expect(cleanMask({ top: -3, right: '2', bottom: 1e9, left: 'x' })).toEqual({ top: 0, right: 2, bottom: 500, left: 0 });
  });
  it('crops a part without cutting it, and clearing brings it back', () => {
    const card = at('card', 0, 0);
    const masked = updateElement([card], card.id, { mask: { right: 4 } });
    expect(masked[0].template).toEqual(card.template);
    const shown = text(masked).split('\n');
    expect(shown.every(l => l.trimEnd().length <= card.width - 4)).toBe(true);
    expect(shown.some(l => l.trim())).toBe(true);
    expect(text(updateElement(masked, card.id, { mask: null }))).toBe(text([card]));
  });
  it('lets what is underneath show through the hidden cells', () => {
    const under = { ...at('card', 0, 0), id: 'u' };
    const over = { ...at('card', 0, 0), id: 'o', template: under.template.map(l => 'X'.repeat([...l].length)) };
    const g = renderElements(updateElement([under, over], 'o', { mask: { left: 3 } }), 30, 8);
    expect(g[1][0]).toBe(under.template[1][0]);
    expect(g[1][5]).toBe('X');
  });
  it('clips one part to the box of another', () => {
    const shape = { ...at('button', 2, 1), id: 's' }, big = { ...at('card', 0, 0), id: 'b', template: at('card', 0, 0).template.map(l => '#'.repeat([...l].length)) };
    const els = updateElement([shape, big], 'b', { clip: 's' });
    const b = shownBox(els[1], new Map(els.map(e => [e.id, e])));
    expect(b).toEqual({ c0: 2, r0: 1, c1: 2 + shape.width, r1: 1 + shape.height });
    const g = renderElements(els, 30, 8);
    expect(g[0][0]).toBe(' ');
    expect(g[1][2]).toBe('#');
    expect(updateElement(els, 'b', { clip: 'b' })[1].clip).toBeUndefined(); // never to itself
  });
  it('keeps holes out of colors and saved files', () => {
    const card = { ...at('card', 0, 0), ink: 1 };
    const els = updateElement([card], card.id, { mask: { top: 2 } });
    expect(colorMask(els, 30, 8).ink[0][0]).toBe(-1);
    expect(serializeProject({ cols: 30, rows: 8, elements: els })).not.toContain(HOLE);
    const back = parseProject(JSON.stringify({ elements: [{ ...els[0], id: 'a' }, { ...at('button', 0, 0), id: 'z', clip: 'a', mask: { left: 'no' } }] }));
    expect(back.elements[0].mask).toEqual({ top: 2, right: 0, bottom: 0, left: 0 });
    expect(back.elements[1].clip).toBe(back.elements[0].id);
    expect(back.elements[1].mask).toBeUndefined();
  });
  it('ignores a clip to a part that is gone, and stays fast on a big canvas', () => {
    expect(text(withMasks([{ ...at('card', 0, 0), clip: 'missing' }]))).toBe(text([at('card', 0, 0)]));
    const many = Array.from({ length: 2000 }, (_, i) => ({ ...at('card', i % 400, i % 400), mask: { top: 1 } }));
    const t0 = Date.now(); renderElements(many, 500, 500);
    expect(Date.now() - t0).toBeLessThan(3000);
  });
  it('is an agent op', () => {
    const project = { cols: 30, rows: 8, elements: [at('button', 2, 1), at('card', 0, 0)] };
    const out = callTool('edit_project', { project, ops: [{ op: 'mask', index: 1, clip: 0 }, { op: 'mask', index: 0, inset: { left: 1 } }] });
    expect(out.project.elements[1].clip).toBe(out.project.elements[0].id);
    expect(out.project.elements[0].mask).toEqual({ top: 0, right: 0, bottom: 0, left: 1 });
    expect(() => callTool('edit_project', { project, ops: [{ op: 'mask', index: 0, clip: 9 }] })).toThrow();
    expect(() => callTool('edit_project', { project, ops: [{ op: 'mask', index: 0, inset: { top: -1 } }] })).toThrow();
  });
});
