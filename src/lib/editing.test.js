import { describe, it, expect } from 'vitest';
import { resizeTemplate, updateElement, createState, pushHistory, undo, redo, renderElements, tableFrame, tableCells, tableText, chartFrame, chartItems,
  groupElements, ungroupElements, moveElement, duplicateElement, parseProject, serializeProject, elementAt, reorderElement,
  gridToText, trimText, makeSymbol, detachSymbol, symbolUses } from './engine.js';

describe('element editing', () => {
  it('expands and contracts a box while preserving corners and text', () => {
    const art=['┌───┐','│Hi │','└───┘'];
    expect(resizeTemplate(art,7,4)).toEqual(['┌─────┐','│Hi   │','│     │','└─────┘']);
    expect(resizeTemplate(art,3,3)).toEqual(['┌─┐','│H│','└─┘']);
    expect(art[0]).toBe('┌───┐');
  });
  it('retains bracket endings and measures Unicode edits by characters', () => {
    expect(resizeTemplate(['[ OK ]'],9,1)).toEqual(['[ OK    ]']);
    const edited=updateElement([{id:'a',template:['old']}],'a',{text:'𝄞X\r\ny'});
    expect(edited[0]).toMatchObject({template:['𝄞X','y'],width:2,height:2});
  });
  it('undo and redo restore edited elements and overlapping content', () => {
    let state=createState(10,5);
    state.elements=[{id:'a',col:0,row:0,width:3,height:1,template:['ABC']},{id:'b',col:1,row:0,width:1,height:1,template:['Z']}];
    state={...pushHistory(state),elements:updateElement(state.elements,'b',{text:'XY'})};
    state.grid=renderElements(state.elements,10,5);
    expect(state.grid[0].slice(0,3).join('')).toBe('AXY');
    expect(undo(state).grid[0].slice(0,3).join('')).toBe('AZC');
    expect(redo(undo(state)).grid).toEqual(state.grid);
  });
});

describe('tables', () => {
  const table = { id: 't', presetId: 'table', label: 'Table', col: 1, row: 1, ...(() => {
    const template = tableFrame([['Name', 'Plan'], ['Ada', 'Pro']]);
    return { template, width: [...template[0]].length, height: template.length };
  })() };

  it('draws a header line and sizes each column to its longest cell', () => {
    expect(table.template).toEqual([
      '┌──────┬──────┐', '│ Name │ Plan │', '├──────┼──────┤', '│ Ada  │ Pro  │', '└──────┴──────┘']);
  });

  it('edits its cells as typed rows, and cells grow with their text', () => {
    expect(tableText(table.template)).toBe('Name | Plan\nAda | Pro');
    const [grown] = updateElement([table], 't', { text: 'Name | Plan\nGrace Hopper | Team' });
    expect(grown.template[3]).toBe('│ Grace Hopper │ Team │');
    expect(grown.width).toBe(23);
    expect(tableCells(grown.template)).toEqual([['Name', 'Plan'], ['Grace Hopper', 'Team']]);
  });

  it('adds rows and columns through cells, and a drag only moves it', () => {
    const [wider] = updateElement([table], 't', { cells: [['Name', 'Plan', 'Seats'], ['Ada', 'Pro']] });
    expect(wider.template[3]).toBe('│ Ada  │ Pro  │       │');
    const [moved] = updateElement([table], 't', { col: 5, row: 2, width: 40, height: 9 });
    expect([moved.col, moved.row, moved.width, moved.template]).toEqual([5, 2, table.width, table.template]);
  });
});

