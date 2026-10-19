import { describe, it, expect } from 'vitest';
import { actionStep, recordAction, playAction, cleanActions, saveAction, ACTION_LIMIT } from './actions.js';
import { createState, pushHistory, createElement, moveElement, updateElement, deleteElement, serializeProject, parseProject } from './engine.js';
import { getPreset } from './presets.js';
import { callTool } from './tools.js';

const button = createElement(getPreset('button'), 0, 0);
const card = createElement(getPreset('card'), 20, 4);
const edit = (state, elements) => ({ ...pushHistory(state), elements });

describe('actions', () => {
  it('turns each undo step into a step relative to its part', () => {
    expect(actionStep([button], moveElement([button], button.id, 3, 2))).toEqual({ op: 'move', dCol: 3, dRow: 2 });
    expect(actionStep([button], updateElement([button], button.id, { style: 'double' }))).toEqual({ op: 'set', changes: { style: 'double' } });
    expect(actionStep([button], updateElement([button], button.id, { accent: true }))).toEqual({ op: 'set', changes: { accent: true } });
    expect(actionStep([button, card], [button])).toEqual({ op: 'delete' });
    expect(actionStep([button], [button, card])).toBeNull(); // an add is not about an existing part
    expect(actionStep([button, card], [card, button])).toBeNull();
  });

  it('records the steps since Record and replays them on other parts', () => {
    let s = edit(createState(), [button, card]);
    const from = s.history.length;
    s = edit(s, moveElement(s.elements, button.id, 2, 1));
    s = edit(s, updateElement(s.elements, button.id, { style: 'heavy' }));
    const act = recordAction(s, from, ' Nudge and bold ');
    expect(act).toEqual({ name: 'Nudge and bold', steps: [{ op: 'move', dCol: 2, dRow: 1 }, { op: 'set', changes: { style: 'heavy' } }] });
    const out = playAction(s.elements, act.steps, [card.id]);
    const c = out.find(el => el.id === card.id);
    expect([c.col, c.row, c.style]).toEqual([22, 5, 'heavy']);
    expect(recordAction(s, s.history.length, '').steps).toEqual([]);
    expect(recordAction(s, -9, '', 2).name).toBe('Action 3');
  });

  it('keeps moves on the canvas and stops on a deleted part', () => {
    const far = playAction([card], [{ op: 'move', dCol: 900, dRow: 900 }], [card.id], 40, 20)[0];
    expect(far.col + far.width).toBeLessThanOrEqual(40);
    expect(playAction([card], [{ op: 'delete' }, { op: 'move', dCol: 1, dRow: 0 }], [card.id])).toEqual([]);
    expect(playAction([card], [{ op: 'move', dCol: 1, dRow: 0 }], ['missing'])).toEqual([card]);
  });

  it('cleans actions from a file and caps them', () => {
    const bad = cleanActions([null, 'x', { name: 5, steps: [{ op: 'move', dCol: 1.5, dRow: 0 }, { op: 'set', changes: { style: 'nope', ink: 3, template: ['x'] } }, { op: 'eval' }, { op: 'text', text: 'y'.repeat(5000) }] }]);
    expect(bad).toEqual([{ name: 'Action 1', steps: [{ op: 'set', changes: { ink: 3 } }, { op: 'text', text: 'y'.repeat(2000) }] }]);
    let many = [];
    for (let i = 0; i < ACTION_LIMIT + 2; i++) many = saveAction(many, { name: `a${i}`, steps: [] });
    expect(many.length).toBe(ACTION_LIMIT);
    expect(cleanActions([{ name: 'big', steps: Array(500).fill({ op: 'delete' }) }])[0].steps.length).toBe(50);
    const saved = serializeProject({ cols: 20, rows: 5, elements: [button], actions: [{ name: 'One', steps: [{ op: 'delete' }] }] });
    expect(parseProject(saved).actions).toEqual([{ name: 'One', steps: [{ op: 'delete' }] }]);
    expect(JSON.parse(serializeProject({ cols: 20, rows: 5, elements: [] })).actions).toBeUndefined();
  });

  it('edit_project plays an action by name or inline', () => {
    const project = { ...JSON.parse(serializeProject({ cols: 60, rows: 20, elements: [button, card] })), actions: [{ name: 'Bold', steps: [{ op: 'set', changes: { style: 'double' } }] }] };
    const out = callTool('edit_project', { project, ops: [{ op: 'play', index: 1, name: 'Bold' }, { op: 'play', index: 0, steps: [{ op: 'move', dCol: 4, dRow: 0 }, { op: 'bogus' }] }] });
    expect(out.project.elements[1].style).toBe('double');
    expect(out.project.elements[0].col).toBe(4);
    expect(out.project.actions[0].name).toBe('Bold');
    expect(() => callTool('edit_project', { project, ops: [{ op: 'play', index: 0, name: 'Nope' }] })).toThrow(/must name an action: Bold/);
    expect(() => callTool('edit_project', { project, ops: [{ op: 'play', index: 0 }] })).toThrow(/needs name or steps/);
    expect(() => callTool('edit_project', { project, ops: [{ op: 'play', index: 0, steps: Array(51).fill({ op: 'delete' }) }] })).toThrow(/at most 50/);
  });
});
