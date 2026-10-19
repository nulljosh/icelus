import { describe, it, expect } from 'vitest';
import { autoLayout, cleanAuto, constrain, cleanPin, makeSizes, syncTwins } from './layout.js';
import { createElement, updateElement, moveElement, deleteElement, serializeProject, parseProject } from './engine.js';
import { getPreset, SCREEN_TOOL } from './presets.js';
import { callTool } from './tools.js';

const screenAt = (w = 40, h = 30) => { const s = createElement(SCREEN_TOOL, 0, 0); return updateElement([s], s.id, { width: w, height: h })[0]; };

describe('auto layout', () => {
  const screen = screenAt();
  const a = createElement(getPreset('list'), 1, 1), b = createElement(getPreset('button'), 1, 5), c = createElement(getPreset('button'), 1, 9);
  const on = els => updateElement(els, screen.id, { auto: { gap: 1, pad: 1 } });

  it('stacks the parts of a screen with gap and padding, and hugs them', () => {
    const before = [screen, a, b, c], after = autoLayout(before, on(before));
    const at = id => after.find(el => el.id === id);
    expect([at(a.id).col, at(a.id).row]).toEqual([2, 2]);
    expect(at(b.id).row).toBe(2 + a.height + 1);
    expect(at(c.id).row).toBe(at(b.id).row + b.height + 1);
    expect(at(screen.id).height).toBe(at(c.id).row + c.height + 1 + 1);
    expect(autoLayout(after, after)).toBe(after); // nothing to move, same list back
  });

  it('pushes the rest down when a part grows, and pulls up when one goes', () => {
    const laid = autoLayout([screen, a, b, c], on([screen, a, b, c]));
    const grown = updateElement(laid, a.id, { text: '• one\n• two\n• three\n• four\n• five\n• six' });
    const out = autoLayout(laid, grown), was = laid.find(el => el.id === b.id).row;
    expect(out.find(el => el.id === b.id).row).toBe(was + 3);
    const gone = autoLayout(laid, deleteElement(laid, b.id));
    expect(gone.find(el => el.id === c.id).row).toBe(was);
  });

  it('reorders when a part is dragged, lets go of one dragged out, leaves other screens alone', () => {
    const laid = autoLayout([screen, a, b, c], on([screen, a, b, c]));
    const dragged = moveElement(laid, c.id, 2, 1);
    const out = autoLayout(laid, dragged);
    expect(out.find(el => el.id === c.id).row).toBe(2);
    expect(out.find(el => el.id === a.id).row).toBeGreaterThan(2);
    const outside = autoLayout(laid, moveElement(laid, c.id, 60, 2));
    expect(outside.find(el => el.id === c.id).col).toBe(60);
    const plain = [screen, a, b, c];
    expect(autoLayout(plain, plain)).toBe(plain);
  });

  it('keeps auto in the project file, cleaned, and edit_project turns it on and off', () => {
    expect(cleanAuto({ gap: 99, pad: 2 })).toEqual({ gap: 1, pad: 2 });
    expect(cleanAuto('x')).toBeNull();
    const saved = parseProject(serializeProject({ cols: 80, rows: 40, elements: on([screen, a]) }));
    expect(saved.elements[0].auto).toEqual({ gap: 1, pad: 1 });
    expect(parseProject(JSON.stringify({ elements: [{ ...a, auto: { gap: 1, pad: 1 } }] })).elements[0].auto).toBeUndefined();
    const project = JSON.parse(serializeProject({ cols: 80, rows: 40, elements: [screen, a, b, c] }));
    const out = callTool('edit_project', { project, ops: [{ op: 'auto', index: 0, gap: 2, pad: 1 }] });
    expect(out.project.elements[0].auto).toEqual({ gap: 2, pad: 1 });
    expect(out.project.elements[2].row).toBe(2 + a.height + 2);
    expect(callTool('edit_project', { project: out.project, ops: [{ op: 'auto', index: 0, off: true }] }).project.elements[0].auto).toBeUndefined();
  });
});

