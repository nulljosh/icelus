import { describe, it, expect } from 'vitest';
import { createElement, updateElement, makeSymbol, swapSymbol, serializeProject, parseProject } from './engine.js';
import { getPreset } from './presets.js';
import { callTool } from './tools.js';

describe('symbol properties', () => {
  const copy = (col, symbol) => ({ ...createElement(getPreset('button'), col, 0), symbol });
  const a = copy(0, 's1'), b = copy(10, 's1'), c = copy(20, 's1'), card = { ...createElement(getPreset('card'), 0, 5), symbol: 's2' };
  const els = [a, b, c, card];
  const get = (list, id) => list.find(el => el.id === id);

  it('a copy that owns its words keeps them while style still follows', () => {
    let out = updateElement(els, b.id, { own: ['text'] });
    out = updateElement(out, b.id, { text: 'Mine' });
    expect(get(out, b.id).template.join('')).toContain('Mine');
    expect(get(out, a.id).template.join('')).not.toContain('Mine');
    out = updateElement(out, a.id, { text: 'Shared' });
    expect(get(out, c.id).template.join('')).toContain('Shared');
    expect(get(out, b.id).template.join('')).toContain('Mine');
    out = updateElement(out, a.id, { style: 'double' });
    expect(get(out, b.id).style).toBe('double');
    // letting go pulls the shared words back
    out = updateElement(out, b.id, { own: [] });
    expect(get(out, b.id).own).toBeUndefined();
    expect(get(out, b.id).template).toEqual(get(out, a.id).template);
  });

  it('owning style keeps the copy out of style changes', () => {
    let out = updateElement(els, c.id, { own: ['style', 'junk'] });
    expect(get(out, c.id).own).toEqual(['style']);
    out = updateElement(out, a.id, { style: 'heavy' });
    expect(get(out, c.id).style).toBeUndefined();
    expect(get(out, b.id).style).toBe('heavy');
  });

  it('swaps a copy to another symbol in place', () => {
    const out = swapSymbol(els, b.id, 's2');
    expect(get(out, b.id).symbol).toBe('s2');
    expect(get(out, b.id).template).toEqual(card.template);
    expect([get(out, b.id).col, get(out, b.id).row]).toEqual([10, 0]);
    const owned = swapSymbol(updateElement(els, b.id, { own: ['text'] }), b.id, 's2');
    expect(get(owned, b.id).template).toEqual(card.template);
    expect(get(owned, b.id).own).toBeUndefined();
    expect(get(owned, b.id).presetId).toBe('card');
    expect(swapSymbol(els, b.id, 'nope')).toBe(els);
    expect(swapSymbol(els, b.id, 's1')).toBe(els);
  });

  it('keeps own in the file and edit_project owns and swaps', () => {
    const owned = updateElement(els, b.id, { own: ['text'] });
    expect(parseProject(serializeProject({ cols: 60, rows: 20, elements: owned })).elements[1].own).toEqual(['text']);
    expect(parseProject(JSON.stringify({ elements: [{ ...a, symbol: undefined, own: ['text'] }] })).elements[0].own).toBeUndefined();
    const project = JSON.parse(serializeProject({ cols: 60, rows: 20, elements: els }));
    const out = callTool('edit_project', { project, ops: [{ op: 'own', index: 1, text: true }, { op: 'text', index: 1, text: 'Solo' }, { op: 'swap', index: 2, with: 3 }] });
    expect(out.project.elements[1].own).toEqual(['text']);
    expect(out.project.elements[0].template.join('')).not.toContain('Solo');
    expect(out.project.elements[2].template).toEqual(card.template);
    expect(() => callTool('edit_project', { project, ops: [{ op: 'swap', index: 0, with: 0 }] })).not.toThrow();
  });
});
