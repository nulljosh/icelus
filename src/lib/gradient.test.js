import { describe, it, expect } from 'vitest';
import { gradientMarks, RAMP } from './gradient.js';
import { paintMarks } from './brush.js';
import { renderElements } from './engine.js';

const text = (els, cols, rows) => renderElements(els, cols, rows).map(r => r.join('').trimEnd()).join('\n').trimEnd();

describe('gradients', () => {
  it('a straight drag ramps light to solid along it', () => {
    expect(text(paintMarks([], gradientMarks([0, 0], [7, 1], 'straight', 10, 2)), 10, 2)).toBe('░░▒▒▓▓██\n░░▒▒▓▓██');
    expect(text(paintMarks([], gradientMarks([7, 0], [0, 0], 'straight', 10, 1)), 10, 1)).toBe('██▓▓▒▒░░');
  });
  it('a mostly downward drag ramps down the rows', () => {
    const rows = text(paintMarks([], gradientMarks([0, 0], [1, 3], 'straight', 4, 4)), 4, 4).split('\n');
    expect(rows.map(r => r[0])).toEqual(RAMP);
  });
  it('round glows from the middle and looks round', () => {
    const marks = gradientMarks([10, 5], [16, 5], 'round', 30, 12);
    const at = (c, r) => marks.find(m => m[0] === c && m[1] === r)?.[2];
    expect(at(10, 5)).toBe('█');
    expect(at(16, 5)).toBe('░');
    expect(at(10, 8)).toBe('░'); // three rows down is six columns across
    expect(at(10, 9)).toBeUndefined();
    expect(gradientMarks([3, 3], [3, 3], 'round', 9, 9)).toEqual([[3, 3, '█']]);
  });
  it('clips to the grid and stays bounded on a huge drag', () => {
    expect(gradientMarks([-5, -5], [2, 2], 'straight', 3, 3)).toHaveLength(9);
    expect(gradientMarks([0, 0], [1e6, 0], 'round', 500, 500).length).toBeLessThanOrEqual(500 * 500);
    expect(gradientMarks([600, 600], [700, 700], 'straight', 500, 500)).toEqual([]);
  });
});
