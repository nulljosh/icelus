import { describe, it, expect } from 'vitest';
import { toPalettePart, parsePalette, addToPalette, MINE } from './palette.js';

const card = { id: 'el-1', presetId: 'card', label: 'Card', template: ['┌──┐', '└──┘'], width: 4, height: 2, col: 0, row: 0 };

describe('my palette', () => {
  it('saves a part under Mine with a fresh name, its style baked in', () => {
    const first = toPalettePart(card);
    expect([first.label, first.category, first.width, first.height]).toEqual(['Card', MINE, 4, 2]);
    expect(toPalettePart(card, [first]).label).toBe('Card 2');
    expect(toPalettePart({ ...card, style: 'rounded' }).template).toEqual(['╭──╮', '╰──╯']);
  });

  it('reads back only well-formed parts', () => {
    const good = addToPalette([], card);
    const raw = JSON.stringify([...good, { id: 'x', label: 'Bad', template: ['a'] }, { id: 'mine-2', label: 'No', template: [1] }, null]);
    expect(parsePalette(raw).map(p => p.label)).toEqual(['Card']);
    expect(parsePalette('{nope')).toEqual([]);
    expect(parsePalette(JSON.stringify({ a: 1 }))).toEqual([]);
  });
});
