// Canvas helpers: theme tokens, the font measure, the spoken description of a part and the scroll that
// reveals a picked part. Split from Canvas.jsx to keep each file small.
import { useEffect } from 'react';
import { t, partLabel } from '../i18n.js';
import { drawCell } from '../lib/draw.js';
import { COLORS } from '../lib/color.js';
import { gridColumns } from '../lib/grids.js';
import { opensScreen } from '../lib/hotspots.js';

export function token(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
// A part picked while out of view (a screen from Describe it, a layer from the list) scrolls in, clear of the
// chat panel that floats over the canvas's right edge. Parts already in view stay put.
export function useReveal(scrollRef, canvasRef, el, cols, rows) {
  useEffect(() => {
    const box = scrollRef.current, canvas = canvasRef.current;
    if (!el || !box || !canvas) return;
    const id = requestAnimationFrame(() => {
      const c = canvas.getBoundingClientRect(), s = box.getBoundingClientRect();
      const w = c.width / cols, h = c.height / rows;
      const x0 = c.left + el.col * w, x1 = x0 + el.width * w, y0 = c.top + el.row * h, y1 = y0 + el.height * h;
      const right = Math.min(s.right, document.querySelector('.chat')?.getBoundingClientRect().left ?? Infinity);
      const dx = x0 < s.left || x1 > right ? x0 - s.left - Math.max(16, (right - s.left - (x1 - x0)) / 2) : 0;
      const dy = y0 < s.top || y1 > s.bottom ? y0 - s.top - 16 : 0;
      if (dx || dy) box.scrollBy(dx, dy);
    });
    return () => cancelAnimationFrame(id);
  }, [el?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}

// The canvas is a character grid, so monospace is right here and only here; the UI around it is the system font.
export const FONT_FAMILY = () => token('--font-code', 'ui-monospace, monospace');

export function measureCharWidth(fontSize, fontFamily) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontSize}px ${fontFamily}`;
  return ctx.measureText('M').width;
}

// What a part is, for a screen reader: its kind, its words, where it is and how big.
export function describe(el) {
  const words = (el.text ?? el.template.join(' ')).replace(/[─│┌┐└┘├┤┬┴┼╭╮╰╯━┃═║▀▄█▌░▒▓_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return t('part_where', { label: partLabel({ id: el.presetId, label: el.label }), words: words ? `, ${words.slice(0, 80)}` : '',
    col: el.col + 1, row: el.row + 1, w: el.width, h: el.height });
}

// The grid's cells in view: paper first, then each mark in its ink, the accent, or the text color.
export function drawCells(ctx, grid, [r0, r1, c0, c1], charW, charH, fontSize, { accent, color, ink, lit }) {
  for (let r = r0; r < r1; r++) {
    for (let c = c0; c < c1; c++) {
      const p = color ? color.paper[r][c] : -1;
      if (p >= 0) {
        ctx.fillStyle = COLORS[p].hex;
        const x0 = Math.round(c * charW), y0 = Math.round(r * charH);
        ctx.fillRect(x0, y0, Math.round((c + 1) * charW) - x0, Math.round((r + 1) * charH) - y0);
      }
      const ch = grid[r][c];
      if (ch === ' ') continue;
      const i = color ? color.ink[r][c] : -1;
      ctx.fillStyle = i >= 0 ? COLORS[i].hex : accent?.[r][c] ? lit : ink;
      drawCell(ctx, ch, c * charW, r * charH, charW, charH, fontSize);
    }
  }
  ctx.fillStyle = ink;
}

// What sits over the cells: a thin outline round picked and grouped parts, a dashed one round each
// adjustment's area, a dot on the top right corner of a part with a note and a node right of a hotspot.
export function drawMarks(ctx, elements, outlinedIds, charW, charH, accent, selectedId) {
  ctx.strokeStyle = ctx.fillStyle = accent;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.08; // a screen's column grid (grids.js): faint bands, never in the text
  for (const s of elements) if (s.presetId === 'screen' && !s.hidden) for (const b of gridColumns(s)) ctx.fillRect(b.col * charW, (s.row + 1) * charH, b.width * charW, (s.height - 2) * charH);
  ctx.globalAlpha = 1;
  for (const el of elements) {
    if (outlinedIds.includes(el.id)) ctx.strokeRect(el.col * charW - 1.5, el.row * charH - 1.5, el.width * charW + 3, el.height * charH + 3);
  }
  ctx.setLineDash([3, 3]);
  for (const el of elements) if (el.presetId === 'adjust' && !el.hidden && !el.canvas) ctx.strokeRect(el.col * charW + 0.5, el.row * charH + 0.5, el.width * charW - 1, el.height * charH - 1);
  ctx.setLineDash([]);
  for (const el of elements) {
    if (el.hidden) continue;
    if (el.note) { ctx.beginPath(); ctx.arc((el.col + el.width) * charW, el.row * charH, 4, 0, Math.PI * 2); ctx.fill(); }
    const to = opensScreen(elements, el); // a hotspot: a node just right of it, and a dashed link when picked
    if (!to) continue;
    const x = (el.col + el.width) * charW + 6, y = (el.row + el.height / 2) * charH;
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.stroke();
    if (el.id !== selectedId && !outlinedIds.includes(el.id)) continue;
    ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(to.col * charW, (to.row + 0.5) * charH); ctx.stroke(); ctx.setLineDash([]);
  }
}
