// A photo as block characters: two pixel rows per text row with half blocks, the same trick as the
// banner font, dithered (Floyd-Steinberg) so shading survives one bit per pixel.
// Ported line for line in ios/App/Photo.swift.

// A half-block pixel is about one character wide and half a row tall, so it is a little taller than wide.
export const PIXEL_ASPECT = 0.84;

export function photoSize(width, height, cols = 60) {
  const pixelRows = Math.max(2, Math.round((cols * height / width) * PIXEL_ASPECT / 2) * 2);
  return { cols, pixelRows };
}

// Three looks: blocks (two pixels a cell, ▀ ▄ █), braille (eight dots a cell, the finest) and shade (one
// pixel a cell in ░ ▒ ▓ █, soft and undithered). photoGrid says how many pixels to sample for each.
export const PHOTO_LOOKS = ['blocks', 'braille', 'shade'];
export function photoGrid(width, height, cols = 60, look = 'blocks') {
  const rows = Math.max(1, Math.round((cols * height / width) * PIXEL_ASPECT / 2));
  if (look === 'braille') return { w: cols * 2, h: rows * 4 };
  if (look === 'shade') return { w: cols, h: rows };
  return { w: cols, h: rows * 2 };
}

// Stretch to the full range, so a flat, grey photo still has blacks and whites.
function stretch(gray) {
  let lo = 255, hi = 0;
  for (const g of gray) { if (g < lo) lo = g; if (g > hi) hi = g; }
  // A flat image has nothing to stretch: keep its own brightness, or blank white would come out black.
  if (hi - lo < 1) return Float32Array.from(gray);
  return Float32Array.from(gray, g => ((g - lo) / (hi - lo)) * 255);
}

const BRAILLE = [[0x01, 0x08], [0x02, 0x10], [0x04, 0x20], [0x40, 0x80]]; // dot bits by row, then column
export function photoToText(gray, w, h, look = 'blocks') {
  if (look === 'blocks') return photoToBlocks(gray, w, h);
  if (look === 'shade') {
    const px = stretch(gray), lines = [];
    for (let y = 0; y < h; y++) lines.push(Array.from({ length: w }, (_, x) => ' ░▒▓█'[4 - Math.min(4, Math.floor(px[y * w + x] / 51.2))]).join(''));
    return lines;
  }
  const ink = dither(gray, w, h), lines = [];
  for (let y = 0; y < h; y += 4) {
    let line = '';
    for (let x = 0; x < w; x += 2) {
      let bits = 0;
      for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 2; dx++)
        if (y + dy < h && x + dx < w && ink[(y + dy) * w + x + dx]) bits |= BRAILLE[dy][dx];
      line += String.fromCharCode(0x2800 + bits);
    }
    lines.push(line);
  }
  return lines;
}

// One bit a pixel, Floyd-Steinberg dithered so shading survives.
function dither(gray, cols, pixelRows) {
  const px = stretch(gray);
  const ink = new Uint8Array(cols * pixelRows);
  for (let y = 0; y < pixelRows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x, old = px[i], on = old < 128;
      ink[i] = on ? 1 : 0;
      const err = old - (on ? 0 : 255);
      if (x + 1 < cols) px[i + 1] += err * 7 / 16;
      if (y + 1 < pixelRows) {
        if (x > 0) px[i + cols - 1] += err * 3 / 16;
        px[i + cols] += err * 5 / 16;
        if (x + 1 < cols) px[i + cols + 1] += err / 16;
      }
    }
  }
  return ink;
}

// gray: brightness 0 (black) to 255 (white), row by row, cols wide and pixelRows tall. Dark pixels are ink.
export function photoToBlocks(gray, cols, pixelRows) {
  const ink = dither(gray, cols, pixelRows);
  const lines = [];
  for (let y = 0; y < pixelRows; y += 2) {
    let line = '';
    for (let x = 0; x < cols; x++) {
      const top = ink[y * cols + x], bottom = y + 1 < pixelRows && ink[(y + 1) * cols + x];
      line += top && bottom ? '█' : top ? '▀' : bottom ? '▄' : ' ';
    }
    lines.push(line);
  }
  return lines;
}
