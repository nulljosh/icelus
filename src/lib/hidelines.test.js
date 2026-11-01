import { describe, it, expect } from 'vitest';
import { updateElement, serializeProject, parseProject, gridToText } from './engine.js';
import { renderElements, shownPart } from './lines.js';

// Show and hide per copy: a symbol copy leaves out a line of itself without detaching.
describe('hide lines per copy', () => {
  const card = { id: 'a', presetId: 'card', label: 'Card', template: ['┌────┐', '│ Hi │', '│ Yo │', '└────┘'], width: 6, height: 4, col: 0, row: 0, symbol: 's1' };
  const text = els => gridToText(renderElements(els, 6, 4));

  it('a hidden line is not drawn, and the real look sees it blank', () => {
    const hid = updateElement([card], 'a', { hideLines: [2] });
    expect(hid[0].hideLines).toEqual([2]);
    expect(text(hid)).toContain('Hi');
    expect(text(hid)).not.toContain('Yo');
    expect(shownPart(hid[0]).template[2].trim()).toBe('');
  });

  it('only a symbol copy hides lines, never all of them, and it survives a save', () => {
    const plain = { ...card, symbol: undefined };
    expect(updateElement([plain], 'a', { hideLines: [1] })[0].hideLines).toBeUndefined();
    expect(updateElement([card], 'a', { hideLines: [0, 1, 2, 3] })[0].hideLines).toBeUndefined();
    const hid = updateElement([card], 'a', { hideLines: [1] });
    const back = parseProject(serializeProject({ cols: 10, rows: 6, elements: hid }));
    expect(back.elements[0].hideLines).toEqual([1]);
    expect(updateElement(hid, 'a', { hideLines: [] })[0].hideLines).toBeUndefined();
  });
});
