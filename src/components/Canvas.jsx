import ElementOverlay from './ElementOverlay.jsx';
import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import './Canvas.css';
import { drawCell } from '../lib/draw.js';
import { token, FONT_FAMILY, measureCharWidth, describe, drawCells, drawMarks, useReveal } from './canvasHelpers.js';
import { colorMask, hasColor } from '../lib/color.js';
import { t, partLabel } from '../i18n.js';
import { useZoom, useFitFirstScreen } from './useZoom.js';
import { useBrush } from './useBrush.js';
import RealLayer from './RealLayer.jsx';
import { realPart } from '../lib/real.js';
import { pxToCell, stampComponent, elementAt, lineShape, snapPosition, styleChar, accentMask, renderElements } from '../lib/engine.js';

const FONT_SIZE = 14;
const LINE_HEIGHT = 20;

export default function Canvas({
  grid,
  cols,
  rows,
  cursor,
  selectedPreset,
  elements = [],
  selectedId = null,
  outlinedIds = [],
  onGroup,
  darkMode,
  trace = null,
  onPlaceComponent,
  onPlaceLine,
  onCursorMove,
  onSelectElement,
  onMoveElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicate,
  onReorder,
  onNudge,
  onUndo,
  onRedo,
  brush = { char: '█', size: 1 },
  onPaint,
  cells = {}, // { selection, onSelect, onMove } for the marquee and wand
  look = 'real', // real: parts as real controls (RealLayer); text: every part in characters
}) {
  const [editing, setEditing] = useState(false);
  // A text box or banner still showing its placeholder opens for typing as soon as it is selected.
  useEffect(() => {
    const el = elements.find(x => x.id === selectedId);
    setEditing(Boolean(el && ((el.presetId === 'text' && el.template.join('\n') === 'Text') || (el.presetId === 'banner' && el.text === 'TITLE'))));
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps
  const canvasRef = useRef(null);
  const charWRef = useRef(null);
  const hoverRef = useRef(null);
  const { zoom, zoomRef, zoomTo, scrollRef, drawRef } = useZoom(hoverRef);
  const fontSize = FONT_SIZE * zoom, lineH = LINE_HEIGHT * zoom;
  const dragRef = useRef(null); // { id, startCol, startRow, offCol, offRow } while dragging
  const lineRef = useRef(null); // the start cell while drawing an arrow
  const drewLineRef = useRef(false); // swallow the click that follows a drawn line
  const isLine = selectedPreset?.id === 'line';
  const isPaint = ['brush', 'eraser', 'gradient', 'adjust', 'marquee', 'wand'].includes(selectedPreset?.id);
  const brushRef = useRef(null);

  const selectedEl = elements.find(el => el.id === selectedId) || null;
  useReveal(scrollRef, canvasRef, selectedEl, cols, rows);
  // Keyboard and screen reader support: the cursor the arrows move, a pending arrow start, and a
  // polite live region that says where you are and what is there.
  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;
  const keyLineRef = useRef(null);
  const [spoken, setSpoken] = useState('');
  const announce = useCallback(text => setSpoken(text), []);
  const reading = useMemo(() => [...elements].sort((a, b) => a.row - b.row || a.col - b.col), [elements]);
  // In the real look the canvas draws only the parts that stay characters; RealLayer draws the rest.
  const drawn = useMemo(() => (look === 'real' ? elements.filter(el => !realPart(el)) : elements), [look, elements]);
  const shownGrid = useMemo(() => (look === 'real' ? renderElements(drawn, cols, rows) : grid), [look, drawn, grid, cols, rows]);
  const accent = useMemo(() => (drawn.some(el => el.accent) ? accentMask(drawn, cols, rows) : null), [drawn, cols, rows]);
  const color = useMemo(() => (hasColor(drawn) ? colorMask(drawn, cols, rows) : null), [drawn, cols, rows]);

  function getCharW() {
    if (!charWRef.current) {
      charWRef.current = measureCharWidth(FONT_SIZE, FONT_FAMILY()); // measured once at zoom 1
    }
    return charWRef.current * zoomRef.current;
  }

  useFitFirstScreen(scrollRef, elements, () => getCharW() / zoomRef.current, zoomTo);

  const draw = useCallback((hoverCell) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const charW = getCharW();
    const charH = lineH;
    // The backing store is devicePixelRatio times the CSS size so text stays sharp on Retina.
    const dpr = canvas.width / Math.ceil(cols * charW);
    const w = Math.ceil(cols * charW), h = rows * charH;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Only the cells in view are drawn; scrolling redraws. A 500 by 500 grid costs what the view holds.
    const view = scrollRef.current?.getBoundingClientRect(), box = canvas.getBoundingClientRect();
    const x0 = view ? Math.max(0, view.left - box.left) : 0, x1 = view ? Math.min(w, view.right - box.left) : w;
    const y0 = view ? Math.max(0, view.top - box.top) : 0, y1 = view ? Math.min(h, view.bottom - box.top) : h;
    const c0 = Math.max(0, Math.floor(x0 / charW) - 1), c1 = Math.min(cols, Math.ceil(x1 / charW) + 1);
    const r0 = Math.max(0, Math.floor(y0 / charH) - 1), r1 = Math.min(rows, Math.ceil(y1 / charH) + 1);
    const vx = c0 * charW, vy = r0 * charH, vw = (c1 - c0) * charW, vh = (r1 - r0) * charH;
    ctx.save();
    ctx.beginPath();
    ctx.rect(vx, vy, vw, vh);
    ctx.clip();

    ctx.clearRect(vx, vy, vw, vh);
    ctx.fillStyle = token('--color-bg2', '#faf8f3');
    ctx.fillRect(vx, vy, vw, vh);

    // The dot grid, one path for the whole view.
    ctx.fillStyle = token('--color-hairline', 'rgba(0,0,0,0.12)');
    ctx.beginPath();
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) ctx.rect(Math.round(c * charW), r * charH, 1, 1);
    ctx.fill();
    // A photo to trace over, faint and fitted to the grid. Never part of the wireframe or its exports.
    if (trace) {
      const k = Math.min(w / trace.width, h / trace.height);
      ctx.globalAlpha = 0.22;
      ctx.drawImage(trace, 0, 0, trace.width * k, trace.height * k);
      ctx.globalAlpha = 1;
    }

    if (isPaint) {
      ctx.font = `${fontSize}px ${FONT_FAMILY()}`;
      brushRef.current?.preview(ctx, hoverCell, charW, charH, fontSize, { ink: token('--color-secondary', 'rgba(0,0,0,0.5)'), erase: token('--accent-muted', 'rgba(29,78,216,0.12)') });
    } else if (hoverCell && selectedPreset) {
      // Mid-drag the arrow tool previews the line itself; otherwise the part sits under the cursor.
      const ghost = lineRef.current ? lineShape(lineRef.current, hoverCell) : { ...selectedPreset, ...hoverCell };
      const { col, row } = ghost;
      const previewGrid = stampComponent(grid, ghost.template, col, row);
      ctx.font = `${fontSize}px ${FONT_FAMILY()}`;
      ctx.fillStyle = token('--color-secondary', 'rgba(0,0,0,0.5)');
      for (let dy = 0; dy < ghost.height; dy++) {
        const r = row + dy;
        if (r < 0 || r >= rows) continue;
        for (let dc = 0; dc < ghost.width; dc++) {
          const c = col + dc;
          if (c < 0 || c >= cols) continue;
          drawCell(ctx, previewGrid[r][c], c * charW, r * charH, charW, charH, fontSize);
        }
      }
    }

    ctx.font = `${fontSize}px ${FONT_FAMILY()}`;
    const ink = token('--color-text', '#000000');
    drawCells(ctx, shownGrid, [r0, r1, c0, c1], charW, charH, fontSize, { accent, color, ink, lit: token('--accent', '#1D4ED8') });

    drawMarks(ctx, elements, outlinedIds, charW, charH, token('--accent', '#1D4ED8'));
    ctx.fillStyle = ink;
    // Selection box around the selected element (or its live drag position).
    if (selectedEl) {
      const drag = dragRef.current;
      const dcol = drag && drag.id === selectedEl.id ? drag.col : selectedEl.col;
      const drow = drag && drag.id === selectedEl.id ? drag.row : selectedEl.row;
      ctx.strokeStyle = token('--accent', '#ffca30');
      ctx.lineWidth = 2;
      ctx.strokeRect(
        dcol * charW - 1.5,
        drow * charH - 1.5,
        selectedEl.width * charW + 3,
        selectedEl.height * charH + 3,
      );
      // Alignment guides: a thin accent line through each edge or centre it snapped to.
      if (drag && drag.id === selectedEl.id) {
        ctx.save();
        ctx.strokeStyle = token('--accent', '#1D4ED8');
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        for (const c of drag.guideCols || []) {
          ctx.beginPath(); ctx.moveTo((c + 0.5) * charW, 0); ctx.lineTo((c + 0.5) * charW, rows * charH); ctx.stroke();
        }
        for (const r of drag.guideRows || []) {
          ctx.beginPath(); ctx.moveTo(0, (r + 0.5) * charH); ctx.lineTo(cols * charW, (r + 0.5) * charH); ctx.stroke();
        }
        ctx.restore();
      }
      // Redraw the element's own glyphs at the drag position so it visibly follows the cursor.
      if (drag && drag.id === selectedEl.id) {
        ctx.font = `${fontSize}px ${FONT_FAMILY()}`;
        ctx.fillStyle = token('--color-text', '#000000');
        for (let dy = 0; dy < selectedEl.template.length; dy++) {
          const chars = [...selectedEl.template[dy]];
          for (let dx = 0; dx < chars.length; dx++) {
            if (chars[dx] === ' ') continue;
            const ch = selectedEl.style ? styleChar(chars[dx], selectedEl.style) : chars[dx];
            drawCell(ctx, ch, (dcol + dx) * charW, (drow + dy) * charH, charW, charH, fontSize);
          }
        }
      }
    }

    if (!selectedPreset && hoverCell) {
      const cx = cursor.col * charW;
      const cy = cursor.row * charH;
      ctx.strokeStyle = token('--color-hairline', 'rgba(0,0,0,0.3)');
      ctx.lineWidth = 1;
      ctx.strokeRect(cx + 0.5, cy + 0.5, charW - 1, charH - 1);
    }
    ctx.restore();
  }, [grid, cols, rows, cursor, selectedPreset, isPaint, selectedEl, darkMode, trace, zoom, accent, color, shownGrid, outlinedIds, elements]);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const charW = getCharW();
    const w = Math.ceil(cols * charW);
    const h = rows * lineH;
    // Safari blanks a canvas past about 16.7M pixels, so a wide canvas of screens gives up some sharpness instead.
    const dpr = Math.min(window.devicePixelRatio || 1, Math.sqrt(16e6 / (w * h)));
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
    // Next frame, so a theme switch has landed on <html> before the colours are read.
    const frame = requestAnimationFrame(() => draw(hoverRef.current));
    return () => cancelAnimationFrame(frame);
  }, [grid, cols, rows, cursor, selectedPreset, draw, zoom]);

  const getCellFromPoint = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const charW = getCharW();
    // Cells are in CSS pixels; the backing store is larger on Retina.
    const scaleX = (cols * charW) / rect.width;
    const scaleY = (rows * lineH) / rect.height;
    const px = (clientX - rect.left) * scaleX;
    const py = (clientY - rect.top) * scaleY;
    return pxToCell(px, py, charW, lineH);
  }, [cols, rows, zoom]);

  const getCellFromEvent = useCallback((e) => {
    return getCellFromPoint(e.clientX, e.clientY);
  }, [getCellFromPoint]);

  const paintTool = useBrush({ tool: selectedPreset?.id, brush, cols, rows, grid, cellAt: getCellFromEvent, redraw: c => drawRef.current?.(c), onPaint, ...cells });
  brushRef.current = paintTool;

  const handleMouseMove = useCallback((e) => {
    const cell = getCellFromEvent(e);
    hoverRef.current = cell;
    onCursorMove(cell.col, cell.row);
    const drag = dragRef.current;
    if (drag) {
      // Snap to the other parts' edges and centres, and remember the guides to draw.
      const col = cell.col - drag.offCol, row = cell.row - drag.offRow;
      const still = col === drag.startCol && row === drag.startRow; // a click is not a drag, so no snap
      Object.assign(drag, still ? { col, row, guideCols: [], guideRows: [] } : snapPosition(elements, drag.id, col, row));
    }
    draw(cell);
  }, [getCellFromEvent, onCursorMove, draw, elements]);

  const handleMouseLeave = useCallback(() => {
    hoverRef.current = null;
    draw(null);
  }, [draw]);

  const handleMouseDown = useCallback((e) => {
    if (isLine) { lineRef.current = getCellFromEvent(e); return; }
    if (selectedPreset) return; // placing, not selecting/dragging
    const cell = getCellFromEvent(e);
    const el = elementAt(elements, cell.col, cell.row);
    if (el) {
      onSelectElement(el.id, e.shiftKey);
      if (e.shiftKey) return;
      dragRef.current = { id: el.id, offCol: cell.col - el.col, offRow: cell.row - el.row, col: el.col, row: el.row, startCol: el.col, startRow: el.row };
    } else {
      onSelectElement(null);
    }
  }, [isLine, selectedPreset, getCellFromEvent, elements, onSelectElement]);

  const handleMouseUp = useCallback((e) => {
    const start = lineRef.current;
    lineRef.current = null;
    if (start) {
      const end = getCellFromEvent(e);
      if (end.col !== start.col || end.row !== start.row) {
        drewLineRef.current = true;
        onPlaceLine(start, end);
      }
      return;
    }
    const drag = dragRef.current;
    if (drag && (drag.col !== undefined)) {
      const el = elements.find(x => x.id === drag.id);
      if (el && (drag.col !== el.col || drag.row !== el.row)) {
        onMoveElement(drag.id, drag.col, drag.row);
      }
    }
    dragRef.current = null;
  }, [elements, onMoveElement, getCellFromEvent, onPlaceLine]);

  const handleClick = useCallback((e) => {
    if (drewLineRef.current) { drewLineRef.current = false; return; }
    const cell = getCellFromEvent(e);
    onCursorMove(cell.col, cell.row);
    if (selectedPreset && !isPaint) {
      onPlaceComponent(selectedPreset, cell.col, cell.row);
    }
  }, [getCellFromEvent, selectedPreset, isPaint, onPlaceComponent, onCursorMove]);

  const handleTouchEnd = useCallback((e) => {
    if (!selectedPreset || isPaint) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const cell = getCellFromPoint(touch.clientX, touch.clientY);
    onCursorMove(cell.col, cell.row);
    onPlaceComponent(selectedPreset, cell.col, cell.row);
  }, [selectedPreset, isPaint, getCellFromPoint, onCursorMove, onPlaceComponent]);

  const handleKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && ['=', '+', '-', '0'].includes(e.key)) {
      e.preventDefault();
      zoomTo(e.key === '0' ? 1 : zoomRef.current * (e.key === '-' ? 1 / 1.2 : 1.2));
      return;
    }
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return; // the inline editor owns its keys
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      onUndo();
    }
    if (mod && (e.key === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      e.preventDefault();
      onRedo();
    }
    if (!selectedId) {
      // No part selected: the keyboard drives the cursor cell, and Enter places or picks what is there.
      const c = cursorRef.current;
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        const [dc, dr] = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        const next = { col: Math.max(0, Math.min(cols - 1, c.col + dc)), row: Math.max(0, Math.min(rows - 1, c.row + dr)) };
        hoverRef.current = next;
        onCursorMove(next.col, next.row);
        const under = elementAt(elements, next.col, next.row);
        const cell = t('at_cell', { col: next.col + 1, row: next.row + 1 });
        announce(under ? t('on_part', { cell, part: describe(under) }) : cell);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (isLine) {
          if (!keyLineRef.current) { keyLineRef.current = { ...c }; announce(t('arrow_start')); }
          else { onPlaceLine(keyLineRef.current, { ...c }); keyLineRef.current = null; announce(t('arrow_drawn')); }
        } else if (isPaint) {
          paintTool.tapAt(c);
        } else if (selectedPreset) {
          onPlaceComponent(selectedPreset, c.col, c.row);
          announce(t('placed', { name: partLabel(selectedPreset), col: c.col + 1, row: c.row + 1 }));
        } else {
          const under = elementAt(elements, c.col, c.row);
          if (under) { onSelectElement(under.id); announce(t('selected_part', { part: describe(under) })); }
        }
      } else if (e.key === 'Tab' && elements.length && !e.altKey) {
        e.preventDefault();
        const el = e.shiftKey ? reading.at(-1) : reading[0];
        onSelectElement(el.id);
        announce(t('selected_part', { part: describe(el) }));
      }
      return;
    }
    if (e.key === 'Tab') {
      // Tab walks the parts in reading order; Escape lets go, and then Tab leaves the canvas.
      e.preventDefault();
      const i = reading.findIndex(el => el.id === selectedId);
      const el = reading[(i + (e.shiftKey ? -1 : 1) + reading.length) % reading.length];
      onSelectElement(el.id);
      announce(t('selected_part', { part: describe(el) }));
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onDeleteElement(selectedId);
    } else if (mod && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      onDuplicate(selectedId);
    } else if (mod && e.key.toLowerCase() === 'g') {
      e.preventDefault();
      onGroup?.(e.shiftKey);
    } else if (e.key === '[' || e.key === ']') {
      e.preventDefault();
      onReorder(selectedId, e.key === ']' ? 'front' : 'back');
    } else if (e.key === 'Escape') {
      onSelectElement(null);
      announce(t('nothing_selected'));
    } else if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const step = e.shiftKey ? 5 : 1;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      onNudge(selectedId, d[0], d[1]);
    }
  }, [zoomTo, onUndo, onRedo, selectedId, onDeleteElement, onDuplicate, onGroup, onReorder, onNudge, onSelectElement, cols, rows, elements, reading, isLine, isPaint, paintTool, selectedPreset, onPlaceComponent, onPlaceLine, onCursorMove, announce]);

  return (
    <div className="canvas-wrapper" onKeyDown={handleKeyDown} tabIndex={0} role="application"
      aria-roledescription={t('grid_role')}
      aria-label={t('canvas_label')}
      onFocus={() => { if (!hoverRef.current) { hoverRef.current = cursorRef.current; draw(hoverRef.current); } }}>
      <div className="sr-only" aria-live="polite">{spoken}</div>
      <div className="canvas-scroll" ref={scrollRef}>
        <div className="canvas-stage">
        <canvas
          ref={canvasRef}
          className={`canvas${selectedPreset ? ' canvas--place-mode' : ''}${isPaint ? ' canvas--paint' : ''}`}
          onPointerDown={paintTool.onPointerDown}
          onPointerMove={paintTool.onPointerMove}
          onPointerUp={paintTool.finish}
          onPointerCancel={paintTool.finish}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          onDoubleClick={() => { if (selectedEl) setEditing(true); }}
          onTouchEnd={handleTouchEnd}
        />
        {look === 'real' && <RealLayer elements={elements} charW={getCharW()} rowH={lineH} fontSize={fontSize} />}
        {selectedEl && <ElementOverlay key={selectedEl.id + ':' + selectedEl.template.join('\n')} element={selectedEl} charWidth={getCharW()} rowHeight={lineH} cols={cols} rows={rows} onUpdate={onUpdateElement} editing={editing} onEdit={setEditing} />}
        </div>
      </div>
    </div>
  );
}