describe('charts', () => {
  it('draws bars scaled to the largest value, in eighths of a cell, labels lined up', () => {
    expect(chartFrame('chart', 'Mon 4\nTuesday 8\nWed 1')).toEqual([
      'Mon     ██████████           4', '', 'Tuesday ████████████████████ 8', '', 'Wed     ██▌                  1']);
    expect(chartFrame('chart', '2, 4')).toEqual(['██████████           2', '', '████████████████████ 4']);
  });

  it('draws a sparkline over eight heights and a progress row to a percent', () => {
    expect(chartFrame('sparkline', '1 2 3 4 5 6 7 8')).toEqual(['▁▂▃▄▅▆▇█']);
    expect(chartFrame('sparkline', '5 5')).toEqual(['▄▄']);
    expect(chartFrame('progress', 'Upload 50%')).toEqual(['Upload ▓▓▓▓▓▓▓░░░░░░░ 50%']);
    expect(chartFrame('progress', '140')).toEqual(['▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 100%']);
  });

  it('keeps its numbers as text, redraws on edit, and a drag only moves it', () => {
    const el = { id: 'c', presetId: 'sparkline', label: 'Sparkline', col: 0, row: 0, text: '1 2', template: ['▁█'], width: 2, height: 1 };
    const [edited] = updateElement([el], 'c', { text: '3 1 2' });
    expect([edited.text, edited.template, edited.width]).toEqual(['3 1 2', ['█▁▅'], 3]);
    const [moved] = updateElement([el], 'c', { col: 4, width: 30 });
    expect([moved.col, moved.width]).toEqual([4, 2]);
    expect(chartItems('no numbers here')).toEqual([]);
  });
});

describe('groups', () => {
  const box = (id, col) => ({ id, presetId: 'card', label: 'Card', template: ['┌┐', '└┘'], width: 2, height: 2, col, row: 0 });

  it('groups two parts or more, and moving one moves them all', () => {
    const els = groupElements([box('a', 0), box('b', 5), box('c', 10)], ['a', 'b']);
    expect(els.map(e => Boolean(e.group))).toEqual([true, true, false]);
    expect(groupElements(els, ['c'])).toBe(els);
    const moved = moveElement(els, 'a', 3, 2);
    expect(moved.map(e => [e.col, e.row])).toEqual([[3, 2], [8, 2], [10, 0]]);
  });

  it('ungroups, copies stand alone, and the group survives the project file', () => {
    const els = groupElements([box('a', 0), box('b', 5)], ['a', 'b']);
    expect(ungroupElements(els, 'b').some(e => e.group)).toBe(false);
    const { elements, id } = duplicateElement(els, 'a');
    expect(elements.find(e => e.id === id).group).toBeUndefined();
    const reopened = parseProject(serializeProject({ cols: 40, rows: 10, elements: els })).elements;
    expect(reopened[0].group).toBe(reopened[1].group);
  });
});

describe('layers', () => {
  const box = (id, col) => ({ id, presetId: 'card', label: 'Card', template: ['██'], width: 2, height: 1, col, row: 0 });

  it('a hidden layer is not drawn or copied, and clicks pass through it', () => {
    const [a] = updateElement([box('a', 0)], 'a', { hidden: true });
    expect(a.hidden).toBe(true);
    expect(trimText(gridToText(renderElements([a, box('b', 3)], 6, 1)))).toBe('   ██');
    expect(elementAt([box('under', 0), a], 0, 0).id).toBe('under');
    expect(updateElement([a], 'a', { hidden: false })[0].hidden).toBeUndefined();
  });

  it('a locked layer cannot be picked or moved on the canvas', () => {
    const [a] = updateElement([box('a', 0)], 'a', { locked: true });
    expect(elementAt([a], 0, 0)).toBeNull();
    expect(moveElement([a], 'a', 5, 0)[0].col).toBe(0);
  });

  it('steps up and down the layer list, and both flags survive the project file', () => {
    const els = [box('a', 0), box('b', 0), box('c', 0)];
    expect(reorderElement(els, 'a', 'up').map(e => e.id)).toEqual(['b', 'a', 'c']);
    expect(reorderElement(els, 'c', 'down').map(e => e.id)).toEqual(['a', 'c', 'b']);
    expect(reorderElement(els, 'c', 'up').map(e => e.id)).toEqual(['a', 'b', 'c']);
    const flagged = [{ ...box('a', 0), hidden: true }, { ...box('b', 2), locked: true }];
    const back = parseProject(serializeProject({ cols: 10, rows: 2, elements: flagged })).elements;
    expect([back[0].hidden, back[1].locked]).toEqual([true, true]);
  });
});

