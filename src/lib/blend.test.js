import { describe, it, expect } from 'vitest';
import { BLENDS, cleanBlend, lands, accentMask } from './lines.js';
import { renderElements, updateElement, parseProject, serializeProject } from './engine.js';
import { colorMask } from './color.js';
import { callTool } from './tools.js';

const part = (id, presetId, template, col = 0, row = 0, extra = {}) =>
  ({ id, presetId, label: id, template, width: Math.max(...template.map(l => [...l].length)), height: template.length, col, row, ...extra });
const row = (grid, r, n = grid[r].length) => grid[r].slice(0, n).join('');
const across = part('h', 'line', ['───']), down = part('v', 'line', ['│', '│', '│'], 1, 0);
const back = part('b', 'custom', ['XYZ']);

describe('blend modes', () => {
  it('joins light lines by default and replaces them with over', () => {
    expect(renderElements([part('h', 'line', ['───'], 0, 1), down], 3, 3)[1][1]).toBe('┼');
    expect(renderElements([part('h', 'line', ['───'], 0, 1), { ...down, blend: 'over' }], 3, 3)[1][1]).toBe('│');
    expect(renderElements([across, { ...down, blend: 'join' }], 3, 3)[0][1]).toBe('┼'); // join named outright is the default
  });

  it('under fills only empty cells', () => {
    const grid = renderElements([part('a', 'custom', ['AB']), { ...back, blend: 'under' }], 3, 1);
    expect(row(grid, 0)).toBe('ABZ');
  });

  it('knockout clears its box, spaces too, even for see-through text', () => {
    const word = part('t', 'text', ['A B']);
    expect(row(renderElements([back, word], 3, 1), 0)).toBe('AYB');
    expect(row(renderElements([back, { ...word, blend: 'knockout' }], 3, 1), 0)).toBe('A B');
  });

  it('accent and color follow the same cells as drawing', () => {
    const under = { ...part('u', 'custom', ['QQQ']), blend: 'under', accent: true, ink: 1 };
    const els = [part('a', 'custom', ['AB']), under];
    expect(accentMask(els, 3, 1)[0]).toEqual([false, false, true]);
    expect(colorMask(els, 3, 1).ink[0]).toEqual([-1, -1, 1]);
  });

  it('lands answers holes and see-through spaces the same way for every pass', () => {
    expect(lands(part('t', 'text', ['x']), ' ', ' ')).toBe(false);
    expect(lands({ ...part('t', 'text', ['x']), blend: 'knockout' }, ' ', 'Q')).toBe(true);
    expect(lands({ ...back, blend: 'under' }, 'X', 'A')).toBe(false);
    expect(lands({ ...back, blend: 'knockout' }, '\0', 'A')).toBe(false);
  });

  it('stores only real modes; join is the default and is not stored', () => {
    expect(BLENDS).toEqual(['join', 'over', 'under', 'knockout']);
    expect(cleanBlend('nope')).toBeUndefined();
    expect(cleanBlend('join')).toBeUndefined();
    const [set] = updateElement([back], 'b', { blend: 'under' });
    expect(set.blend).toBe('under');
    expect(updateElement([set], 'b', { blend: 'join' })[0].blend).toBeUndefined();
    expect(updateElement([set], 'b', { blend: '<script>' })[0].blend).toBeUndefined();
  });

  it('survives a save and drops a bad mode on load', () => {
    const saved = serializeProject({ cols: 3, rows: 1, elements: [{ ...back, blend: 'knockout' }] });
    expect(parseProject(saved).elements[0].blend).toBe('knockout');
    const bad = parseProject(JSON.stringify({ elements: [{ ...back, blend: { evil: 1 } }] }));
    expect(bad.elements[0].blend).toBeUndefined();
  });

  it('edit_project sets a mode and refuses an unknown one', () => {
    const project = JSON.parse(serializeProject({ cols: 3, rows: 1, elements: [part('a', 'custom', ['AB']), back] }));
    const out = callTool('edit_project', { project, ops: [{ op: 'blend', index: 1, mode: 'under' }] });
    expect(out.project.elements[1].blend).toBe('under');
    expect(out.text.split('\n')[0]).toBe('ABZ');
    expect(() => callTool('edit_project', { project, ops: [{ op: 'blend', index: 1, mode: 'multiply' }] })).toThrow(/mode must be one of/);
  });
});
