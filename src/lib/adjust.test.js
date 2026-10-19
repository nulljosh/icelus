import { describe, it, expect } from 'vitest';
import { ADJUSTMENTS, adjustChar, adjustLayer, renderElements, elementAt, parseProject, serializeProject, gridToText, trimText } from './engine.js';
import { parseSketch, screenTemplate } from './syntax.js';
import { paint } from './brush.js';
import { colorMask } from './color.js';

const text = (els, cols, rows) => trimText(gridToText(renderElements(els, cols, rows)));

describe('adjustment layers', () => {
  it('has one of each kind', () => {
    expect(ADJUSTMENTS).toEqual(['invert', 'dim', 'ascii', 'single', 'double', 'rounded', 'heavy']);
  });
  it('changes what is under it, in its area, and leaves the parts alone', () => {
    const box = screenTemplate('Home', '[Go]', 0, 0);
    const els = [...box, adjustLayer(0, 0, 40, 10, 'double')];
    expect(text(els, 40, 10).split('\n')[0]).toMatch(/^╔═ Home ═/);
    expect(els[0].template[0]).toMatch(/^┌─ Home/);
    expect(text([...box, adjustLayer(0, 0, 3, 1, 'double')], 40, 10).split('\n')[0]).toMatch(/^╔═ Home ─/);
  });
  it('a part above the adjustment is left alone', () => {
    const [b] = parseSketch('[Go]', 0, 0);
    expect(text([adjustLayer(0, 0, 10, 1, 'ascii'), paint([], [[0, 0]], '█')[0], b], 10, 1)).toBe('[ Go ]');
    expect(text([paint([], [[7, 0]], '█')[0], adjustLayer(0, 0, 10, 1, 'ascii')], 10, 1)).toBe('       #');
  });
  it('invert, dim and ascii', () => {
    expect([...'█░▒ ▀a'].map(c => adjustChar(c, 'invert')).join('')).toBe(' ▓▒█▄a');
    expect([...'█▓▒░━║a'].map(c => adjustChar(c, 'dim')).join('')).toBe('▓▒░ ─│a');
    expect([...'┌─…é'].map(c => adjustChar(c, 'ascii')).join('')).toBe('+-.?');
    expect(adjustChar('╔', 'heavy')).toBe('┏');
    expect(adjustChar('x', 'nope')).toBe('x');
  });
  it('is never picked by a click, keeps the colors under it, and survives a save', () => {
    const [b] = parseSketch('[Go]', 0, 0);
    const els = [{ ...b, ink: 1 }, adjustLayer(0, 0, 10, 1, 'invert')];
    expect(elementAt(els, 2, 0).presetId).toBe('button');
    expect(colorMask(els, 10, 1).ink[0][0]).toBe(1);
    const back = parseProject(serializeProject({ cols: 10, rows: 1, elements: els })).elements[1];
    expect(back).toMatchObject({ presetId: 'adjust', adjust: 'invert', width: 10, height: 1 });
    const bad = parseProject(serializeProject({ cols: 10, rows: 1, elements: [{ ...els[1], adjust: 'explode' }] })).elements[0];
    expect(bad.adjust).toBeUndefined();
    expect(text([bad], 10, 1)).toBe('');
  });
});
