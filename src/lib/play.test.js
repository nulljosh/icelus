import { describe, it, expect } from 'vitest';
import { createElement, updateElement, serializeProject } from './engine.js';
import { getPreset, SCREEN_TOOL } from './presets.js';
import { playScreens, startScreen, playView, spotAt, playPath, liveKind, liveStart, pressLive, typeLive, liveElement, TYPE_MAX } from './play.js';
import { realPart } from './real.js';
import { callTool } from './tools.js';

describe('play mode', () => {
  const screen = (col, row, name) => { const s = createElement(SCREEN_TOOL, col, row); return updateElement([s], s.id, { text: name, width: 30, height: 12 })[0]; };
  const login = screen(40, 0, 'Login'), home = screen(0, 20, 'Home'), hidden = { ...screen(80, 0, 'Old'), hidden: true };
  const button = (col, row, text, opens) => { const b = createElement(getPreset('button'), col, row); return { ...updateElement([b], b.id, { text })[0], opens }; };
  const btn = button(42, 4, 'Sign in', home.id), backBtn = button(2, 24, 'Log out', login.id);
  const plain = createElement(getPreset('button'), 42, 8);
  const els = [login, home, hidden, btn, backBtn, plain];

  it('orders screens and picks where to start', () => {
    expect(playScreens(els).map(s => s.text)).toEqual(['Login', 'Home']); // top first, hidden left out
    expect(startScreen(els).id).toBe(login.id);
    expect(startScreen(els, home.id).id).toBe(home.id);
    expect(startScreen(els, backBtn.id).id).toBe(home.id); // the screen holding the picked part
    expect(startScreen([btn])).toBeNull();
  });

  it('shows one screen at the top left with its hotspots', () => {
    const v = playView(els, login.id);
    expect(v.title).toBe('Login');
    expect([v.cols, v.rows]).toEqual([30, 12]);
    expect(v.elements[0]).toMatchObject({ col: 0, row: 0 });
    expect(v.elements.map(e => e.id)).toEqual([login.id, btn.id, plain.id]);
    expect(v.spots).toEqual([{ id: btn.id, col: 2, row: 4, width: btn.width, height: btn.height, to: home.id, label: 'Sign in' }]);
    expect(spotAt(v, 3, 4)?.to).toBe(home.id);
    expect(spotAt(v, 3, 8)).toBeNull(); // a button with no link
    expect(playView(els, hidden.id)).toBeNull();
    expect(playView(els, btn.id)).toBeNull();
  });

  it('a link to a hidden or deleted screen is not a hotspot', () => {
    const toHidden = [...els.slice(0, 3), { ...btn, opens: hidden.id }];
    expect(playView(toHidden, login.id).spots).toEqual([]);
  });

  it('plays a path and stops at a wrong press', () => {
    expect(playPath(els, login.id, [btn.id, backBtn.id]).path.map(v => v.title)).toEqual(['Login', 'Home', 'Login']);
    const bad = playPath(els, login.id, [backBtn.id]);
    expect(bad.error).toMatch(/press 0 is not a hotspot on Login/);
    expect(bad.path).toHaveLength(1);
    expect(playPath(els, btn.id, []).error).toMatch(/start/);
  });

  it('play_prototype walks a flow for an agent and refuses bad input', () => {
    const project = JSON.parse(serializeProject({ cols: 80, rows: 40, elements: els }));
    const out = callTool('play_prototype', { project, presses: [3, 4, 3] });
    expect(out.screens.map(s => s.screen)).toEqual(['Login', 'Home', 'Login', 'Home']);
    expect(out.screens[0].text).toContain('Sign in');
    expect(out.screens[1].index).toBe(1);
    expect(callTool('play_prototype', { project, presses: [4] })).toMatchObject({ screens: [{ screen: 'Login' }], stopped: 'press 0 is not a hotspot on Login' });
    expect(() => callTool('play_prototype', { project, start: 3 })).toThrow(/start/);
    expect(() => callTool('play_prototype', { project, presses: [99] })).toThrow(/presses\[0\]/);
    expect(() => callTool('play_prototype', { project, presses: Array(51).fill(3) })).toThrow(/50/);
    expect(() => callTool('play_prototype', { project: null })).toThrow(/project/);
  });
});

