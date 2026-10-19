import { describe, it, expect } from 'vitest';
import { realPart, rowsOfText } from './real.js';
import { createElement } from './engine.js';
import { PRESETS } from './presets.js';
import { parseSketch, screenTemplate } from './syntax.js';
import { paint } from './brush.js';

const part = id => createElement(PRESETS.find(p => p.id === id), 0, 0);

describe('the real look', () => {
  it('reads controls as the controls they are', () => {
    const [email, check, go] = parseSketch('"Email"\n[x] Remember me\n[Sign in]', 0, 0);
    expect(realPart(email)).toEqual({ kind: 'input', placeholder: 'Email' });
    expect(realPart(check)).toEqual({ kind: 'checkbox', on: true, label: 'Remember me' });
    expect(realPart(go)).toEqual({ kind: 'button', label: 'Sign in' });
    expect(realPart(screenTemplate('Home', '[Go]')[0])).toEqual({ kind: 'screen', title: 'Home' });
  });
  it('gives every built-in part a real look or keeps its characters on purpose', () => {
    const kept = new Set(['chart', 'sparkline']);
    for (const p of PRESETS) {
      const r = realPart(part(p.id));
      if (kept.has(p.id)) expect(r, p.id).toBeNull();
      else expect(r, p.id).not.toBeNull();
    }
  });
  it('turns boxed parts into containers with their words, without the lines', () => {
    const card = realPart(part('card'));
    expect(card.kind).toBe('box');
    expect(card.rows.every(r => !/[─│┌┐└┘]/.test(r.text))).toBe(true);
    expect(rowsOfText({ template: ['┌─ Hi ─┐', '│ there │', '└──────┘'] })).toEqual([{ row: 0, col: 3, text: 'Hi' }, { row: 1, col: 2, text: 'there' }]);
    expect(rowsOfText({ template: ['│ [ Action ] │', '[x]', '[v Language]', '[a] and [b]'] })).toEqual([{ row: 0, col: 2, text: 'Action', button: true },
      { row: 1, col: 0, text: '[x]' }, { row: 2, col: 0, text: '[v Language]' }, { row: 3, col: 0, text: '[a] and [b]' }]);
  });
  it('reads toggles, sliders, segments and tags', () => {
    expect(realPart(part('toggle')).kind).toBe('toggle');
    expect(realPart(part('slider')).value).toBeGreaterThan(0);
    expect(realPart(part('segmented')).items.length).toBeGreaterThan(1);
    expect(realPart(part('tags')).items).toContain('Design');
  });
  it('keeps lines and paint as characters', () => {
    expect(realPart({ presetId: 'line', template: ['──▶'], width: 3, height: 1 })).toBeNull();
    expect(realPart(paint([], [[0, 0]], '█')[0])).toBeNull();
  });
});
