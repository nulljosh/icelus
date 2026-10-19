import { describe, it, expect } from 'vitest';
import { marquee, wand, cellText, partsWithin, cutCells, fillCells, moveCells, shiftCells } from './select.js';
import { paint } from './brush.js';
import { renderElements } from './engine.js';
import { parseSketch, screenTemplate } from './syntax.js';

const text = (els, cols, rows) => renderElements(els, cols, rows).map(r => r.join('').trimEnd()).join('\n').trimEnd();

describe('selections', () => {
  it('a marquee is the rectangle between two corners, clipped', () => {
    expect(marquee([2, 1], [0, 0], 10, 10)).toHaveLength(6);
    expect(marquee([-5, -5], [99, 0], 4, 3)).toHaveLength(4);
  });
  it('the wand takes the run of one character, joined by sides', () => {
    const grid = renderElements(paint([], [[0, 0], [1, 0], [2, 0], [4, 0]], '▒'), 6, 2);
    expect(wand(grid, 1, 0)).toHaveLength(3);
    expect(wand(grid, 3, 1).length).toBe(12 - 4);
    expect(wand(grid, 9, 9)).toEqual([]);
  });
  it('copies the characters as they show', () => {
    const els = parseSketch('[Go]', 0, 0);
    expect(cellText(renderElements(els, 10, 1), marquee([0, 0], [5, 0], 10, 1))).toBe('[ Go ]');
    expect(cellText([], [])).toBe('');
    expect(cellText(renderElements(els, 10, 3), marquee([0, 0], [9, 2], 10, 3))).toBe('[ Go ]');
    expect(cellText(renderElements([], 4, 2), marquee([0, 0], [3, 1], 4, 2))).toBe('');
  });
  it('takes whole parts only, never part of one', () => {
    const els = parseSketch('[Go]  [Stop]', 0, 0);
    expect(partsWithin(els, marquee([0, 0], [6, 0], 20, 1)).map(e => e.template[0])).toEqual(['[ Go ]']);
    expect(partsWithin(els, marquee([0, 0], [3, 0], 20, 1))).toEqual([]);
  });
  it('cut takes paint and whole parts, and leaves a part it only touches', () => {
    const els = paint(parseSketch('[Go]  [Stop]', 0, 0), [[0, 1], [10, 1]], '#');
    expect(text(cutCells(els, marquee([0, 0], [8, 1], 20, 2)), 20, 2)).toBe('        [ Stop ]\n          #');
  });
  it('fill paints the selection with one mark', () => {
    expect(text(fillCells([], marquee([0, 0], [2, 1], 5, 2), '░'), 5, 2)).toBe('░░░\n░░░');
  });
  it('move carries paint and whole parts, and a screen brings its parts once', () => {
    const els = paint(parseSketch('[Go]', 0, 0), [[0, 1], [1, 1]], '▓');
    expect(text(moveCells(els, marquee([0, 0], [5, 1], 20, 4), 2, 2, 20, 4), 20, 4)).toBe('\n\n  [ Go ]\n  ▓▓');
    const screen = screenTemplate('Home', '[Go]', 0, 0);
    const moved = moveCells(screen, marquee([0, 0], [40, 20], 60, 30), 5, 3, 60, 30);
    screen.forEach((el, i) => expect([moved[i].col - el.col, moved[i].row - el.row]).toEqual([5, 3]));
    expect(moveCells(els, marquee([0, 0], [5, 1], 20, 4), 0, 0, 20, 4)).toBe(els);
  });
  it('paint moved off the grid is dropped, and the selection follows the move', () => {
    const els = paint([], [[0, 0], [1, 0]], '█');
    expect(text(moveCells(els, marquee([0, 0], [1, 0], 3, 1), 2, 0, 3, 1), 3, 1)).toBe('  █');
    expect(shiftCells([[0, 0], [2, 0]], 1, 0, 3, 1)).toEqual([[1, 0]]);
  });
});
