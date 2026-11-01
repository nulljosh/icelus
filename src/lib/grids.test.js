import { describe, it, expect } from 'vitest';
import { createElement, updateElement, serializeProject, parseProject, renderElements, gridToText } from './engine.js';
import { getPreset, SCREEN_TOOL } from './presets.js';
import { cleanGrid, gridColumns, gridRows, snapToGrid, gridEverywhere } from './grids.js';
import { snapPosition } from './lines.js';
import { callTool } from './tools.js';

describe('grids', () => {
  const sized = (col, w) => { const s = createElement(SCREEN_TOOL, col, 0); return updateElement([s], s.id, { width: w, height: 20 })[0]; };
  const screen = sized(0, 42);
  const withGrid = updateElement([screen], screen.id, { grid: { cols: 4, gutter: 2 } })[0];

  it('lays out column bands inside the frame', () => {
    // inner 40 cells, 5 gutters of 2, four columns of 7, the 2 left over split either side
    expect(gridColumns(withGrid)).toEqual([{ col: 4, width: 7 }, { col: 13, width: 7 }, { col: 22, width: 7 }, { col: 31, width: 7 }]);
    expect(gridColumns(screen)).toEqual([]);
    expect(gridColumns({ ...withGrid, grid: { cols: 24, gutter: 8 } })).toEqual([]); // does not fit
  });

  it('baseline rows: every n rows inside the frame, the top of a part snaps to one, they survive a save', () => {
    const rows = updateElement([screen], screen.id, { grid: { cols: 4, gutter: 2, baseline: 4 } })[0];
    expect(gridRows(rows)).toEqual([5, 9, 13, 17]); // frame rows 0 and 19, inner 1 to 18
    expect(gridRows(withGrid)).toEqual([]);
    expect(cleanGrid({ cols: 4, gutter: 2, baseline: 9 })).toEqual({ cols: 4, gutter: 2 }); // out of range is off
    const btn = createElement(getPreset('button'), 20, 8);
    const snapped = snapToGrid([rows, btn], btn.id, { col: 20, row: 8, guideCols: [], guideRows: [] });
    expect(snapped.row).toBe(9);
    expect(snapped.guideRows).toContain(9);
    const back = parseProject(serializeProject({ cols: 60, rows: 30, elements: [rows] }));
    expect(back.elements[0].grid).toEqual({ cols: 4, gutter: 2, baseline: 4 });
  });

  it('cleans bad grids', () => {
    expect(cleanGrid({ cols: 99, gutter: -1 })).toEqual({ cols: 4, gutter: 1 });
    expect(cleanGrid('3')).toBeNull();
    expect(updateElement([withGrid], withGrid.id, { grid: null })[0].grid).toBeUndefined();
    expect(updateElement([createElement(getPreset('button'), 0, 0)], undefined, {})[0].grid).toBeUndefined();
  });

  it('a dragged part snaps an edge onto a column', () => {
    const btn = createElement(getPreset('button'), 13, 5); // [ OK ] is 6 wide
    const els = [withGrid, btn];
    const s = snapPosition(els, btn.id, 11, 5);
    expect(s.col).toBe(13); // left edge onto the second band
    expect(s.guideCols).toContain(13);
    expect(snapToGrid(els, btn.id, { col: 14, row: 5, guideCols: [], guideRows: [] }).col).toBe(14); // right edge onto 19
    expect(snapToGrid([screen, btn], btn.id, { col: 13, row: 5, guideCols: [], guideRows: [] }).col).toBe(13); // no grid, no snap
  });

  it('is never in the text, saves, and spreads to every screen', () => {
    expect(gridToText(renderElements([withGrid], 50, 22))).toBe(gridToText(renderElements([screen], 50, 22)));
    expect(parseProject(serializeProject({ cols: 50, rows: 22, elements: [withGrid] })).elements[0].grid).toEqual({ cols: 4, gutter: 2 });
    const other = sized(50, 30);
    expect(gridEverywhere([withGrid, other], withGrid.id)[1].grid).toEqual({ cols: 4, gutter: 2 });
    expect(gridEverywhere([screen, { ...other, grid: { cols: 2, gutter: 1 } }], screen.id)[1].grid).toBeUndefined();
  });

  it('edit_project sets, spreads and refuses grids', () => {
    const project = JSON.parse(serializeProject({ cols: 90, rows: 22, elements: [screen, sized(50, 30)] }));
    const out = callTool('edit_project', { project, ops: [{ op: 'grid', index: 0, cols: 6, gutter: 1, all: true }] });
    expect(out.project.elements.map(e => e.grid)).toEqual([{ cols: 6, gutter: 1 }, { cols: 6, gutter: 1 }]);
    expect(() => callTool('edit_project', { project, ops: [{ op: 'grid', index: 0, cols: 99 }] })).toThrow(/cols/);
  });
});
