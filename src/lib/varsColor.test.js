import { describe, it, expect } from 'vitest';
import { createElement, updateElement, serializeProject, parseProject } from './engine.js';
import { getPreset } from './presets.js';
import { callTool } from './tools.js';
import { setColorVar, setWidthVar, setColorMode, bindVar, canvasColors, canvasWidths, colorMode, setMode, VAR_MAX } from './modes.js';

describe('color and width variables', () => {
  const card = () => createElement(getPreset('card'), 2, 2);

  it('a part bound to a color follows it, and the color mode flips every bound part', () => {
    const a = card(), b = { ...card(), col: 20 };
    let els = setColorVar([a, b], 'brand', [4, 12]);
    els = updateElement(els, a.id, { bind: { key: 'ink', name: 'brand' } });
    els = updateElement(els, b.id, { bind: { key: 'paper', name: 'brand' } });
    expect(els.find(e => e.id === a.id).ink).toBe(4);
    expect(els.find(e => e.id === b.id).paper).toBe(4);
    els = setColorVar(els, 'brand', [1, 9]);
    expect(els.find(e => e.id === a.id).ink).toBe(1);
    els = setColorMode(els, 'dark');
    expect(colorMode(els)).toBe('dark');
    expect(els.find(e => e.id === a.id).ink).toBe(9);
    expect(els.find(e => e.id === b.id).paper).toBe(9);
    els = setColorMode(els, 'light');
    expect(els.find(e => e.id === a.id).ink).toBe(1);
  });

  it('a part bound to a width resizes with it', () => {
    const a = card();
    let els = setWidthVar([a], 'col', 30);
    els = updateElement(els, a.id, { bind: { key: 'width', name: 'col' } });
    expect(els.find(e => e.id === a.id).width).toBe(30);
    els = setWidthVar(els, 'col', 18);
    const after = els.find(e => e.id === a.id);
    expect(after.width).toBe(18);
    expect(after.template.every(line => [...line].length <= 18)).toBe(true);
  });

  it('picking a color by hand or removing the variable lets go and keeps the value', () => {
    const a = card();
    let els = setColorVar([a], 'brand', [4, 12]);
    els = updateElement(els, a.id, { bind: { key: 'ink', name: 'brand' } });
    const byHand = updateElement(els, a.id, { ink: 2 });
    expect(byHand.find(e => e.id === a.id)).toMatchObject({ ink: 2 });
    expect(byHand.find(e => e.id === a.id).inkVar).toBeUndefined();
    const removed = setColorVar(els, 'brand', null);
    expect(removed.find(e => e.id === a.id).ink).toBe(4);
    expect(removed.find(e => e.id === a.id).inkVar).toBeUndefined();
    expect(removed.some(e => e.canvas)).toBe(false); // nothing left on the canvas part, so it goes
  });

  it('refuses bad names, bad colors, unknown bindings and a thirteenth variable', () => {
    const a = card();
    expect(setColorVar([a], 'Bad Name', [1, 2])).toEqual([a]);
    expect(setColorVar([a], 'x', [1, 99])).toEqual([a]);
    expect(bindVar([a], a.id, 'ink', 'nope')).toEqual([a]);
    let els = [a];
    for (let i = 0; i < VAR_MAX; i++) els = setWidthVar(els, `w${i}`, 10);
    expect(Object.keys(canvasWidths(setWidthVar(els, 'one-more', 10)))).toHaveLength(VAR_MAX);
  });

  it('lives beside the line mode and survives a save and load', () => {
    const a = card();
    let els = setMode(setColorVar([a], 'brand', [4, 12]), 'heavy');
    els = setWidthVar(els, 'col', 24);
    els = updateElement(els, a.id, { bind: { key: 'ink', name: 'brand' } });
    els = updateElement(els, a.id, { bind: { key: 'width', name: 'col' } });
    els = setColorMode(els, 'dark');
    const back = parseProject(serializeProject({ cols: 60, rows: 20, elements: els })).elements;
    expect(canvasColors(back)).toEqual({ brand: [4, 12] });
    expect(canvasWidths(back)).toEqual({ col: 24 });
    expect(colorMode(back)).toBe('dark');
    const part = back.find(e => !e.canvas);
    expect(part).toMatchObject({ inkVar: 'brand', widthVar: 'col', ink: 12, width: 24 });
    expect(back.find(e => e.canvas).adjust).toBe('heavy');
  });

  it('agents set variables and bind parts through edit_project', () => {
    const project = JSON.parse(serializeProject({ cols: 40, rows: 12, elements: [card()] }));
    const out = callTool('edit_project', { project, ops: [
      { op: 'color_var', name: 'brand', light: 4, dark: 12 }, { op: 'width_var', name: 'col', width: 22 },
      { op: 'bind', index: 0, key: 'ink', name: 'brand' }, { op: 'bind', index: 0, key: 'width', name: 'col' }, { op: 'color_mode', mode: 'dark' },
    ] });
    expect(out.project.elements.find(e => !e.canvas)).toMatchObject({ ink: 12, width: 22, inkVar: 'brand', widthVar: 'col' });
    expect(() => callTool('edit_project', { project, ops: [{ op: 'color_var', name: 'x', light: 1, dark: 40 }] })).toThrow(/dark/);
    expect(() => callTool('edit_project', { project, ops: [{ op: 'bind', index: 0, key: 'ink', name: 'nope' }] })).toThrow(/name/);
    expect(() => callTool('edit_project', { project, ops: [{ op: 'bind', index: 0, key: 'height', name: null }] })).toThrow(/key/);
  });
});
