import { describe, it, expect } from 'vitest';
import {
  createGrid, cloneGrid, gridToText, textToGrid,
  stampComponent, setChar, eraseRegion, pxToCell, renderElements,
  createState, pushHistory, undo, redo, joinChar, lineShape, createLine, moveElement, deleteElement, duplicateElement, serializeProject, parseProject, bannerText, updateElement, createElement, toAscii, snapPosition, styleChar,
  DEFAULT_COLS, DEFAULT_ROWS,
} from './engine.js';

describe('createGrid', () => {
  it('creates a grid with correct dimensions', () => {
    const g = createGrid(5, 3);
    expect(g.length).toBe(3);
    expect(g[0].length).toBe(5);
  });

  it('fills with spaces', () => {
    const g = createGrid(4, 2);
    g.forEach(row => row.forEach(c => expect(c).toBe(' ')));
  });

  it('uses default dimensions', () => {
    const g = createGrid();
    expect(g.length).toBe(DEFAULT_ROWS);
    expect(g[0].length).toBe(DEFAULT_COLS);
  });
});

describe('cloneGrid', () => {
  it('produces a deep copy', () => {
    const g = createGrid(3, 2);
    const clone = cloneGrid(g);
    clone[0][0] = 'X';
    expect(g[0][0]).toBe(' ');
  });
});

describe('gridToText / textToGrid', () => {
  it('round-trips a simple grid', () => {
    const original = createGrid(5, 3);
    original[0][0] = 'H';
    original[1][2] = 'i';
    const text = gridToText(original);
    const restored = textToGrid(text, 5, 3);
    expect(restored[0][0]).toBe('H');
    expect(restored[1][2]).toBe('i');
  });

  it('gridToText joins rows with newlines', () => {
    const g = createGrid(3, 2);
    g[0][0] = 'A';
    g[1][1] = 'B';
    const text = gridToText(g);
    expect(text.split('\n').length).toBe(2);
  });
});

describe('stampComponent', () => {
  it('stamps a template at the correct position', () => {
    const g = createGrid(10, 5);
    const next = stampComponent(g, ['AB', 'CD'], 2, 1);
    expect(next[1][2]).toBe('A');
    expect(next[1][3]).toBe('B');
    expect(next[2][2]).toBe('C');
    expect(next[2][3]).toBe('D');
  });

  it('does not mutate original grid', () => {
    const g = createGrid(5, 5);
    stampComponent(g, ['X'], 0, 0);
    expect(g[0][0]).toBe(' ');
  });

  it('clips when stamp goes out of bounds', () => {
    const g = createGrid(3, 3);
    expect(() => stampComponent(g, ['ABCD'], 2, 0)).not.toThrow();
  });
});

describe('setChar', () => {
  it('sets a character at a position', () => {
    const g = createGrid(5, 5);
    const next = setChar(g, 2, 3, '#');
    expect(next[3][2]).toBe('#');
  });

  it('returns original grid for out-of-bounds', () => {
    const g = createGrid(5, 5);
    const next = setChar(g, -1, 0, '#');
    expect(next).toBe(g);
  });

  it('uses space for falsy char', () => {
    const g = createGrid(3, 3);
    const filled = setChar(g, 1, 1, '*');
    const erased = setChar(filled, 1, 1, '');
    expect(erased[1][1]).toBe(' ');
  });
});

describe('eraseRegion', () => {
  it('erases a rectangular region', () => {
    const g = createGrid(10, 10);
    let next = setChar(g, 2, 2, 'X');
    next = setChar(next, 3, 3, 'Y');
    next = eraseRegion(next, 2, 2, 2, 2);
    expect(next[2][2]).toBe(' ');
    expect(next[3][3]).toBe(' ');
  });
});

describe('pxToCell', () => {
  it('converts pixel coords to cell', () => {
    const result = pxToCell(30, 48, 10, 16);
    expect(result.col).toBe(3);
    expect(result.row).toBe(3);
  });

  it('floors fractional results', () => {
    const result = pxToCell(9, 15, 10, 16);
    expect(result.col).toBe(0);
    expect(result.row).toBe(0);
  });
});

