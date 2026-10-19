import { useRef, useCallback, useMemo, useEffect } from 'react';
import { tip, strokeCells } from '../lib/brush.js';
import { marquee, wand, shiftCells } from '../lib/select.js';
import { gradientMarks } from '../lib/gradient.js';
import { drawCell } from '../lib/draw.js';

// The cell tools on the canvas: brush, eraser, marquee and magic wand. Pointer events, so a finger works
// as well as a mouse. A brush stroke lands as one paint on release; a marquee drag or a wand tap picks
// cells; a drag that starts inside the picked cells moves what they hold. Each is one step of undo.
const TOOLS = new Set(['brush', 'eraser', 'gradient', 'adjust', 'marquee', 'wand']);

export function useBrush({ tool, brush, cols, rows, grid, cellAt, redraw, onPaint, selection = [], onSelect, onMove, onAdjust }) {
  const strokeRef = useRef(null); // { points } | { ramp: [a, b] } | { box: [a, b] } | { wand: cell } | { move: [from, to] }
  const active = TOOLS.has(tool);
  const picking = tool === 'marquee' || tool === 'wand';
  const picked = useMemo(() => new Set(selection.map(([c, r]) => `${c},${r}`)), [selection]);
  useEffect(() => { if (active) redraw(null); }, [selection]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerDown = useCallback(e => {
    if (!active || e.button > 0) return;
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* a pointer the browser no longer tracks: carry on without capture */ }
    const { col, row } = cellAt(e), at = [col, row];
    if (tool === 'gradient') strokeRef.current = { ramp: [at, at] };
    else if (tool === 'adjust') strokeRef.current = { box: [at, at] };
    else if (!picking) strokeRef.current = { points: [at] };
    else if (picked.has(`${col},${row}`)) strokeRef.current = { move: [at, at] };
    else strokeRef.current = tool === 'marquee' ? { box: [at, at] } : { wand: at };
    redraw({ col, row });
  }, [active, picking, picked, tool, cellAt, redraw]);

  const onPointerMove = useCallback(e => {
    const s = strokeRef.current;
    if (!s) return;
    const { col, row } = cellAt(e), at = [col, row];
    if (s.points) { const last = s.points.at(-1); if (last[0] !== col || last[1] !== row) s.points.push(at); }
    else if (s.box) s.box[1] = at;
    else if (s.ramp) s.ramp[1] = at;
    else if (s.move) s.move[1] = at;
    redraw({ col, row });
  }, [cellAt, redraw]);

  const finish = useCallback(() => {
    const s = strokeRef.current;
    strokeRef.current = null;
    if (!s) return;
    if (s.points) onPaint(strokeCells(s.points, brush.size, cols, rows), tool === 'eraser' ? 'erase' : 'paint');
    else if (s.ramp) onPaint(gradientMarks(s.ramp[0], s.ramp[1], brush.ramp, cols, rows), 'marks');
    else if (s.box && tool === 'adjust') {
      const [a, b] = s.box, col = Math.min(a[0], b[0]), row = Math.min(a[1], b[1]);
      onAdjust?.(col, row, Math.abs(a[0] - b[0]) + 1, Math.abs(a[1] - b[1]) + 1);
    } else if (s.box) {
      const [a, b] = s.box;
      onSelect?.(a[0] === b[0] && a[1] === b[1] ? [] : marquee(a, b, cols, rows)); // a click clears
    } else if (s.wand) onSelect?.(wand(grid, s.wand[0], s.wand[1]));
    else if (s.move) {
      const [a, b] = s.move;
      if (a[0] !== b[0] || a[1] !== b[1]) onMove?.(b[0] - a[0], b[1] - a[1]);
    }
  }, [brush.size, brush.ramp, cols, rows, tool, grid, onPaint, onSelect, onMove, onAdjust]);

  /** The keyboard's Enter or Space at the cursor: paint, erase or pick there. */
  const tapAt = useCallback(({ col, row }) => {
    if (tool === 'gradient') onPaint(gradientMarks([col, row], [col + 7, row], brush.ramp, cols, rows), 'marks');
    else if (tool === 'wand') onSelect?.(wand(grid, col, row));
    else if (tool === 'marquee') onSelect?.(marquee([col, row], [col, row], cols, rows));
    else onPaint(strokeCells([[col, row]], brush.size, cols, rows), tool === 'eraser' ? 'erase' : 'paint');
  }, [tool, grid, brush.size, brush.ramp, cols, rows, onPaint, onSelect]);

  /** Draw the picked cells, the marquee being dragged, a move in progress, or the brush tip. */
  const preview = useCallback((ctx, hover, charW, charH, fontSize, colors) => {
    if (!active) return;
    const s = strokeRef.current;
    const fill = cells => { for (const [c, r] of cells) ctx.fillRect(c * charW, r * charH, charW, charH); };
    if (picking) {
      ctx.fillStyle = colors.erase;
      if (s?.move) {
        const [a, b] = s.move, dc = b[0] - a[0], dr = b[1] - a[1];
        fill(shiftCells(selection, dc, dr, cols, rows));
        ctx.fillStyle = colors.ink;
        for (const [c, r] of selection) {
          const ch = grid[r]?.[c];
          if (ch && ch !== ' ' && c + dc >= 0 && r + dr >= 0 && c + dc < cols && r + dr < rows) drawCell(ctx, ch, (c + dc) * charW, (r + dr) * charH, charW, charH, fontSize);
        }
      } else fill(s?.box ? marquee(s.box[0], s.box[1], cols, rows) : selection);
      return;
    }
    if (tool === 'adjust') {
      ctx.fillStyle = colors.erase;
      if (s?.box) fill(marquee(s.box[0], s.box[1], cols, rows));
      return;
    }
    if (tool === 'gradient') {
      ctx.fillStyle = colors.ink;
      if (s?.ramp) for (const [c, r, ch] of gradientMarks(s.ramp[0], s.ramp[1], brush.ramp, cols, rows)) drawCell(ctx, ch, c * charW, r * charH, charW, charH, fontSize);
      return;
    }
    if (!hover) return;
    const cells = s?.points ? strokeCells(s.points, brush.size, cols, rows) : tip(hover.col, hover.row, brush.size);
    ctx.fillStyle = tool === 'eraser' ? colors.erase : colors.ink;
    for (const [c, r] of cells) {
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      if (tool === 'eraser') ctx.fillRect(c * charW, r * charH, charW, charH);
      else drawCell(ctx, brush.char, c * charW, r * charH, charW, charH, fontSize);
    }
  }, [active, picking, selection, grid, brush, cols, rows, tool]);

  return { active, onPointerDown, onPointerMove, finish, tapAt, preview };
}
