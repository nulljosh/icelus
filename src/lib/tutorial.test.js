import { describe, it, expect } from 'vitest';
import { TUTORIAL, lessonSnapshot, stepDone, newestButton } from './tutorial.js';
import { createElement, updateElement, moveElement } from './engine.js';
import { getPreset } from './presets.js';

describe('tutorial', () => {
  const button = getPreset('button');
  it('walks pick, place, edit, move and copy in order', () => {
    expect(TUTORIAL.at(-1)).toBe('done');
    let elements = [], start = lessonSnapshot(elements);
    expect(stepDone('pick', { selectedPreset: null, elements }, start)).toBe(false);
    expect(stepDone('pick', { selectedPreset: button, elements }, start)).toBe(true);
    const b = createElement(button, 2, 2);
    elements = [b];
    expect(stepDone('place', { elements }, start)).toBe(true);
    expect(newestButton(elements, start)).toBe(b.id);
    start = lessonSnapshot(elements);
    expect(stepDone('edit', { elements }, start)).toBe(false);
    elements = updateElement(elements, b.id, { text: '[ Sign up ]' });
    expect(stepDone('edit', { elements }, start)).toBe(true);
    start = lessonSnapshot(elements);
    elements = moveElement(elements, b.id, 10, 5);
    expect(stepDone('move', { elements }, start)).toBe(true);
    start = lessonSnapshot(elements, 3);
    expect(stepDone('copy', { elements, copies: 3 }, start)).toBe(false);
    expect(stepDone('copy', { elements, copies: 4 }, start)).toBe(true);
  });
  it('ignores buttons that were already there', () => {
    const old = createElement(button, 0, 0), start = lessonSnapshot([old]);
    expect(stepDone('place', { elements: [old] }, start)).toBe(false);
    expect(stepDone('edit', { elements: [createElement(button, 5, 5)] }, start)).toBe(false);
  });
});
