import { describe, it, expect } from 'vitest';
import { tip, run, strokeCells, paint, erase, brushChar } from './brush.js';
import { renderElements, elementAt, parseProject, serializeProject } from './engine.js';
import { parseSketch } from './syntax.js';

const text = (els, cols, rows) => renderElements(els, cols, rows).map(r => r.join('').trimEnd()).join('\n').trimEnd();

describe('brush', () => {
  it('tips are size cells across, centred', () => {
    expect(tip(5, 5, 1)).toEqual([[5, 5]]);
    expect(tip(5, 5, 3)).toHaveLength(9);
    expect(tip(5, 5, 3)[0]).toEqual([4, 4]);
    expect(tip(5, 5, 2)[0]).toEqual([5, 5]);
    expect(tip(0, 0, 99)).toHaveLength(25);
    expect(tip(0, 0, 'x')).toHaveLength(1);
  });
  it('runs join far points with no gaps', () => {
    const cells = run([0, 0], [7, -3]);
    expect(cells[0]).toEqual([0, 0]);
    expect(cells.at(-1)).toEqual([7, -3]);
    expect(cells).toHaveLength(8);
    cells.slice(1).forEach(([c, r], i) => expect(Math.max(Math.abs(c - cells[i][0]), Math.abs(r - cells[i][1]))).toBe(1));
    expect(run([3, 3], [3, 3])).toEqual([[3, 3]]);
  });
  it('a stroke clips to the grid, has no repeats and has a ceiling', () => {
    const cells = strokeCells([[0, 0], [9, 0], [0, 0]], 3, 10, 4);
    expect(new Set(cells.map(String)).size).toBe(cells.length);
    expect(cells.every(([c, r]) => c >= 0 && r >= 0 && c < 10 && r < 4)).toBe(true);
    expect(strokeCells([[0, 0], [999, 999]], 5, 1000, 1000).length).toBeLessThanOrEqual(20_000);
  });
  it('paints one see-through part and draws over a button without cutting it', () => {
    const els = paint(parseSketch('[Go]', 0, 0), strokeCells([[0, 1], [6, 1]], 1, 10, 3), '░');
    expect(els.at(-1)).toMatchObject({ presetId: 'paint', col: 0, row: 1, width: 7, height: 1 });
    expect(text(els, 10, 3)).toBe('[ Go ]\n░░░░░░░');
    const over = paint(parseSketch('[Go]', 0, 0), [[0, 0], [5, 0]], '#');
    expect(text(over, 10, 1)).toBe('# Go #');
  });
  it('only its marks are hit, and a project keeps the strokes', () => {
    const els = paint([], [[0, 0], [2, 2]], '•');
    expect(elementAt(els, 0, 0)?.presetId).toBe('paint');
    expect(elementAt(els, 1, 1)).toBeNull();
    const back = parseProject(serializeProject({ cols: 5, rows: 5, elements: els }));
    expect(back.elements[0].template).toEqual(['•  ', '   ', '  •']);
  });
  it('the eraser clears paint only, removes empty strokes, skips locked ones', () => {
    const base = parseSketch('[Go]', 0, 0);
    let els = paint(base, [[0, 1], [1, 1], [2, 1]], '█');
    els = erase(els, tip(1, 1, 1).concat(tip(0, 0, 1)));
    expect(text(els, 10, 2)).toBe('[ Go ]\n█ █');
    els = erase(els, strokeCells([[0, 1], [2, 1]], 1, 10, 2));
    expect(els).toEqual(base);
    const locked = paint([], [[0, 0]], '█').map(e => ({ ...e, locked: true }));
    expect(erase(locked, [[0, 0]])).toEqual(locked);
  });
  it('brush characters are one printable mark', () => {
    expect(brushChar('▒x')).toBe('▒');
    expect(brushChar('')).toBe('█');
    expect(brushChar(' ')).toBe('█');
    expect(brushChar('\u0007')).toBe('█');
    expect(brushChar(null)).toBe('█');
  });
});
