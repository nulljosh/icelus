import { describe, it, expect } from 'vitest';
import { createElement, updateElement, serializeProject } from './engine.js';
import { getPreset, SCREEN_TOOL } from './presets.js';
import { playScreens, startScreen, playView, spotAt, playPath } from './play.js';
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