describe('undo / redo', () => {
  it('undo returns state unchanged when history is empty', () => {
    const s = createState(5, 5);
    expect(undo(s)).toBe(s);
  });

  it('redo returns state unchanged when future is empty', () => {
    const s = createState(5, 5);
    expect(redo(s)).toBe(s);
  });

  it('undo reverts to previous grid state', () => {
    let s = createState(5, 5);
    s = pushHistory(s);
    s = { ...s, elements: [{ id: 'e1', template: ['Z'], width: 1, height: 1, col: 0, row: 0 }] };
    s = { ...s, grid: renderElements(s.elements, s.cols, s.rows) };
    const reverted = undo(s);
    expect(reverted.grid[0][0]).toBe(' ');
  });

  it('redo reapplies undone change', () => {
    let s = createState(5, 5);
    s = pushHistory(s);
    s = { ...s, elements: [{ id: 'e1', template: ['Z'], width: 1, height: 1, col: 0, row: 0 }] };
    s = { ...s, grid: renderElements(s.elements, s.cols, s.rows) };
    s = undo(s);
    s = redo(s);
    expect(s.grid[0][0]).toBe('Z');
  });
});

describe('lines', () => {
  it('joins crossing strokes', () => {
    expect(joinChar('─', '│')).toBe('┼');
    expect(joinChar('│', '─')).toBe('┼');
    expect(joinChar('─', '┐')).toBe('┬');
    expect(joinChar('│', 'A')).toBe('A');
    expect(joinChar('A', '─')).toBe('─');
  });

  it('draws a straight arrow', () => {
    expect(lineShape({ col: 2, row: 1 }, { col: 5, row: 1 })).toEqual({ template: ['───▶'], width: 4, height: 1, col: 2, row: 1 });
    expect(lineShape({ col: 5, row: 1 }, { col: 2, row: 1 }).template).toEqual(['◀───']);
    expect(lineShape({ col: 0, row: 0 }, { col: 0, row: 2 }, false).template).toEqual(['│', '│', '│']);
  });

  it('draws an elbow across then down or up', () => {
    expect(lineShape({ col: 0, row: 0 }, { col: 3, row: 2 }).template).toEqual(['───┐', '   │', '   ▼']);
    expect(lineShape({ col: 3, row: 2 }, { col: 0, row: 0 }).template).toEqual(['▲   ', '│   ', '└───']);
  });

  it('lines are see-through and join what they cross', () => {
    const box = { id: 'b', presetId: 'card', template: ['┌─┐', '│ │', '└─┘'], width: 3, height: 3, col: 0, row: 0 };
    const line = { id: 'l', presetId: 'line', template: ['  ', '──'], width: 2, height: 2, col: 1, row: 0 };
    const g = renderElements([box, line], 4, 3);
    expect(g[0][1]).toBe('─');
    expect(g[1][1]).toBe('─');
    expect(g[1][2]).toBe('┼');
  });
});

describe('connectors', () => {
  const box = (id, col, row) => ({ id, presetId: 'card', label: 'Card', template: ['┌──┐', '│  │', '└──┘'], width: 4, height: 3, col, row });

  it('pins line ends to the parts under them', () => {
    const line = createLine([box('a', 0, 0), box('b', 10, 0)], { col: 3, row: 1 }, { col: 10, row: 1 });
    expect(line.from).toEqual({ col: 3, row: 1, id: 'a', dCol: 3, dRow: 1 });
    expect(line.to).toEqual({ col: 10, row: 1, id: 'b', dCol: 0, dRow: 1 });
    expect(createLine([], { col: 1, row: 1 }, { col: 4, row: 1 }).from).toEqual({ col: 1, row: 1 });
  });

  it('a pinned line follows its part when the part moves', () => {
    const els = [box('a', 0, 0), box('b', 10, 0)];
    const line = createLine(els, { col: 3, row: 1 }, { col: 10, row: 1 });
    const moved = moveElement([...els, line], 'b', 10, 4);
    const l = moved.find(el => el.id === line.id);
    expect(l.to).toMatchObject({ col: 10, row: 5 });
    expect(l.template).toEqual(['───────┐', '       │', '       │', '       │', '       ▼']);
  });

  it('moving the line itself cuts it loose', () => {
    const els = [box('a', 0, 0)];
    const line = createLine(els, { col: 3, row: 1 }, { col: 8, row: 1 });
    const moved = moveElement([...els, line], line.id, line.col + 1, line.row + 2);
    const l = moved.find(el => el.id === line.id);
    expect(l.from).toEqual({ col: 4, row: 3 });
    expect(moveElement(moved, 'a', 5, 5).find(el => el.id === line.id)).toEqual(l);
  });

  it('a deleted part leaves the end where it was', () => {
    const els = [box('a', 0, 0)];
    const line = createLine(els, { col: 3, row: 1 }, { col: 8, row: 1 });
    const left = deleteElement([...els, line], 'a');
    expect(left[0].template).toEqual(line.template);
  });

  it('a duplicated line is loose', () => {
    const els = [box('a', 0, 0)];
    const line = createLine(els, { col: 3, row: 1 }, { col: 8, row: 1 });
    const { elements, id } = duplicateElement([...els, line], line.id);
    expect(elements.find(el => el.id === id).from).toEqual({ col: 5, row: 2 });
  });

  it('pins survive saving and opening a project', () => {
    const els = [box('a', 0, 0), box('b', 10, 0)];
    const line = createLine(els, { col: 3, row: 1 }, { col: 10, row: 1 });
    const opened = parseProject(serializeProject({ cols: 20, rows: 10, elements: [...els, line] }));
    const [a, , l] = opened.elements;
    expect(l.from.id).toBe(a.id);
    const moved = moveElement(opened.elements, a.id, 0, 3);
    expect(moved[2].from).toMatchObject({ col: 3, row: 4 });
  });
});

