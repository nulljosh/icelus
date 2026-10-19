import { describe, it, expect } from 'vitest';
import { photoToBlocks, photoSize, photoGrid, photoToText } from './photo.js';

describe('photo to blocks', () => {
  it('draws black as full blocks and white as space, two pixel rows per line', () => {
    const gray = [0, 255, 0, 255, 255, 255, 0, 0]; // 2 wide, 4 tall
    expect(photoToBlocks(gray, 2, 4)).toEqual(['█ ', '▄▄']);
  });

  it('dithers mid grey to roughly half ink', () => {
    const lines = photoToBlocks(Array.from({ length: 40 * 40 }, (_, i) => (i === 0 ? 0 : i === 1 ? 255 : 128)), 40, 40);
    const cells = lines.join('');
    const ink = [...cells].reduce((n, c) => n + (c === '█' ? 2 : c === ' ' ? 0 : 1), 0);
    expect(ink / (40 * 40)).toBeGreaterThan(0.4);
    expect(ink / (40 * 40)).toBeLessThan(0.6);
  });

  it('stretches a flat photo to full contrast', () => {
    expect(photoToBlocks([100, 100, 140, 140], 2, 2)).toEqual(['▀▀']);
  });

  it('keeps the photo shape in whole rows', () => {
    expect(photoSize(1000, 1000, 60)).toEqual({ cols: 60, pixelRows: 50 });
    expect(photoSize(4000, 100, 60).pixelRows).toBe(2);
  });
});

describe('photo looks', () => {
  const ramp = (w, h) => Array.from({ length: w * h }, (_, i) => (i % w) * (255 / (w - 1)));

  it('sizes each look and draws braille at eight dots a cell', () => {
    expect(photoGrid(100, 50, 20, 'blocks')).toEqual({ w: 20, h: 8 });
    expect(photoGrid(100, 50, 20, 'braille')).toEqual({ w: 40, h: 16 });
    expect(photoGrid(100, 50, 20, 'shade')).toEqual({ w: 20, h: 4 });
    expect(photoToText(Array(8).fill(0), 2, 4, 'braille')).toEqual(['⣿']);
    expect(photoToText(Array(8).fill(255), 2, 4, 'braille')).toEqual(['⠀']);
  });

  it('shades dark to light without dithering', () => {
    expect(photoToText(ramp(5, 1), 5, 1, 'shade')).toEqual(['█▓▒░ ']);
  });
});
