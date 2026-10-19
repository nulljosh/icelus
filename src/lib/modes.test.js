import { describe, it, expect } from 'vitest';
import { createElement, updateElement, renderElements, gridToText, serializeProject, parseProject } from './engine.js';
import { getPreset, SCREEN_TOOL } from './presets.js';
import { autoLayout } from './layout.js';
import { setMode, setVar, canvasMode, canvasVars, cleanVars, VAR_MAX } from './modes.js';
import { partsInside } from './lines.js';
import { critique } from './critique.js';
import { callTool } from './tools.js';
import { editTools } from './webmcpEdit.js';

describe('variables and modes', () => {
  const box = { ...createElement(getPreset('card'), 2, 2), style: 'double' };
  const text = els => gridToText(renderElements(els, 30, 10));

  it('a mode draws the whole canvas in one line set and goes back when cleared', () => {
    const before = text([box]);
    expect(before).toContain('╔');
    const ascii = setMode([box], 'ascii');
    expect(canvasMode(ascii)).toBe('ascii');
    expect(text(ascii)).not.toMatch(/[╔═║─│┌]/u);
    expect(text(ascii)).toContain('+');
    // the mode wins over a part added after it
    expect(text([...ascii, createElement(getPreset('card'), 15, 2)])).not.toMatch(/[─│┌]/u);
    expect(text(setMode(ascii, 'heavy'))).toContain('┏');
    expect(text(setMode(ascii, null))).toBe(before);
    expect(setMode(ascii, null)).toHaveLength(1);
    expect(setMode([box], 'invert')).toEqual([box]); // only line sets are modes
  });

  it('the canvas part sits outside screens, selections and review', () => {
    const screen = createElement(SCREEN_TOOL, 0, 0);
    const els = setMode([screen, box], 'heavy');
    expect(partsInside(els, screen).some(el => el.canvas)).toBe(false);
    expect(critique(els, 60, 30).some(i => i.id === els.at(-1).id)).toBe(false);
  });

  it('a screen bound to a variable restacks when the variable changes', () => {
    const screen = createElement(SCREEN_TOOL, 0, 0);
    const a = createElement(getPreset('button'), 1, 1), b = createElement(getPreset('button'), 1, 5);
    let els = setVar([screen, a, b], 'space', 3);
    els = autoLayout(els, updateElement(els, screen.id, { auto: { gap: 'space', pad: 1 } }));
    const gapOf = list => list.find(el => el.id === b.id).row - (list.find(el => el.id === a.id).row + a.height);
    expect(gapOf(els)).toBe(3);
    els = autoLayout(els, setVar(els, 'space', 0));
    expect(gapOf(els)).toBe(0);
    // removing it leaves the last value as a plain number
    els = setVar(els, 'space', null);
    expect(els.find(el => el.id === screen.id).auto.gap).toBe(0);
    expect(els.some(el => el.canvas)).toBe(false);
  });

  it('cleans bad names and values, and caps the count', () => {
    expect(cleanVars({ ok: 2, 'Bad Name': 1, big: 99, neg: -1, str: '2', __proto__: 1 })).toEqual({ ok: 2 });
    expect(cleanVars([1, 2])).toBeNull();
    const many = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`v${i}`, 1]));
    expect(Object.keys(cleanVars(many))).toHaveLength(VAR_MAX);
    expect(setVar([box], 'Not OK', 1)).toEqual([box]);
  });

  it('round-trips in the project file and through edit_project', () => {
    const els = setVar(setMode([box], 'rounded'), 'gutter', 2);
    const back = parseProject(serializeProject({ cols: 30, rows: 10, elements: els })).elements;
    expect(canvasMode(back)).toBe('rounded');
    expect(canvasVars(back)).toEqual({ gutter: 2 });
    expect(parseProject(JSON.stringify({ elements: [{ ...back[1], vars: { x: 'y' } }] })).elements[0].vars).toBeUndefined();
    const project = JSON.parse(serializeProject({ cols: 30, rows: 10, elements: [box] }));
    const out = callTool('edit_project', { project, ops: [{ op: 'mode', mode: 'ascii' }, { op: 'var', name: 'space', value: 2 }] });
    expect(out.text).not.toMatch(/[╔═║]/u);
    expect(canvasVars(out.project.elements)).toEqual({ space: 2 });
    expect(() => callTool('edit_project', { project, ops: [{ op: 'mode', mode: 'neon' }] })).toThrow(/mode/);
    expect(() => callTool('edit_project', { project, ops: [{ op: 'var', name: 'x', value: 99 }] })).toThrow();
    expect(() => callTool('edit_project', { project, ops: [{ op: 'var', name: '<b>', value: 1 }] })).toThrow(/name/);
  });

  it('the live canvas tool checks its input before it dispatches', async () => {
    const sent = [], tool = editTools(() => ({ dispatch: a => sent.push(a) })).find(x => x.name === 'set_canvas');
    expect(await tool.execute({ mode: 'ascii', name: 'space', value: 2 })).toEqual({ ok: true });
    expect(sent).toEqual([{ type: 'CANVAS', mode: 'ascii' }, { type: 'CANVAS', name: 'space', value: 2 }]);
    expect((await tool.execute({ mode: 'neon' })).error).toBeTruthy();
    expect((await tool.execute({ name: 'space', value: 1.5 })).error).toBeTruthy();
    expect(sent).toHaveLength(2);
  });
});
