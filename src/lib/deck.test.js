import { describe, it, expect } from 'vitest';
import { slides, slideSize, toDeck } from './deck.js';
import { parseSketch } from './syntax.js';
import { screenFrame } from './lines.js';

const screen = (text, col, row) => ({ id: text, presetId: 'screen', label: 'Screen', text, col, row, width: 20, height: 6, template: screenFrame(text, 20, 6) });

describe('decks', () => {
  it('one slide per screen in reading order, cropped to the frame', () => {
    const els = [screen('Two', 30, 0), screen('Three', 0, 10), screen('One', 0, 0), ...parseSketch('[Go]', 1, 2)];
    const list = slides(els, 60, 20);
    expect(list.map(s => s.title)).toEqual(['One', 'Two', 'Three']);
    expect(list[0].text.split('\n')[0]).toMatch(/^┌─ One/);
    expect(list[0].text).toContain('[ Go ]');
    expect(list[1].text).not.toContain('Go');
  });
  it('no screens is one slide of the canvas, an empty canvas none, hidden screens skipped', () => {
    expect(slides(parseSketch('[Go]', 1, 1), 20, 5)).toEqual([{ title: 'Icelus', text: '\n [ Go ]' }]);
    expect(slides([], 20, 5)).toEqual([]);
    expect(slides([{ ...screen('Gone', 0, 0), hidden: true }, screen('Here', 0, 8)], 30, 20).map(s => s.title)).toEqual(['Here']);
  });
  it('sizes a slide by its widest line and its lines', () => {
    expect(slideSize('ab\nabcd\n')).toEqual({ w: 4, h: 3 });
  });
  it('a deck file that escapes every title and line and prints a page a slide', () => {
    const evil = '<script>alert(1)</script>';
    const html = toDeck([screen(evil, 0, 0)], 30, 10, evil);
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('break-after: page');
    expect(html.match(/<section/g)).toHaveLength(1);
    expect(toDeck([], 10, 5)).toContain('No screens yet.');
  });
});
