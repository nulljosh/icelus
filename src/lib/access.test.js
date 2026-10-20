import { describe, it, expect } from 'vitest';
import { createElement, updateElement, serializeProject } from './engine.js';
import { getPreset, SCREEN_TOOL } from './presets.js';
import { accessIssues, fixFocusOrder } from './access.js';
import { critique, critiqueMessage } from './critique.js';
import { callTool } from './tools.js';

describe('access check', () => {
  const part = (id, col, row) => createElement(getPreset(id), col, row);
  const say = (text, col, row) => ({ id: `t${col}-${row}`, presetId: 'text', label: 'Text', template: [text], width: text.length, height: 1, col, row });
  const rules = els => accessIssues(els).map(i => `${i.rule}${i.kind ? `:${i.kind}` : ''}`);

  it('flags controls listed out of reading order and fixes it in one step', () => {
    const top = part('button', 2, 2), bottom = part('button', 2, 6), label = say('Done', 2, 10);
    const els = [bottom, label, top];
    expect(rules(els)).toEqual(['focus_order']);
    const fixed = fixFocusOrder(els);
    expect(fixed.map(e => e.id)).toEqual([top.id, label.id, bottom.id]); // the text keeps its place
    expect(rules(fixed)).toEqual([]);
    expect(fixFocusOrder(fixed)).toBe(fixed);
  });

  it('reads screen by screen, not across side by side screens', () => {
    const left = createElement(SCREEN_TOOL, 0, 0), right = createElement(SCREEN_TOOL, 50, 0);
    const a = part('button', 2, 6), b = part('button', 52, 2);
    expect(rules([left, right, a, b])).toEqual([]); // b is higher, but on the second screen
    expect(rules([left, right, b, a])).toEqual(['focus_order']);
  });

  it('wants a label on a field', () => {
    const field = part('input', 10, 5);
    expect(rules([field])).toEqual(['no_label']);
    expect(rules([say('Email', 2, 5), field])).toEqual([]); // words just left
    expect(rules([say('Email', 10, 3), field])).toEqual([]); // words just above
    expect(rules([say('Email', 10, 0), field])).toEqual(['no_label']); // too far
  });

  it('wants room to tap', () => {
    const tiny = { ...part('button', 2, 2), template: ['[X]'], width: 3 };
    expect(rules([tiny])).toEqual(['small_target:narrow']);
    const a = part('button', 2, 2), b = part('button', 8, 2); // [ OK ] is 6 wide, so b starts where a ends
    expect(rules([a, b])).toEqual(['small_target:crowded']);
    expect(rules([a, part('button', 9, 2)])).toEqual([]);
    expect(rules([a, part('button', 2, 3)])).toEqual(['small_target:crowded']); // the row right under it
  });

  it('shows in Review and the API', () => {
    const els = [part('button', 2, 6), part('button', 2, 2)];
    const found = critique(els, 40, 20).filter(i => i.rule === 'focus_order');
    expect(found).toHaveLength(1);
    expect(critiqueMessage(found[0])).toContain('reading order');
    const project = JSON.parse(serializeProject({ cols: 40, rows: 20, elements: els }));
    const out = callTool('edit_project', { project, ops: [{ op: 'focus' }] });
    expect(out.project.elements.map(e => e.row)).toEqual([2, 6]);
  });
});
