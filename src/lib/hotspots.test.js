import { describe, it, expect } from 'vitest';
import { createElement, updateElement, serializeProject, parseProject, renderElements, gridToText, screensDocument, deleteElement, duplicateElement } from './engine.js';
import { getPreset, SCREEN_TOOL } from './presets.js';
import { canOpen, opensScreen, setOpens, flowLines } from './hotspots.js';
import { handoff } from './handoff.js';
import { callTool } from './tools.js';

describe('hotspots', () => {
  const screen = (col, name) => { const s = createElement(SCREEN_TOOL, col, 0); return updateElement([s], s.id, { text: name, width: 30, height: 12 })[0]; };
  const login = screen(0, 'Login'), home = screen(40, 'Home');
  const btn = { ...createElement(getPreset('button'), 2, 4), text: 'Sign in' };
  const els = [login, home, btn];
  const linked = updateElement(els, btn.id, { opens: home.id });

  it('points a part at a screen and takes it off', () => {
    expect(linked[2].opens).toBe(home.id);
    expect(opensScreen(linked, linked[2])).toBe(home);
    expect(updateElement(linked, btn.id, { opens: null })[2].opens).toBeUndefined();
    expect(setOpens(linked, btn.id, home.id)).toBe(linked); // no change, same list
  });

  it('refuses anything but a part and a screen', () => {
    expect(setOpens(els, btn.id, btn.id)).toBe(els); // a part is not a screen
    expect(setOpens(els, btn.id, 'nope')).toBe(els);
    expect(setOpens(els, login.id, home.id)).toBe(els); // screens do not open screens
    expect(canOpen(getPreset('button'))).toBe(true);
    expect(canOpen({ presetId: 'line' })).toBe(false);
    expect(canOpen(undefined)).toBe(false);
  });

  it('is never in the text, and drops a link to a deleted screen', () => {
    expect(gridToText(renderElements(linked, 80, 14))).toBe(gridToText(renderElements(els, 80, 14)));
    const gone = deleteElement(linked, home.id);
    expect(opensScreen(gone, gone.find(e => e.id === btn.id))).toBeNull();
    expect(parseProject(serializeProject({ cols: 80, rows: 14, elements: gone })).elements[1].opens).toBeUndefined();
  });

  it('saves, re-pointed at the fresh ids, and refuses a forged one', () => {
    const back = parseProject(serializeProject({ cols: 80, rows: 14, elements: linked })).elements;
    expect(back[2].opens).toBe(back[1].id);
    const forged = JSON.parse(serializeProject({ cols: 80, rows: 14, elements: linked }));
    forged.elements[2].opens = forged.elements[2].id; // pointing at itself
    forged.elements[0].opens = forged.elements[1].id; // a screen opening a screen
    const f = parseProject(JSON.stringify(forged)).elements;
    expect(f[2].opens).toBeUndefined();
    expect(f[0].opens).toBeUndefined();
  });

  it('shows in the flow of the screens document and the brief', () => {
    expect(flowLines(linked)).toEqual(['- Login → Home (Sign in)']);
    expect(flowLines(els)).toEqual([]);
    expect(screensDocument(linked, 80, 14)).toMatch(/## Flow\n\n- Login → Home \(Sign in\)\n/);
    expect(handoff(linked, 80, 14)).toContain('- Login → Home (Sign in)');
    const copy = duplicateElement(linked, btn.id, 80, 14);
    expect(copy.elements.at(-1).opens).toBe(home.id); // a copied button opens the same screen
    expect(flowLines(copy.elements)).toHaveLength(1); // one line for the same words
  });

  it('a heavy project stays quick', () => {
    const many = [login, home, ...Array.from({ length: 2000 }, (_, i) => ({ ...createElement(getPreset('button'), 2 + (i % 20), 1 + (i % 10)), opens: home.id }))];
    const t = performance.now();
    expect(flowLines(many).length).toBeGreaterThan(0);
    expect(performance.now() - t).toBeLessThan(500);
  });

  it('edit_project links, unlinks and refuses', () => {
    const project = JSON.parse(serializeProject({ cols: 80, rows: 14, elements: els }));
    const out = callTool('edit_project', { project, ops: [{ op: 'opens', index: 2, screen: 1 }] });
    expect(out.project.elements[2].opens).toBe(out.project.elements[1].id);
    const off = callTool('edit_project', { project: out.project, ops: [{ op: 'opens', index: 2, screen: null }] });
    expect(off.project.elements[2].opens).toBeUndefined();
    expect(() => callTool('edit_project', { project, ops: [{ op: 'opens', index: 2, screen: 2 }] })).toThrow(/screen/);
    expect(() => callTool('edit_project', { project, ops: [{ op: 'opens', index: 0, screen: 1 }] })).toThrow(/part/);
    expect(() => callTool('edit_project', { project, ops: [{ op: 'opens', index: 2, screen: 99 }] })).toThrow();
  });
});

describe('transitions (v56)', () => {
  const screen = (col, name) => { const s = createElement(SCREEN_TOOL, col, 0); return updateElement([s], s.id, { text: name, width: 30, height: 12 })[0]; };
  const login = screen(0, 'Login'), home = screen(40, 'Home');
  const btn = { ...createElement(getPreset('button'), 2, 4), text: 'Sign in' };
  const linked = updateElement([login, home, btn], btn.id, { opens: home.id });

  it('sets how a screen arrives and takes it off again', () => {
    const pushed = updateElement(linked, btn.id, { move: 'push' });
    expect(pushed[2].move).toBe('push');
    expect(updateElement(pushed, btn.id, { move: null })[2].move).toBeUndefined();
    expect(updateElement(pushed, btn.id, { move: 'push' })).toBe(pushed); // no change, same list
  });

  it('refuses an unknown move and a part that opens nothing', () => {
    expect(updateElement(linked, btn.id, { move: 'spin' })).toBe(linked);
    const bare = [login, home, btn];
    expect(updateElement(bare, btn.id, { move: 'fade' })).toBe(bare);
  });

  it('is never in the text, and goes when the link goes', () => {
    const sheet = updateElement(linked, btn.id, { move: 'sheet' });
    expect(gridToText(renderElements(sheet, 80, 14))).toBe(gridToText(renderElements(linked, 80, 14)));
    expect(updateElement(sheet, btn.id, { opens: null })[2].move).toBeUndefined();
    const gone = deleteElement(sheet, home.id);
    const back = parseProject(serializeProject({ cols: 80, rows: 14, elements: gone })).elements;
    expect(back.find(e => e.id === btn.id || e.presetId === 'button').move).toBeUndefined();
  });

  it('saves with the link and refuses a forged move', () => {
    const sheet = updateElement(linked, btn.id, { move: 'sheet' });
    expect(parseProject(serializeProject({ cols: 80, rows: 14, elements: sheet })).elements[2].move).toBe('sheet');
    const forged = JSON.parse(serializeProject({ cols: 80, rows: 14, elements: sheet }));
    forged.elements[2].move = 'spin';
    expect(parseProject(JSON.stringify(forged)).elements[2].move).toBeUndefined();
  });
});
