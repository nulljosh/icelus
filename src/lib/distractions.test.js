import { describe, it, expect } from 'vitest';
import { critique, removeDistractions, critiqueMessage } from './critique.js';
import { createElement, createLine, serializeProject } from './engine.js';
import { getPreset, SCREEN_TOOL } from './presets.js';
import { paint } from './brush.js';
import { callTool } from './tools.js';

describe('find distractions', () => {
  const screen = createElement(SCREEN_TOOL, 0, 0);
  const button = createElement(getPreset('button'), 2, 2);
  const empty = { ...createElement(getPreset('label') ?? getPreset('button'), 4, 6), template: ['   '], width: 3, height: 1 };
  const stray = paint([], [[30, 2], [31, 2]], '█')[0];
  const inside = paint([], [[2, 4], [3, 4], [4, 4], [5, 4]], '█')[0];

  it('flags stray marks, paint off every screen and parts with nothing to show', () => {
    const els = [screen, button, empty, stray, inside];
    const found = critique(els, 80, 30).filter(i => i.rule === 'distraction');
    expect(found.map(i => [i.id, i.kind])).toEqual([[empty.id, 'empty'], [stray.id, 'stray']]);
    expect(critiqueMessage(found[1])).toMatch(/a few stray marks/);
    expect(critique([{ ...stray, locked: true }], 80, 30).some(i => i.rule === 'distraction')).toBe(false);
  });

  it('removes them in one go and heals arrows through them', () => {
    const a = createElement(getPreset('button'), 0, 10), b = createElement(getPreset('button'), 40, 10);
    const hole = { ...createElement(getPreset('card'), 20, 10), template: ['   ', '   '], width: 3, height: 2 };
    let els = [a, hole, b];
    els = [...els, createLine(els, { col: a.width - 1, row: 10 }, { col: 20, row: 10 }), createLine(els, { col: 22, row: 10 }, { col: 40, row: 10 })];
    const out = removeDistractions(els, 80, 30);
    expect(out.some(el => el.id === hole.id)).toBe(false);
    expect(out.filter(el => el.presetId === 'line').map(l => [l.from.id, l.to.id])).toEqual([[a.id, b.id]]);
    expect(removeDistractions([screen, button], 80, 30)).toEqual([screen, button]);
  });

  it('edit_project clean', () => {
    const project = JSON.parse(serializeProject({ cols: 80, rows: 30, elements: [screen, button, stray] }));
    expect(callTool('edit_project', { project, ops: [{ op: 'clean' }] }).project.elements.map(e => e.presetId)).toEqual(['screen', 'button']);
  });
});
