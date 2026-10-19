import { describe, it, expect } from 'vitest';
import { importText } from './importer.js';
import { renderElements, gridToText, trimText } from './engine.js';
import { SCREEN_TEMPLATES, screenTemplate } from './syntax.js';

const redraw = (els, cols = 80, rows = 30) => trimText(gridToText(renderElements(els, cols, rows)));

describe('import a text wireframe', () => {
  it('finds boxes, nested boxes and loose text, and draws back the same text', () => {
    const text = [
      '┌─ Home ─────────────────┐',
      '│ Welcome back           │',
      '│ ┌──────────┐           │',
      '│ │ [ Save ] │  [ Quit ] │',
      '│ └──────────┘           │',
      '└────────────────────────┘',
      '  Footer text   ───▶ next',
    ].join('\n');
    const els = importText(text);
    expect(els.filter(e => e.presetId === 'box')).toHaveLength(2);
    expect(els.filter(e => e.presetId === 'text').map(e => e.template[0])).toEqual(['Welcome back', 'Footer text', '───▶ next']);
    expect(els.filter(e => e.presetId === 'button').map(e => e.template[0])).toEqual(['[ Save ]', '[ Quit ]']);
    expect(redraw(els)).toBe(text);
  });

  it('round-trips every screen template and an ASCII box', () => {
    for (const t of SCREEN_TEMPLATES) {
      const drawn = redraw(screenTemplate(t.name, t.source));
      expect(redraw(importText(drawn))).toBe(drawn);
    }
    const ascii = '+------+\n| OK   |\n+------+\n[ Go ]';
    const els = importText(ascii);
    expect(els.map(e => e.presetId)).toEqual(['box', 'text', 'button']);
    expect(redraw(els)).toBe(ascii);
  });

  it('keeps a table whole', () => {
    const table = '┌──────┬──────┐\n│ Name │ Plan │\n├──────┼──────┤\n│ Ada  │ Pro  │\n└──────┴──────┘';
    const els = importText(table);
    expect(els.map(e => e.presetId)).toEqual(['box']);
    expect(redraw(els)).toBe(table);
  });

  it('keeps an unclosed box as plain text', () => {
    const text = '┌───\n│ hi';
    expect(importText(text).every(e => e.presetId === 'text')).toBe(true);
    expect(redraw(importText(text))).toBe(text);
  });
});

describe('text from other tools', () => {
  it('opens ASCIIFlow output (ASCII and Unicode modes)', () => {
    const ascii = '+--------+     +--------+\n|  Home  +---->|  Cart  |\n+--------+     +--------+';
    const unicode = '┌────────┐     ┌────────┐\n│  Home  ├────►│  Cart  │\n└────────┘     └────────┘';
    for (const text of [ascii, unicode]) {
      const els = importText(text);
      expect(redraw(els)).toBe(text);
    }
    expect(importText(unicode).filter(e => e.presetId === 'text').map(e => e.template[0])).toEqual(['Home', '────►', 'Cart']);
    expect(importText(ascii).filter(e => e.presetId === 'box')).toHaveLength(2);
  });

  it('opens Monodraw output with rounded corners and shadows', () => {
    const text = '╭──────────╮\n│  Search  │░\n╰──────────╯░\n ░░░░░░░░░░░░';
    const els = importText(text);
    expect(els[0].presetId).toBe('box');
    expect(redraw(els)).toBe(text);
  });
});
