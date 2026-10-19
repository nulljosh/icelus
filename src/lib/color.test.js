import { describe, it, expect } from 'vitest';
import { COLORS, cleanColor, colorMask, toAnsi, hasColor } from './color.js';
import { renderElements, updateElement, parseProject, serializeProject, trimText, gridToText } from './engine.js';
import { parseSketch } from './syntax.js';
import { paint } from './brush.js';

describe('color', () => {
  it('sixteen terminal colors, and only indexes count', () => {
    expect(COLORS).toHaveLength(16);
    expect([cleanColor(0), cleanColor(15), cleanColor(16), cleanColor(-1), cleanColor(1.5), cleanColor('3'), cleanColor(null)]).toEqual([0, 15, undefined, undefined, undefined, undefined, undefined]);
  });
  it('sets and clears ink and paper, and a project keeps them', () => {
    const [b] = parseSketch('[Go]', 0, 0);
    let els = updateElement([b], b.id, { ink: 1, paper: 4 });
    expect(els[0]).toMatchObject({ ink: 1, paper: 4 });
    els = updateElement(els, b.id, { paper: null });
    expect(els[0].paper).toBeUndefined();
    expect(updateElement(els, b.id, { ink: 99 })[0].ink).toBeUndefined();
    const back = parseProject(serializeProject({ cols: 10, rows: 2, elements: [{ ...els[0], paper: 'red' }] })).elements[0];
    expect(back.ink).toBe(1);
    expect(back.paper).toBeUndefined();
  });
  it('a part on top clears the color under it; see-through marks only', () => {
    const [b] = parseSketch('[Go]', 0, 0);
    const red = { ...b, ink: 1, paper: 7 };
    const dots = paint([red], [[1, 0]], '•');
    const m = colorMask(dots, 10, 1);
    expect(m.ink[0].slice(0, 6)).toEqual([1, -1, 1, 1, 1, 1]);
    expect(m.paper[0][0]).toBe(7);
    expect(m.paper[0][6]).toBe(-1);
    expect(hasColor(dots)).toBe(true);
    expect(hasColor(parseSketch('[Go]', 0, 0))).toBe(false);
  });
  it('ANSI keeps the color and plain copy stays colorless', () => {
    const [b] = parseSketch('[Go]', 0, 0);
    const els = [{ ...b, ink: 9, paper: 4 }];
    const grid = renderElements(els, 10, 3);
    expect(toAnsi(grid, colorMask(els, 10, 3))).toBe('\x1b[91;44m[ Go ]\x1b[0m');
    expect(trimText(gridToText(grid))).toBe('[ Go ]');
    const evil = [{ id: 'e', presetId: 'text', label: 'Text', template: ['a\x1b[2Jb\x07'], col: 0, row: 0, width: 7, height: 1, ink: 1 }];
    expect(toAnsi(renderElements(evil, 10, 1), colorMask(evil, 10, 1))).toBe('\x1b[31ma [2Jb \x1b[0m');
    const plain = parseSketch('[Go]', 0, 0);
    expect(toAnsi(renderElements(plain, 10, 1), colorMask(plain, 10, 1))).toBe('[ Go ]');
  });
});
