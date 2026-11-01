import { describe, it, expect } from 'vitest';
import { createElement, updateElement, serializeProject } from './engine.js';
import { getPreset, SCREEN_TOOL } from './presets.js';
import { partSpacing, inspectPart, partGap } from './inspect.js';
import { callTool } from './tools.js';

describe('inspect', () => {
  const s0 = createElement(SCREEN_TOOL, 0, 0), screen = updateElement([s0], s0.id, { width: 40, height: 20 })[0];
  const btn = createElement(getPreset('button'), 5, 4), input = createElement(getPreset('input'), 20, 4), below = createElement(getPreset('button'), 5, 10);
  const els = [screen, btn, input, below];

  it('measures the gap to the nearest part or screen edge on each side', () => {
    // button is 6 wide at col 5: screen inner edge at col 1, input at col 20, the other button 5 rows down
    expect(partSpacing(els, btn.id)).toEqual({ left: 4, right: 20 - 11, top: 3, bottom: 10 - 5 });
    expect(partSpacing(els, input.id).left).toBe(20 - 11);
    expect(partSpacing([btn], btn.id)).toEqual({ left: null, right: null, top: null, bottom: null }); // nothing around
    expect(partSpacing(els, 'nope')).toBeNull();
  });

  it('measures between any two parts', () => {
    expect(partGap(els, btn.id, input.id)).toEqual({ across: 20 - 11, down: 0 });
    expect(partGap(els, btn.id, below.id)).toEqual({ across: 0, down: 10 - 5 });
    expect(partGap(els, btn.id, btn.id)).toBeNull();
    expect(partGap(els, btn.id, 'nope')).toBeNull();
    const project = JSON.parse(serializeProject({ cols: 60, rows: 30, elements: els }));
    expect(callTool('inspect_part', { project, index: 1, to: 2 }).gap).toEqual({ across: 9, down: 0 });
    expect(() => callTool('inspect_part', { project, index: 1, to: 1 })).toThrow();
  });

  it('gives the code for one part', () => {
    const out = inspectPart(els, btn.id);
    expect([out.col, out.row, out.width, out.height]).toEqual([5, 4, 6, 1]);
    expect(out.react).toBe('<button type="button">{"OK"}</button>');
    expect(out.swiftui).toContain('Button {} label: { Text(verbatim: "OK") }');
    expect(inspectPart(els, screen.id).react).toContain('<section');
  });

  it('escapes words in the code', () => {
    const evil = updateElement([btn], btn.id, { text: '"}</button><script>' })[0];
    const react = inspectPart([evil], evil.id).react; // words stay inside a JS string literal, quote escaped
    expect(react.startsWith('<button type="button">{"\\"}')).toBe(true);
    expect(react.endsWith('"}</button>')).toBe(true);
    expect(inspectPart([evil], evil.id).swiftui).toContain('\\"');
  });

  it('inspect_part over the API', () => {
    const project = JSON.parse(serializeProject({ cols: 60, rows: 30, elements: els }));
    const out = callTool('inspect_part', { project, index: 1 });
    expect(out.spacing.left).toBe(4);
    expect(out.react).toContain('<button');
    expect(() => callTool('inspect_part', { project, index: 9 })).toThrow(/index/);
  });
});
