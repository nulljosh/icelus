import { describe, it, expect } from 'vitest';
import { critique, critiqueMessage } from './critique.js';
import { createElement } from './engine.js';
import { getPreset } from './presets.js';

const place = (id, col, row, extra = {}) => ({ ...createElement(getPreset(id), col, row), ...extra });
const rules = els => critique(els, 60, 30).map(i => i.rule);

describe('critique', () => {
  it('finds parts off the grid and parts that partly cover each other', () => {
    const card = place('card', 0, 0), btn = place('button', card.width - 2, 1);
    expect(rules([card, btn])).toContain('overlap');
    expect(rules([place('button', 58, 0)])).toContain('off_grid');
  });
  it('lets a part sit wholly inside a card', () => {
    const card = place('card', 0, 0);
    expect(rules([card, place('button', 1, 1, { template: ['[ Save ]'], width: 8 })])).not.toContain('overlap');
  });
  it('finds a box cut open by a part on top of it', () => {
    const card = place('card', 0, 0);
    const cover = { id: 'x', presetId: 'image', label: 'Image', col: card.width - 1, row: 0, template: ['XX'], width: 2, height: 1 };
    expect(rules([card, cover])).toContain('broken_box');
  });
  it('flags placeholder labels, not real ones', () => {
    expect(critique([place('checkbox', 0, 0)], 60, 30).find(i => i.rule === 'vague_label')?.word).toBe('Label');
    expect(rules([place('button', 0, 0, { template: ['[ Click here ]'], width: 14 })])).toContain('vague_label');
    expect(rules([place('button', 0, 0, { template: ['[ Save draft ]'], width: 14 })])).not.toContain('vague_label');
  });
  it('asks for empty and error states', () => {
    const list = place('list', 0, 0), input = place('input', 0, 10);
    expect(rules([list, input])).toEqual(expect.arrayContaining(['no_empty_state', 'no_error_state']));
    const fixed = [list, input, { id: 't', presetId: 'text', label: 'Text', col: 0, row: 20, template: ['Nothing here yet'], text: 'Nothing here yet', width: 16, height: 1 }, place('alert', 20, 20)];
    expect(rules(fixed)).not.toContain('no_empty_state');
    expect(rules(fixed)).not.toContain('no_error_state');
  });
  it('lists open notes and skips hidden parts', () => {
    expect(critique([place('button', 0, 0, { note: 'bigger' })], 60, 30).map(critiqueMessage)).toContain('Note on Button at 0,0: bigger');
    expect(rules([place('checkbox', 0, 0, { hidden: true })])).toEqual([]);
  });
});

describe('critique for agents', async () => {
  const { callTool } = await import('./tools.js');
  const { run } = await import('../../bin/icelus.js');
  const project = { blockprint: 1, cols: 60, rows: 30, elements: [place('checkbox', 0, 0)] };
  it('is an API tool with part indexes', async () => {
    const { issues } = await callTool('critique_project', { project });
    expect(issues[0]).toMatchObject({ rule: 'vague_label', index: 0, message: 'Checkbox at 0,0 says "Label", which is placeholder text' });
  });
  it('is a CLI command that fails only on errors', () => {
    const r = run(['critique', 'p.json'], () => JSON.stringify(project));
    expect(r.out).toContain('warn: Checkbox');
    expect(r.code).toBe(0);
  });
});
