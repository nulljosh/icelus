import { describe, it, expect } from 'vitest';
import { stepName, timeline, goToStep, takeSnapshot, SNAPSHOT_LIMIT } from './history.js';
import { createState, pushHistory, createElement, moveElement, updateElement, deleteElement, serializeProject, parseProject } from './engine.js';
import { getPreset } from './presets.js';
import { callTool } from './tools.js';

const button = createElement(getPreset('button'), 0, 0);
const card = createElement(getPreset('card'), 10, 0);
const edit = (state, elements) => ({ ...pushHistory(state), elements });

describe('history', () => {
  it('names a step by what changed', () => {
    expect(stepName([], [button])).toMatchObject({ kind: 'add', el: button, count: 1 });
    expect(stepName([button], [button, card]).el).toBe(card);
    expect(stepName([button, card], [button])).toMatchObject({ kind: 'delete', el: card });
    expect(stepName([button], moveElement([button], button.id, 3, 2))).toMatchObject({ kind: 'move', count: 1 });
    expect(stepName([button], updateElement([button], button.id, { style: 'double' }))).toMatchObject({ kind: 'edit' });
    expect(stepName([button, card], [card, button]).kind).toBe('reorder');
    expect(stepName([button, card], []).kind).toBe('clear');
    expect(stepName([button], [card]).kind).toBe('replace');
    expect(stepName([button, card], [button, { ...card, col: 1 }, createElement(getPreset('input'), 0, 5)])).toMatchObject({ kind: 'change', count: 2 });
  });

  it('lists every kept step and jumps to any of them, keeping later steps redoable', () => {
    let s = createState();
    s = edit(s, [button]);
    s = edit(s, [button, card]);
    s = edit(s, deleteElement(s.elements, button.id));
    expect(timeline(s).map(x => x.kind)).toEqual(['start', 'add', 'add', 'delete']);
    const back = goToStep(s, 1);
    expect(back.elements).toEqual([button]);
    expect(timeline(back).map(x => x.kind)).toEqual(['start', 'add', 'add', 'delete']);
    expect(back.history.length).toBe(1);
    expect(goToStep(back, 3).elements).toEqual([card]);
    expect(goToStep(back, 99).elements).toEqual([card]); // past the end stops at the newest step
    expect(goToStep(s, -5).elements).toEqual([]);
  });

  it('keeps named snapshots, at most the limit', () => {
    const one = takeSnapshot([], [button], '  Before review ');
    expect(one).toEqual([{ name: 'Before review', elements: [button] }]);
    expect(takeSnapshot(one, [], '')[1].name).toBe('Snapshot 2');
    let many = [];
    for (let i = 0; i < SNAPSHOT_LIMIT + 3; i++) many = takeSnapshot(many, [], `s${i}`);
    expect(many.length).toBe(SNAPSHOT_LIMIT);
    expect(many[0].name).toBe('s3');
  });

  it('saves snapshots in the project file and cleans them on open', () => {
    const saved = serializeProject({ cols: 20, rows: 5, elements: [button], snapshots: takeSnapshot([], [card], 'First') });
    const open = parseProject(saved);
    expect(open.snapshots[0].name).toBe('First');
    expect(open.snapshots[0].elements[0].presetId).toBe('card');
    expect(open.snapshots[0].elements[0].id).not.toBe(open.elements[0].id);
    expect(JSON.parse(serializeProject({ cols: 20, rows: 5, elements: [] })).snapshots).toBeUndefined();
    const bad = parseProject(JSON.stringify({ elements: [], snapshots: [null, { name: 7, elements: [{ template: 'x' }] }, { name: 'x'.repeat(99), elements: [] }, 'junk'] }));
    expect(bad.snapshots.map(s => s.name)).toEqual(['Snapshot 1', 'x'.repeat(60)]);
    expect(bad.snapshots[0].elements).toEqual([]);
  });

  it('edit_project takes and restores a snapshot', () => {
    const project = JSON.parse(serializeProject({ cols: 20, rows: 5, elements: [button] }));
    const out = callTool('edit_project', { project, ops: [{ op: 'snapshot', name: 'One' }, { op: 'delete', index: 0 }] });
    expect(out.project.elements).toEqual([]);
    expect(out.project.snapshots[0].name).toBe('One');
    const back = callTool('edit_project', { project: out.project, ops: [{ op: 'restore', name: 'One' }] });
    expect(back.project.elements[0].presetId).toBe('button');
    expect(() => callTool('edit_project', { project: out.project, ops: [{ op: 'restore', name: 'Two' }] })).toThrow(/must name a snapshot: One/);
  });
});