describe('constraints', () => {
  const base = createElement(SCREEN_TOOL, 0, 0), screen = updateElement([base], base.id, { width: 40, height: 20 })[0];
  const btn = (col, row, pin) => ({ ...createElement(getPreset('button'), col, row), ...(pin && { pin }) });
  const free = btn(2, 2), right = btn(30, 2, { x: 'right' }), bottom = btn(2, 15, { y: 'bottom' }), center = btn(17, 8, { x: 'center', y: 'center' });
  const bar = { ...createElement(getPreset('divider') ?? getPreset('input'), 2, 10), pin: { x: 'both' } };
  const els = [screen, free, right, bottom, center, bar];
  const resized = (w, h) => constrain(els, updateElement(els, screen.id, { width: w, height: h }));
  const at = (list, id) => list.find(el => el.id === id);

  it('moves and stretches pinned parts when the screen is resized', () => {
    const out = resized(50, 26);
    expect([at(out, free.id).col, at(out, free.id).row]).toEqual([2, 2]);
    expect(at(out, right.id).col).toBe(40);
    expect(at(out, bottom.id).row).toBe(21);
    expect([at(out, center.id).col, at(out, center.id).row]).toEqual([22, 11]);
    expect(at(out, bar.id).width).toBe(bar.width + 10);
  });

  it('does nothing when the screen only moves or nothing is pinned', () => {
    const moved = moveElement(els, screen.id, 5, 5);
    expect(constrain(els, moved)).toBe(moved);
    const plain = [screen, free];
    const big = updateElement(plain, screen.id, { width: 60, height: 20 });
    expect(constrain(plain, big)).toBe(big);
  });

  it('cleans pins, keeps them in the file, and edit_project pins a part', () => {
    expect(cleanPin({ x: 'left', y: 'top' })).toBeNull();
    expect(cleanPin({ x: 'right', y: 'nope' })).toEqual({ x: 'right' });
    expect(parseProject(serializeProject({ cols: 80, rows: 40, elements: els })).elements[2].pin).toEqual({ x: 'right' });
    const project = JSON.parse(serializeProject({ cols: 80, rows: 40, elements: [screen, free] }));
    const out = callTool('edit_project', { project, ops: [{ op: 'pin', index: 1, x: 'right' }, { op: 'resize', index: 0, width: 50, height: 20 }] });
    expect(out.project.elements[1].pin).toEqual({ x: 'right' });
    expect(out.project.elements[1].col).toBe(12);
  });
});

describe('sizes', () => {
  const base = createElement(SCREEN_TOOL, 0, 0), screen = { ...updateElement([base], base.id, { width: 40, height: 20 })[0], text: 'Sign in' };
  const title = createElement(getPreset('button'), 2, 2), field = { ...createElement(getPreset('input'), 2, 6), pin: { x: 'both' } };
  const els = [screen, title, field];

  it('makes tablet and desktop copies to the right, resized with pins, all twinned', () => {
    const { elements: out, ids } = makeSizes(els, screen.id);
    const byCol = list => [...list].sort((a, b) => a.col - b.col);
    const shots = byCol(out.filter(el => el.presetId === 'screen'));
    expect(shots.map(s => [s.size, s.width])).toEqual([['Phone', 40], ['Tablet', 64], ['Desktop', 100]]);
    expect(ids).toHaveLength(2);
    const fields = byCol(out.filter(el => el.presetId === 'input'));
    expect(fields.map(f => f.width)).toEqual([field.width, field.width + 24, field.width + 60]);
    expect(new Set(fields.map(f => f.twin)).size).toBe(1);
    expect(fields[1].col).toBe(screen.col + 44 + 2);
    expect(makeSizes(out, screen.id).elements).toBe(out); // a screen in a set is not sized again
  });

  it('keeps words, style and color in step, not position', () => {
    const { elements: out } = makeSizes(els, screen.id);
    const buttons = () => out.filter(el => el.presetId === 'button').sort((a, b) => a.col - b.col);
    const [phone] = buttons();
    let edited = updateElement(out, phone.id, { style: 'double' });
    edited = moveElement(edited, phone.id, 5, 3);
    const synced = syncTwins(out, edited).filter(el => el.presetId === 'button').sort((a, b) => (a.id === phone.id ? -1 : b.id === phone.id ? 1 : a.col - b.col));
    expect(synced.map(b => b.style)).toEqual(['double', 'double', 'double']);
    expect(synced[1].col).toBe(buttons()[1].col);
    const texted = syncTwins(out, updateElement(out, phone.id, { text: 'Go' })).filter(el => el.presetId === 'button');
    expect(texted.map(b => b.template.join(''))).toEqual(Array(3).fill(texted[0].template.join('')));
    expect(syncTwins(out, out)).toBe(out);
  });

  it('keeps sizes in the file and edit_project makes them', () => {
    const { elements: out } = makeSizes(els, screen.id);
    const open = parseProject(serializeProject({ cols: 300, rows: 40, elements: out }));
    expect(open.elements.filter(el => el.size).map(el => el.size).sort()).toEqual(['Desktop', 'Phone', 'Tablet']);
    expect(open.elements.filter(el => el.presetId === 'input').every(el => el.twin)).toBe(true);
    const project = JSON.parse(serializeProject({ cols: 300, rows: 40, elements: els }));
    const made = callTool('edit_project', { project, ops: [{ op: 'sizes', index: 0 }] });
    expect(made.project.elements.filter(el => el.presetId === 'screen')).toHaveLength(3);
  });
});
