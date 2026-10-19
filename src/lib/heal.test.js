import { describe, it, expect } from 'vitest';
import { closeLines, nextValue, nextLine, expandChanges, harmonize } from './heal.js';
import { createElement, createLine, deleteElement, moveElement, updateElement, serializeProject, tableCells } from './engine.js';
import { getPreset, SCREEN_TOOL } from './presets.js';
import { callTool } from './tools.js';

const box = (col, row) => createElement(getPreset('button'), col, row);

describe('heal', () => {
  it('joins the arrows across a deleted part in the middle of a flow', () => {
    const a = box(0, 0), x = box(20, 0), b = box(40, 0);
    let els = [a, x, b];
    els = [...els, createLine(els, { col: a.col + a.width - 1, row: 0 }, { col: x.col, row: 0 })];
    els = [...els, createLine(els, { col: x.col + x.width - 1, row: 0 }, { col: b.col, row: 0 })];
    const out = deleteElement(els, x.id);
    const lines = out.filter(el => el.presetId === 'line');
    expect(out.some(el => el.id === x.id)).toBe(false);
    expect(lines).toHaveLength(1);
    expect([lines[0].from.id, lines[0].to.id]).toEqual([a.id, b.id]);
    // moving b still drags the joined line, so it is pinned, not drawn once
    expect(moveElement(out, b.id, 50, 0).find(el => el.presetId === 'line').to.col).toBe(50);
  });

  it('leaves lines alone when the flow cannot be joined one way', () => {
    const a = box(0, 0), c = box(0, 6), x = box(20, 0), b = box(40, 0), d = box(40, 6);
    let els = [a, c, x, b, d];
    for (const [f, t] of [[a, x], [c, x], [x, b], [x, d]]) els = [...els, createLine(els, { col: f.col + f.width - 1, row: f.row }, { col: t.col, row: t.row })];
    expect(closeLines(els, x.id)).toBe(els);
    expect(closeLines([a, b], 'nothing')).toEqual([a, b]);
  });

  it('carries a pattern on', () => {
    expect(nextValue(['Item 1', 'Item 2'])).toBe('Item 3');
    expect(nextValue(['10', '20'])).toBe('30');
    expect(nextValue(['$40'])).toBe('$41');
    expect(nextValue(['Item one', 'Item two'])).toBe('Item three');
    expect(nextValue(['Sun'])).toBe('Mon');
    expect(nextValue(['december'])).toBe('january');
    expect(nextValue(['Item twelve'])).toBe('Item 13');
    expect(nextValue(['Cell', 'Cell'])).toBe('Cell');
    expect(nextValue(['Apples', 'Pears'])).toBe('');
    expect(nextValue([])).toBe('');
    expect(nextLine(['• Item one', '• Item two', '• Item three'])).toBe('• Item four');
    expect(nextLine(['1. Wash', '2. Dry'])).toBe('3. ');
    expect(nextLine(['  - a', '  - b'])).toBe('  - ');
  });

  it('expands tables and lists, and nothing else', () => {
    const list = createElement(getPreset('list'), 0, 0);
    expect(expandChanges(list, 2).text.split('\n').slice(-2)).toEqual(['• Item four', '• Item five']);
    const table = updateElement([createElement(getPreset('table'), 0, 0)], undefined, {})[0];
    const grown = updateElement([table], table.id, expandChanges(table))[0];
    expect(tableCells(grown.template).at(-1)).toEqual(['Cell', 'Cell', 'Cell']);
    expect(grown.height).toBe(table.height + 1);
    expect(expandChanges(box(0, 0))).toBeNull();
    expect(expandChanges(undefined)).toBeNull();
    expect(tableCells(updateElement([table], table.id, expandChanges(table, 999))[0].template).length).toBe(3 + 50);
  });

  it('edit_project expands and refuses what does not', () => {
    const project = JSON.parse(serializeProject({ cols: 60, rows: 20, elements: [createElement(getPreset('list'), 0, 0), box(0, 8)] }));
    const out = callTool('edit_project', { project, ops: [{ op: 'expand', index: 0, by: 2 }] });
    expect(out.text).toContain('• Item five');
    expect(() => callTool('edit_project', { project, ops: [{ op: 'expand', index: 1 }] })).toThrow(/does not expand/);
    expect(() => callTool('edit_project', { project, ops: [{ op: 'expand', index: 0, by: 99 }] })).toThrow(/between 1 and 50/);
  });

  it('harmonizes a part dropped on a screen with the look most parts there share', () => {
    const base = createElement(SCREEN_TOOL, 0, 0), screen = updateElement([base], base.id, { width: 70, height: 30 })[0];
    const card = (col, row, extra = {}) => ({ ...createElement(getPreset('card'), col, row), ...extra });
    const mates = [card(2, 2, { style: 'double', ink: 4 }), card(2, 11, { style: 'double', ink: 4 }), card(24, 11, { style: 'double', ink: 4 }), card(2, 20)];
    const fresh = card(24, 2), colored = card(46, 2, { ink: 2 }), outside = card(80, 2);
    const els = [screen, ...mates, fresh, colored, outside];
    const got = id => harmonize(els, id).find(el => el.id === id);
    expect([got(fresh.id).style, got(fresh.id).ink]).toEqual(['double', 4]);
    expect(got(colored.id).ink).toBe(2);
    expect(harmonize(els, outside.id)).toBe(els);
    expect(harmonize([screen, mates[0], mates[3], fresh], fresh.id)).toEqual([screen, mates[0], mates[3], fresh]); // no majority to follow
    expect(harmonize(els, 'missing')).toBe(els);
    const out = callTool('edit_project', { project: JSON.parse(serializeProject({ cols: 80, rows: 30, elements: els })), ops: [{ op: 'harmonize', index: 5 }] });
    expect(out.project.elements[5].style).toBe('double');
  });
});
