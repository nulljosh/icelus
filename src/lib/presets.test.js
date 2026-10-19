import { describe, it, expect } from 'vitest';
import { PRESETS, CATEGORIES, getPreset } from './presets.js';

describe('PRESETS', () => {
  it('has at least one preset', () => {
    expect(PRESETS.length).toBeGreaterThan(0);
  });

  it('each preset has required fields', () => {
    PRESETS.forEach(p => {
      expect(typeof p.id).toBe('string');
      expect(typeof p.label).toBe('string');
      expect(typeof p.category).toBe('string');
      expect(Array.isArray(p.template)).toBe(true);
      expect(p.template.length).toBeGreaterThan(0);
      expect(typeof p.width).toBe('number');
      expect(typeof p.height).toBe('number');
    });
  });

  it('width/height match template dimensions', () => {
    PRESETS.forEach(p => {
      expect(p.height).toBe(p.template.length);
    });
  });
});

describe('CATEGORIES', () => {
  it('contains unique categories from PRESETS', () => {
    const expected = [...new Set(PRESETS.map(p => p.category))];
    expect(CATEGORIES).toEqual(expected);
  });
});

describe('getPreset', () => {
  it('returns preset by id', () => {
    const p = getPreset('button');
    expect(p).not.toBeNull();
    expect(p.id).toBe('button');
  });

  it('returns null for unknown id', () => {
    expect(getPreset('not-real')).toBeNull();
  });

  it('returns correct preset for each defined id', () => {
    PRESETS.forEach(p => {
      expect(getPreset(p.id)).toBe(p);
    });
  });
});

describe('part packs', () => {
  it('ships four packs of four, boxes rectangular, found by id', async () => {
    const { PACKS, PACK_CATEGORIES, getPreset } = await import('./presets.js');
    expect(PACK_CATEGORIES).toEqual(['iOS', 'Material', 'Terminal', 'Email']);
    expect(PACKS).toHaveLength(16);
    for (const p of PACKS) {
      const widths = p.template.map(l => [...l].length);
      expect(p.width).toBe(Math.max(...widths));
      expect(p.height).toBe(p.template.length);
      if (/^[┌╭┏╔]/u.test(p.template[0])) expect(new Set(widths).size).toBe(1);
      expect(getPreset(p.id)).toBe(p);
    }
  });
});