describe('text and banners', () => {
  it('draws big letters three rows tall', () => {
    expect(bannerText('HI')).toEqual(['█ █ ▀█▀', '█▀█  █ ', '▀ ▀ ▀▀▀']);
    expect(bannerText('hi')).toEqual(bannerText('HI'));
    expect(bannerText('A~B')).toEqual(bannerText('A B'));
  });

  it('a banner edits its words and redraws its letters', () => {
    const banner = createElement({ id: 'banner', label: 'Banner', template: bannerText('TITLE'), width: 19, height: 3, text: 'TITLE' }, 0, 0);
    const [next] = updateElement([banner], banner.id, { text: 'OK' });
    expect(next.text).toBe('OK');
    expect(next.template).toEqual(bannerText('OK'));
    expect(next.width).toBe(7);
  });

  it('text is see-through', () => {
    const box = { id: 'b', presetId: 'card', template: ['┌───┐', '│ x │', '└───┘'], width: 5, height: 3, col: 0, row: 0 };
    const text = { id: 't', presetId: 'text', template: ['a b'], width: 3, height: 1, col: 1, row: 1 };
    expect(renderElements([box, text], 5, 3)[1].join('')).toBe('│axb│');
  });

  it('banner words survive a project round-trip and export as ASCII', () => {
    const banner = createElement({ id: 'banner', label: 'Banner', template: bannerText('GO'), width: 7, height: 3, text: 'GO' }, 0, 0);
    expect(parseProject(serializeProject({ cols: 10, rows: 5, elements: [banner] })).elements[0].text).toBe('GO');
    expect(toAscii('▀▄█')).toBe('"_#');
    expect(toAscii('╭─────╮\n│ ● ● │\n│  ◡  │')).toBe('+-----+\n| * * |\n|  u  |');
  });
});

describe('snap and styles', () => {
  const part = (id, col, row, width = 4, height = 3) => ({ id, presetId: 'card', template: ['┌──┐', '│  │', '└──┘'], width, height, col, row });

  it('snaps to a nearby left edge and reports the guide', () => {
    const els = [part('a', 10, 0, 6), part('b', 0, 8, 6)];
    expect(snapPosition(els, 'b', 11, 8)).toEqual({ col: 10, row: 8, guideCols: [10], guideRows: [] });
  });

  it('snaps right edges and centres, and leaves far parts alone', () => {
    const els = [part('a', 10, 0, 8, 3), part('b', 0, 8, 4, 3)];
    expect(snapPosition(els, 'b', 15, 8)).toMatchObject({ col: 16, guideCols: [17] }); // its centre meets a's right edge
    expect(snapPosition(els, 'b', 30, 20)).toEqual({ col: 30, row: 20, guideCols: [], guideRows: [] });
  });

  it('never snaps to lines', () => {
    const els = [{ id: 'l', presetId: 'line', template: ['──▶'], width: 3, height: 1, col: 10, row: 0 }, part('b', 0, 8)];
    expect(snapPosition(els, 'b', 11, 8)).toMatchObject({ col: 11, guideCols: [] });
  });

  it('box styles swap line sets and survive saving', () => {
    expect(styleChar('┌', 'double')).toBe('╔');
    expect(styleChar('┼', 'heavy')).toBe('╋');
    expect(styleChar('┐', 'rounded')).toBe('╮');
    expect(styleChar('│', 'ascii')).toBe('|');
    expect(styleChar('A', 'double')).toBe('A');
    const [styled] = updateElement([part('a', 0, 0)], 'a', { style: 'double' });
    expect(renderElements([styled], 4, 3)[0].join('')).toBe('╔══╗');
    expect(updateElement([styled], 'a', { style: 'single' })[0].style).toBeUndefined();
    expect(updateElement([styled], 'a', { style: 'nope' })[0].style).toBeUndefined();
    expect(parseProject(serializeProject({ cols: 8, rows: 4, elements: [styled] })).elements[0].style).toBe('double');
  });
});
