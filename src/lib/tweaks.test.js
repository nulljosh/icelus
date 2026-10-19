import { describe, it, expect } from 'vitest';
import { screenTweaks, tweakScreen } from './tweaks.js';
import { screenFrame } from './lines.js';

const screen = { id: 's', presetId: 'screen', label: 'Screen', text: 'Home', col: 0, row: 0, width: 20, height: 12, template: screenFrame('Home', 20, 12) };
const part = (id, col, row, width = 6, height = 1, template = ['[ OK ]']) => ({ id, presetId: 'button', label: 'Button', col, row, width, height, template });
const card = { id: 'c', presetId: 'card', label: 'Card', col: 2, row: 6, width: 4, height: 2, template: ['┌──┐', '└──┘'] };
const outside = { ...card, id: 'o', col: 30, row: 0 };
const els = [screen, part('a', 3, 2), part('b', 11, 2), card, outside];

describe('tweaks', () => {
  it('reads the spacing between bands and the padding inside the frame', () => {
    expect(screenTweaks(els, screen)).toEqual({ spacing: 3, padding: 1 });
  });
  it('restacks bands with the new spacing and keeps columns', () => {
    const out = tweakScreen(els, 's', { spacing: 0 });
    expect(out.find(e => e.id === 'c').row).toBe(3);
    expect(out.find(e => e.id === 'b')).toMatchObject({ col: 11, row: 2 });
  });
  it('moves everything in by the padding', () => {
    const out = tweakScreen(els, 's', { padding: 3 });
    expect(out.find(e => e.id === 'a')).toMatchObject({ col: 5, row: 4 });
    expect(out.find(e => e.id === 'c')).toMatchObject({ col: 4, row: 8 });
  });
  it('grows the frame when the parts need room', () => {
    const s = tweakScreen(els, 's', { spacing: 8 }).find(e => e.id === 's');
    expect(s.height).toBe(15);
    expect(s.template).toHaveLength(15);
  });
  it('gives every box in the screen one style and leaves the rest alone', () => {
    const out = tweakScreen(els, 's', { style: 'double' });
    expect(out.find(e => e.id === 'c').style).toBe('double');
    expect(out.find(e => e.id === 's').style).toBe('double');
    expect(out.find(e => e.id === 'o').style).toBeUndefined();
    expect(out.find(e => e.id === 'a').style).toBeUndefined();
    expect(tweakScreen(out, 's', { style: 'single' }).find(e => e.id === 'c').style).toBeUndefined();
  });
  it('leaves locked parts and non-screens alone', () => {
    const locked = els.map(e => (e.id === 'c' ? { ...e, locked: true } : e));
    expect(tweakScreen(locked, 's', { spacing: 0 }).find(e => e.id === 'c').row).toBe(6);
    expect(tweakScreen(els, 'a', { spacing: 0 })).toBe(els);
  });
});

describe('tweak through the engine and the API', async () => {
  const { updateElement } = await import('./engine.js');
  const { callTool } = await import('./tools.js');
  it('routes a tweak through updateElement', () => {
    expect(updateElement(els, 's', { tweak: { spacing: 0 } }).find(e => e.id === 'c').row).toBe(3);
  });
  it('takes a tweak op in edit_project', async () => {
    const project = { blockprint: 1, cols: 40, rows: 20, elements: els };
    const out = await callTool('edit_project', { project, ops: [{ op: 'tweak', index: 0, spacing: 0, style: 'rounded' }] });
    expect(out.project.elements.find(e => e.presetId === 'card')).toMatchObject({ row: 3, style: 'rounded' });
  });
});

describe('variations', async () => {
  const { variations, keepVariation, relayout } = await import('./tweaks.js');
  const { parseProject, serializeProject } = await import('./engine.js');
  const inside = (all, s) => all.filter(e => e.id !== s.id && e.presetId !== 'screen' && e.col >= s.col && e.row >= s.row && e.col + e.width <= s.col + s.width && e.row + e.height <= s.row + s.height);
  it('stacks one part a row', () => {
    const out = relayout(els, 's', 'stacked');
    expect(['a', 'b', 'c'].map(id => out.find(e => e.id === id)).map(e => [e.col, e.row])).toEqual([[2, 2], [2, 4], [2, 6]]);
  });
  it('splits into two columns', () => {
    const out = relayout(els, 's', 'split');
    const [a, b, c] = ['a', 'b', 'c'].map(id => out.find(e => e.id === id));
    expect(a.col).toBe(2); expect(b.col).toBeGreaterThan(a.col + a.width); expect(c.col).toBe(2);
  });
  it('makes three named takes to the right, each holding every part', () => {
    const { elements, ids } = variations(els, 's');
    expect(ids).toHaveLength(3);
    const screens = ids.map(id => elements.find(e => e.id === id));
    expect(screens.map(s => s.text)).toEqual(['Home stacked', 'Home split', 'Home dense']);
    for (const s of screens) expect(inside(elements, s)).toHaveLength(3);
    expect(screens[0].col).toBeGreaterThan(34); // past the outside card at 30..34
    expect(inside(elements, screens[0]).some(e => e.id === 'o')).toBe(false);
    expect(new Set(elements.filter(e => e.presetId === 'screen' && e.id !== 'o').map(e => e.take)).size).toBe(1);
  });
  it('keeps one take and clears the rest, parts and all', () => {
    const { elements, ids } = variations(els, 's');
    const kept = keepVariation(elements, ids[1]);
    expect(kept.filter(e => e.presetId === 'screen').map(e => e.id)).toEqual([ids[1]]);
    expect(kept.find(e => e.id === ids[1]).take).toBeUndefined();
    expect(kept.find(e => e.id === 'o')).toBeDefined();
    expect(kept.length).toBe(1 + 3 + 1);
  });
  it('the tag rides in the project file', () => {
    const { elements } = variations(els, 's');
    const back = parseProject(serializeProject({ cols: 200, rows: 50, elements }));
    expect(back.elements.filter(e => e.take).length).toBe(4);
  });
});

describe('variations for agents', async () => {
  const { callTool } = await import('./tools.js');
  it('edit_project makes takes and keeps one', async () => {
    const project = { blockprint: 1, cols: 200, rows: 40, elements: els };
    const made = await callTool('edit_project', { project, ops: [{ op: 'variations', index: 0 }] });
    const screens = made.project.elements.filter(e => e.presetId === 'screen');
    expect(screens).toHaveLength(4);
    const keepIndex = made.project.elements.findIndex(e => e.text === 'Home split');
    const kept = await callTool('edit_project', { project: made.project, ops: [{ op: 'keep', index: keepIndex }] });
    expect(kept.project.elements.filter(e => e.presetId === 'screen').map(e => e.text)).toEqual(['Home split']);
  });
});