describe('live parts', () => {
  const s = createElement(SCREEN_TOOL, 0, 0), screen = updateElement([s], s.id, { text: 'Form', width: 50, height: 30 })[0];
  const at = (id, col, row) => createElement(getPreset(id), col, row);
  const box = at('checkbox', 2, 2), r1 = at('radio', 2, 4), r2 = { ...at('radio', 2, 5), template: ['( ) Other'] }, sw = at('toggle', 2, 7);
  const seg = at('segmented', 2, 9), tabs = at('tabs', 2, 11), rate = at('rating', 2, 17), slide = at('slider', 2, 19), field = at('input', 2, 21);
  const area = at('textarea', 20, 2), link = { ...at('checkbox', 2, 24), opens: screen.id };
  const els = [screen, box, r1, r2, sw, seg, tabs, rate, slide, field, area, link];
  const view = playView(els, screen.id);
  const draw = (st, el) => liveElement(view.elements.find(x => x.id === el.id), st);

  it('knows which parts are live and what they start as', () => {
    expect([box, r1, sw, seg, tabs, rate, slide, field, area].map(liveKind)).toEqual(['tick', 'pick', 'flip', 'choose', 'choose', 'rate', 'slide', 'type', 'type']);
    expect(liveKind(link)).toBeNull(); // a hotspot is pressed, not played
    expect(liveKind(screen)).toBeNull();
    expect([box, r1, r2, sw, seg, tabs, rate, slide, field].map(liveStart)).toEqual([true, true, false, false, 0, 0, 3, 6, '']);
  });

  it('ticks, picks one radio, flips and redraws in the characters', () => {
    let st = pressLive(view, {}, box.id, 1);
    expect(draw(st, box).template[0]).toBe('[ ] Label');
    expect(realPart(draw(st, box)).on).toBe(false);
    st = pressLive(view, st, r2.id, 0);
    expect([st[r1.id], st[r2.id]]).toEqual([false, true]);
    expect(draw(st, r1).template[0]).toBe('( ) Option');
    st = pressLive(view, st, sw.id, 3);
    expect(realPart(draw(st, sw)).on).toBe(true);
    expect([...draw(st, sw).template[0]]).toHaveLength([...sw.template[0]].length);
  });

  it('switches segments and tabs by where you press, and steps from the keyboard', () => {
    let st = pressLive(view, {}, seg.id, seg.width - 1);
    expect(realPart(draw(st, seg)).at).toBe(2);
    st = pressLive(view, st, seg.id, null);
    expect(st[seg.id]).toBe(0); // wraps
    st = pressLive(view, st, tabs.id, Math.floor(tabs.width / 2));
    expect(realPart(draw(st, tabs))).toMatchObject({ kind: 'tabs', at: 1, items: ['Tab1', 'Tab 2', 'Tab 3'] });
  });

  it('rates, slides and types', () => {
    let st = pressLive(view, {}, rate.id, 4);
    expect(draw(st, rate).template[0]).toBe('★★★★★');
    st = pressLive(view, st, rate.id, -9);
    expect(draw(st, rate).template[0]).toBe('★☆☆☆☆'); // never below one
    st = pressLive(view, st, slide.id, 99);
    expect([...draw(st, slide).template[0]].indexOf('●')).toBe([...slide.template[0]].length - 1);
    expect([...draw(st, slide).template[0]].filter(c => c === '●')).toHaveLength(1);
    st = typeLive(st, field.id, 'x'.repeat(9999));
    expect(st[field.id]).toHaveLength(TYPE_MAX);
    st = typeLive(st, area.id, 'Hello');
    expect(draw(st, area).template.slice(1, -1).every(l => /^│\s+│$/.test(l))).toBe(true); // drawn empty, typed over
    expect(draw({}, area)).toBe(view.elements.find(x => x.id === area.id)); // untouched until typed
  });

  it('never touches the project and ignores parts that are not live', () => {
    const st = pressLive(view, {}, box.id, 1);
    expect(view.elements.find(x => x.id === box.id).template[0]).toBe('[✓] Label');
    expect(pressLive(view, st, screen.id, 0)).toBe(st);
    expect(pressLive(view, st, 'nope', 0)).toBe(st);
  });
});
