import { describe, it, expect } from 'vitest';
import {
  duplicateElement, reorderElement, nudgeElement, toAscii, trimText, toMarkdown,
  serializeProject, parseProject, createState,
} from './engine.js';

const els = () => [
  { id: 'a', col: 0, row: 0, width: 3, height: 1, template: ['abc'], label: 'A', presetId: 'a' },
  { id: 'b', col: 5, row: 5, width: 2, height: 1, template: ['xy'], label: 'B', presetId: 'b' },
];

describe('canvas features', () => {
  it('duplicates offset and on top, staying inside the canvas', () => {
    const r = duplicateElement(els(), 'a', 10, 5);
    expect(r.elements).toHaveLength(3);
    expect(r.elements.at(-1)).toMatchObject({ col: 2, row: 1, template: ['abc'] });
    expect(r.id).toBe(r.elements.at(-1).id);
    const edge = duplicateElement([{ ...els()[0], col: 8 }], 'a', 10, 5);
    expect(edge.elements[1].col).toBe(7);
    expect(duplicateElement(els(), 'nope').id).toBeNull();
  });
  it('reorders to front and back', () => {
    expect(reorderElement(els(), 'a', 'front').map(e => e.id)).toEqual(['b', 'a']);
    expect(reorderElement(els(), 'b', 'back').map(e => e.id)).toEqual(['b', 'a']);
  });
  it('nudges but never off the canvas', () => {
    expect(nudgeElement(els(), 'a', -1, -1, 10, 10)[0]).toMatchObject({ col: 0, row: 0 });
    expect(nudgeElement(els(), 'b', 9, 9, 10, 10)[1]).toMatchObject({ col: 8, row: 9 });
  });
  it('converts box drawing to plain ASCII', () => {
    expect(toAscii('┌──┐\n│ok│\n└──┘ ✓')).toBe('+--+\n|ok|\n+--+ x');
    expect(toAscii('café')).toBe('caf?');
  });
  it('trims padding and fences markdown', () => {
    expect(trimText('a  \n  \nb   \n\n\n')).toBe('a\n\nb');
    expect(toMarkdown('hi   \n\n')).toBe('```\nhi\n```');
  });
  it('round-trips a project and rejects junk', () => {
    const state = { ...createState(20, 10), elements: els() };
    const back = parseProject(serializeProject(state));
    expect(back.cols).toBe(20);
    expect(back.elements.map(e => e.template)).toEqual([['abc'], ['xy']]);
    expect(parseProject('not json')).toBeNull();
    expect(parseProject('{"elements":3}')).toBeNull();
    expect(parseProject('{"elements":[{"template":[1]}]}').elements).toEqual([]);
  });
});