describe('symbols', () => {
  const btn = { id: 'a', presetId: 'button', label: 'Button', template: ['[ OK ]'], width: 6, height: 1, col: 0, row: 0 };

  it('copies of a symbol stay linked: an edit to one edits them all, not their places', () => {
    let els = makeSymbol([btn], 'a', 's1');
    const { elements, id } = duplicateElement(els, 'a');
    els = updateElement(elements, id, { text: '[ Save ]' });
    expect(els.map(e => e.template[0])).toEqual(['[ Save ]', '[ Save ]']);
    expect(els.map(e => e.col)).toEqual([0, 2]);
    expect(symbolUses(els, els[0])).toBe(2);
    expect(updateElement(els, 'a', { accent: true })[1].accent).toBeUndefined();
  });

  it('detaches one copy, and the link survives the project file', () => {
    const els = duplicateElement(makeSymbol([btn], 'a', 's1'), 'a').elements;
    const loose = detachSymbol(els, 'a');
    expect(updateElement(loose, 'a', { text: 'x' })[1].template).toEqual(['[ OK ]']);
    const back = parseProject(serializeProject({ cols: 20, rows: 2, elements: els })).elements;
    expect(back[0].symbol).toBe(back[1].symbol);
  });
});

describe('variants', () => {
  const btn = { id: 'a', presetId: 'button', label: 'Button', template: ['[ OK ]'], width: 6, height: 1, col: 0, row: 0 };
  const card = { id: 'c', presetId: 'card', label: 'Card', template: ['┌──┐', '└──┘'], width: 4, height: 2, col: 0, row: 0 };
  const draw = el => trimText(gridToText(renderElements([el], 8, 2)));

  it('draws pressed, disabled and error in the characters themselves', () => {
    const as = (el, variant) => draw(updateElement([el], el.id, { variant })[0]);
    expect([as(btn, 'pressed'), as(btn, 'disabled'), as(btn, 'error')]).toEqual(['▐ OK ▌', '‹ OK ›', '! OK !']);
    expect(as(card, 'pressed')).toBe('┏━━┓\n┗━━┛');
    expect(as(card, 'error')).toBe('╔══╗\n╚══╝');
  });

  it('default clears the state, it is each copy its own, and it survives the project file', () => {
    const [pressed] = updateElement([btn], 'a', { variant: 'pressed' });
    expect(updateElement([pressed], 'a', { variant: 'default' })[0].variant).toBeUndefined();
    const linked = duplicateElement(makeSymbol([btn], 'a', 's'), 'a').elements;
    expect(updateElement(linked, 'a', { variant: 'error' })[1].variant).toBeUndefined();
    expect(parseProject(serializeProject({ cols: 8, rows: 2, elements: [pressed] })).elements[0].variant).toBe('pressed');
  });
});

describe('shade fills', () => {
  const fill = { id: 'f', presetId: 'fill', label: 'Shade', template: ['▒▒', '▒▒'], width: 2, height: 2, col: 0, row: 0 };
  it('refills on a resize or a new shade, and moves with a drag', () => {
    const [big] = updateElement([fill], 'f', { width: 4, height: 1 });
    expect(big.template).toEqual(['▒▒▒▒']);
    expect(updateElement([big], 'f', { fill: '█' })[0].template).toEqual(['████']);
    expect(updateElement([fill], 'f', { col: 3, row: 1, width: 2, height: 2 })[0]).toMatchObject({ col: 3, row: 1 });
  });
});
